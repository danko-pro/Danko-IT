/**
 * Ledger-РѕРїРµСЂР°С†РёРё РІС‹РЅРµСЃРµРЅС‹ РѕС‚РґРµР»СЊРЅРѕ, С‡С‚РѕР±С‹ coordinator-hook РЅРµ СЃРјРµС€РёРІР°Р»
 * project loaders, contract sync Рё РґРµС‚Р°Р»СЊРЅСѓСЋ СЂР°Р±РѕС‚Сѓ СЃРѕ СЃС‚СЂРѕРєР°РјРё СѓС‡РµС‚Р° Рё РґРѕРєСѓРјРµРЅС‚Р°РјРё.
 */
import type { Dispatch, SetStateAction } from "react";
import { buildProjectLedgerPayload } from "../api/project-payloads";
import {
  createProjectLedgerEntry,
  deleteProjectLedgerEntry,
  uploadProjectLedgerDocument,
} from "../api/project-client";
import { createEmptyLedgerEntry } from "../model/project-accounting-logic";
import type {
  DashboardProjectCardData,
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
} from "../model/project-model";
import type { LedgerDocumentKind } from "./project-ledger-sync-helpers";
import {
  applyOptimisticLedgerDocumentUpload,
  canSyncLedgerDocumentPatch,
  mergeCreatedLedgerEntryState,
  mergeDeletedLedgerEntryState,
  mergePatchedLedgerEntryState,
  patchLedgerDocumentState,
} from "./project-ledger-state-helpers";
import type { UpdateSelectedProjectLedger } from "./project-local-state";

type SetProjects = Dispatch<SetStateAction<DashboardProjectCardData[]>>;
type SetError = Dispatch<SetStateAction<string | null>>;

export async function createDashboardProjectLedgerEntry(params: {
  activeProject: DashboardProjectCardData | null;
  updateSelectedProjectLedger: UpdateSelectedProjectLedger;
  setProjects: SetProjects;
  setError: SetError;
}) {
  if (!params.activeProject) {
    return;
  }

  const draftEntry = createEmptyLedgerEntry();
  params.updateSelectedProjectLedger((entries) => [...entries, draftEntry]);

  try {
    const result = await createProjectLedgerEntry(
      params.activeProject.id,
      buildProjectLedgerPayload(draftEntry),
    );
    params.setProjects((current) =>
      mergeCreatedLedgerEntryState(current, params.activeProject!.id, result, {
        optimisticEntryId: draftEntry.id,
      }),
    );
    params.setError(null);
  } catch (createError) {
    params.updateSelectedProjectLedger((entries) =>
      entries.filter((entry) => entry.id !== draftEntry.id),
    );
    params.setError(
      createError instanceof Error
        ? createError.message
        : "РќРµ СѓРґР°Р»РѕСЃСЊ РґРѕР±Р°РІРёС‚СЊ СЃС‚СЂРѕРєСѓ СѓС‡РµС‚Р°",
    );
  }
}

export async function deleteDashboardProjectLedgerEntry(params: {
  activeProject: DashboardProjectCardData | null;
  entryId: string;
  clearPendingLedgerSync: (projectId: string, entryId: string) => void;
  updateSelectedProjectLedger: UpdateSelectedProjectLedger;
  loadProjects: () => Promise<void>;
  setProjects: SetProjects;
  setError: SetError;
}) {
  if (!params.activeProject) {
    return;
  }

  params.clearPendingLedgerSync(params.activeProject.id, params.entryId);
  const projectId = params.activeProject.id;

  params.updateSelectedProjectLedger(
    (entries) => entries.filter((entry) => entry.id !== params.entryId),
    { recomputeExpenses: true },
  );

  try {
    const result = await deleteProjectLedgerEntry(projectId, params.entryId);
    params.setProjects((current) =>
      mergeDeletedLedgerEntryState(current, projectId, params.entryId, result.project),
    );
    params.setError(null);
  } catch (deleteError) {
    params.setError(
      deleteError instanceof Error
        ? deleteError.message
        : "РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ СЃС‚СЂРѕРєСѓ СѓС‡РµС‚Р°",
    );
    await params.loadProjects();
  }
}

export function patchDashboardProjectLedgerEntry(params: {
  activeProject: DashboardProjectCardData | null;
  entryId: string;
  patch: Partial<ProjectCardLedgerEntry>;
  updateSelectedProjectLedger: UpdateSelectedProjectLedger;
  scheduleLedgerEntrySync: (
    projectId: string,
    entryId: string,
    patch: Partial<ProjectCardLedgerEntry>,
  ) => void;
}) {
  if (!params.activeProject) {
    return;
  }

  params.updateSelectedProjectLedger(
    (entries) =>
      entries.map((entry) => (entry.id === params.entryId ? { ...entry, ...params.patch } : entry)),
    { recomputeExpenses: true },
  );
  params.scheduleLedgerEntrySync(params.activeProject.id, params.entryId, params.patch);
}

export function patchDashboardProjectLedgerDocument(params: {
  activeProject: DashboardProjectCardData | null;
  entryId: string;
  kind: LedgerDocumentKind;
  patch: Partial<ProjectCardLedgerDocument>;
  updateSelectedProjectLedger: UpdateSelectedProjectLedger;
  scheduleLedgerDocumentSync: (
    projectId: string,
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) => void;
}) {
  if (!params.activeProject) {
    return;
  }

  const canSyncWithBackend = canSyncLedgerDocumentPatch(
    params.activeProject,
    params.entryId,
    params.kind,
  );

  params.updateSelectedProjectLedger((entries) =>
    patchLedgerDocumentState(entries, params.entryId, params.kind, params.patch),
  );

  if (canSyncWithBackend) {
    params.scheduleLedgerDocumentSync(
      params.activeProject.id,
      params.entryId,
      params.kind,
      params.patch,
    );
  }
}

export async function uploadDashboardProjectLedgerDocument(params: {
  activeProject: DashboardProjectCardData | null;
  entryId: string;
  kind: LedgerDocumentKind;
  file: File;
  updateSelectedProjectLedger: UpdateSelectedProjectLedger;
  clearPendingLedgerDocumentSync: (
    projectId: string,
    entryId: string,
    kind: LedgerDocumentKind,
  ) => void;
  loadProjectLedger: (projectId: string) => Promise<void>;
  setProjects: SetProjects;
  setError: SetError;
}) {
  if (!params.activeProject) {
    return;
  }

  const projectId = params.activeProject.id;

  params.updateSelectedProjectLedger((entries) =>
    applyOptimisticLedgerDocumentUpload(entries, params.entryId, params.kind, params.file),
  );

  try {
    const result = await uploadProjectLedgerDocument(
      projectId,
      params.entryId,
      params.kind,
      params.file,
    );
    params.setProjects((current) =>
      mergePatchedLedgerEntryState(current, projectId, params.entryId, { entry: result.entry }),
    );
    params.clearPendingLedgerDocumentSync(projectId, params.entryId, params.kind);
    params.setError(null);
  } catch (uploadError) {
    params.setError(
      uploadError instanceof Error
        ? uploadError.message
        : "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґРѕРєСѓРјРµРЅС‚",
    );
    await params.loadProjectLedger(projectId);
  }
}
