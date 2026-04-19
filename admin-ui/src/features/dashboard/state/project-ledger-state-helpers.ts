import { applyLedgerEntriesToProject } from "../model/project-accounting-logic";
import { mapLedgerRecord } from "../model/project-api-mappers";
import type {
  DashboardProjectApiRecord,
  DashboardProjectCardData,
  DashboardProjectLedgerApiRecord,
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
} from "../model/project-model";
import type { LedgerDocumentKind } from "./project-ledger-sync-helpers";
import { mergeProjectRecord } from "./project-state-merge";

function mergeProjectSummaryWithLedgerEntries(
  candidate: DashboardProjectCardData,
  index: number,
  projectRecord: DashboardProjectApiRecord,
  nextEntries: ProjectCardLedgerEntry[],
) {
  const nextProject = mergeProjectRecord(projectRecord, candidate, {
    usePrototypeSeed: false,
    sequence: index + 1,
  });

  return applyLedgerEntriesToProject(nextProject, nextEntries);
}

export function mergeCreatedLedgerEntryState(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  result: {
    project: DashboardProjectApiRecord;
    entry: DashboardProjectLedgerApiRecord;
  },
) {
  return currentProjects.map((candidate, index) => {
    if (candidate.id !== projectId) {
      return candidate;
    }

    const nextEntries = [...candidate.ledgerEntries, mapLedgerRecord(result.entry)];
    return mergeProjectSummaryWithLedgerEntries(candidate, index, result.project, nextEntries);
  });
}

export function mergeDeletedLedgerEntryState(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  entryId: string,
  projectRecord: DashboardProjectApiRecord,
) {
  return currentProjects.map((candidate, index) => {
    if (candidate.id !== projectId) {
      return candidate;
    }

    const nextEntries = candidate.ledgerEntries.filter((entry) => entry.id !== entryId);
    return mergeProjectSummaryWithLedgerEntries(candidate, index, projectRecord, nextEntries);
  });
}

export function mergePatchedLedgerEntryState(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  entryId: string,
  result: {
    project?: DashboardProjectApiRecord;
    entry: DashboardProjectLedgerApiRecord;
  },
) {
  return currentProjects.map((candidate, index) => {
    if (candidate.id !== projectId) {
      return candidate;
    }

    const nextEntries = candidate.ledgerEntries.map((entry) =>
      entry.id === entryId ? mapLedgerRecord(result.entry, entry) : entry,
    );

    if (result.project) {
      return mergeProjectSummaryWithLedgerEntries(candidate, index, result.project, nextEntries);
    }

    return applyLedgerEntriesToProject(candidate, nextEntries);
  });
}

export function getLedgerDocumentKey(kind: LedgerDocumentKind) {
  return kind === "invoice" ? "invoiceDocument" : "actDocument";
}

export function canSyncLedgerDocumentPatch(
  project: DashboardProjectCardData,
  entryId: string,
  kind: LedgerDocumentKind,
) {
  const currentEntry = project.ledgerEntries.find((entry) => entry.id === entryId);
  const currentDocument = currentEntry?.[getLedgerDocumentKey(kind)];
  return Boolean(currentDocument && /^\d+$/.test(currentDocument.id));
}

export function patchLedgerDocumentState(
  entries: ProjectCardLedgerEntry[],
  entryId: string,
  kind: LedgerDocumentKind,
  patch: Partial<ProjectCardLedgerDocument>,
) {
  const key = getLedgerDocumentKey(kind);

  return entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    const document = entry[key];
    if (!document) {
      return entry;
    }

    return {
      ...entry,
      [key]: {
        ...document,
        ...patch,
      },
    };
  });
}

export function applyOptimisticLedgerDocumentUpload(
  entries: ProjectCardLedgerEntry[],
  entryId: string,
  kind: LedgerDocumentKind,
  file: File,
) {
  const key = getLedgerDocumentKey(kind);
  const uploadedAt = new Date().toISOString();

  return entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    const existingDocument = entry[key];
    const date = existingDocument?.date ?? uploadedAt.slice(0, 10);
    const amount =
      existingDocument?.amount ??
      (kind === "invoice" ? entry.planAmount : entry.actualAmount > 0 ? entry.actualAmount : entry.planAmount);

    return {
      ...entry,
      [key]: {
        id: existingDocument?.id ?? `${kind}-${entry.id}`,
        kind,
        title: existingDocument?.title ?? (kind === "invoice" ? "Счёт" : "Акт"),
        date,
        amount,
        sourceFile: {
          id: `source-${kind}-${entry.id}-${Date.now()}`,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          uploadedAt,
        },
        extractedByAi: existingDocument?.extractedByAi ?? false,
        verifiedByUser: existingDocument?.verifiedByUser ?? false,
      },
    };
  });
}
