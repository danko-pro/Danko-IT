import {
  cloneDashboardProjectData,
  createDashboardProjectDraft,
  firstProjectCardMock,
} from "../model/project-card.mock";
import {
  ledgerEntrySignature,
  ledgerRecordSignature,
  mapLedgerRecord,
} from "../model/project-api-mappers";
import type {
  DashboardProjectCardData,
  DashboardProjectLedgerApiRecord,
  ProjectCardLedgerEntry,
} from "../model/project-model";

export type MergeProjectRecordOptions = {
  usePrototypeSeed: boolean;
  sequence: number;
};

export function resolveProjectRecordSeed(
  existingProject: DashboardProjectCardData | undefined,
  options: MergeProjectRecordOptions,
) {
  if (existingProject) {
    return cloneDashboardProjectData(existingProject);
  }

  return options.usePrototypeSeed
    ? cloneDashboardProjectData(firstProjectCardMock)
    : createDashboardProjectDraft(options.sequence);
}

export function reconcileProjectLedgerEntries(
  existingEntries: ProjectCardLedgerEntry[],
  records: DashboardProjectLedgerApiRecord[],
) {
  const existingEntriesById = new Map(existingEntries.map((entry) => [entry.id, entry]));
  const existingEntriesBySignature = new Map<string, ProjectCardLedgerEntry[]>();

  for (const entry of existingEntries) {
    const signature = ledgerEntrySignature(entry);
    const currentGroup = existingEntriesBySignature.get(signature) ?? [];
    currentGroup.push(entry);
    existingEntriesBySignature.set(signature, currentGroup);
  }

  return records.map((record) => {
    const existingById = existingEntriesById.get(String(record.id));
    if (existingById) {
      return mapLedgerRecord(record, existingById);
    }

    const signature = ledgerRecordSignature(record);
    const sameSignatureEntries = existingEntriesBySignature.get(signature) ?? [];
    const matchedEntry = sameSignatureEntries.shift();
    if (sameSignatureEntries.length > 0) {
      existingEntriesBySignature.set(signature, sameSignatureEntries);
    } else {
      existingEntriesBySignature.delete(signature);
    }

    return mapLedgerRecord(record, matchedEntry);
  });
}
