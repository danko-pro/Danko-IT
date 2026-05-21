/**
 * Локальный hook для отложенной синхронизации ledger-правок.
 * Он держит timers/queued patches и отправляет PATCH-запросы для:
 * - строк ledger;
 * - документов ledger.
 */
import { useEffect, useRef } from "react";
import { buildProjectLedgerPatchPayload } from "../api/project-payloads";
import { patchProjectLedgerDocument, patchProjectLedgerEntry } from "../api/project-client";
import type { DashboardProjectCardData } from "../model/project-model";
import {
  buildLedgerDocumentPatchPayload,
  buildLedgerDocumentSyncKey,
  buildLedgerEntrySyncKey,
  clearAllQueuedSyncs,
  clearQueuedSync,
  getLedgerSyncErrorMessage,
  queuePendingPatch,
  scheduleQueuedSync,
  type LedgerDocumentKind,
  type LedgerDocumentSyncPatch,
  type LedgerSyncPatch,
} from "./project-ledger-sync-helpers";
import { mergePatchedLedgerEntryState } from "./project-ledger-state-helpers";

export type { LedgerDocumentKind } from "./project-ledger-sync-helpers";

type UseDashboardProjectLedgerSyncParams = {
  loadProjectDetail: (projectId: string) => Promise<void>;
  loadProjectLedger: (projectId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setProjects: React.Dispatch<React.SetStateAction<DashboardProjectCardData[]>>;
};

export function useDashboardProjectLedgerSync(params: UseDashboardProjectLedgerSyncParams) {
  const ledgerSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ledgerPendingPatchesRef = useRef<Map<string, LedgerSyncPatch>>(new Map());
  const ledgerDocumentSyncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ledgerDocumentPendingPatchesRef = useRef<Map<string, LedgerDocumentSyncPatch>>(new Map());

  useEffect(() => {
    return () => {
      clearAllQueuedSyncs(ledgerSyncTimersRef.current, ledgerPendingPatchesRef.current);
      clearAllQueuedSyncs(ledgerDocumentSyncTimersRef.current, ledgerDocumentPendingPatchesRef.current);
    };
  }, []);

  function clearPendingLedgerSync(projectId: string, entryId: string) {
    clearQueuedSync(
      ledgerSyncTimersRef.current,
      ledgerPendingPatchesRef.current,
      buildLedgerEntrySyncKey(projectId, entryId),
    );
  }

  function clearPendingLedgerDocumentSync(projectId: string, entryId: string, kind: LedgerDocumentKind) {
    clearQueuedSync(
      ledgerDocumentSyncTimersRef.current,
      ledgerDocumentPendingPatchesRef.current,
      buildLedgerDocumentSyncKey(projectId, entryId, kind),
    );
  }

  async function flushLedgerEntrySync(projectId: string, entryId: string, syncKey: string) {
    const patch = ledgerPendingPatchesRef.current.get(syncKey);
    ledgerPendingPatchesRef.current.delete(syncKey);
    ledgerSyncTimersRef.current.delete(syncKey);

    if (!patch) {
      return;
    }

    const payload = buildProjectLedgerPatchPayload(patch);
    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      const result = await patchProjectLedgerEntry(projectId, entryId, payload);
      params.setProjects((current) =>
        mergePatchedLedgerEntryState(current, projectId, entryId, result),
      );
      params.setError(null);
      await params.loadProjectDetail(projectId);
    } catch (syncError) {
      params.setError(getLedgerSyncErrorMessage(syncError, "Не удалось сохранить строку учета"));
      await params.loadProjects();
    }
  }

  function scheduleLedgerEntrySync(projectId: string, entryId: string, patch: LedgerSyncPatch) {
    const syncKey = buildLedgerEntrySyncKey(projectId, entryId);
    queuePendingPatch(ledgerPendingPatchesRef.current, syncKey, patch);
    scheduleQueuedSync(ledgerSyncTimersRef.current, syncKey, () => {
      void flushLedgerEntrySync(projectId, entryId, syncKey);
    });
  }

  async function flushLedgerDocumentSync(
    projectId: string,
    entryId: string,
    kind: LedgerDocumentKind,
    syncKey: string,
  ) {
    const patch = ledgerDocumentPendingPatchesRef.current.get(syncKey);
    ledgerDocumentPendingPatchesRef.current.delete(syncKey);
    ledgerDocumentSyncTimersRef.current.delete(syncKey);

    if (!patch) {
      return;
    }

    try {
      const result = await patchProjectLedgerDocument(
        projectId,
        entryId,
        kind,
        buildLedgerDocumentPatchPayload(patch),
      );
      params.setProjects((current) =>
        mergePatchedLedgerEntryState(current, projectId, entryId, { entry: result.entry }),
      );
      params.setError(null);
    } catch (syncError) {
      params.setError(getLedgerSyncErrorMessage(syncError, "Не удалось сохранить документ"));
      await params.loadProjectLedger(projectId);
    }
  }

  function scheduleLedgerDocumentSync(
    projectId: string,
    entryId: string,
    kind: LedgerDocumentKind,
    patch: LedgerDocumentSyncPatch,
  ) {
    const syncKey = buildLedgerDocumentSyncKey(projectId, entryId, kind);
    queuePendingPatch(ledgerDocumentPendingPatchesRef.current, syncKey, patch);
    scheduleQueuedSync(ledgerDocumentSyncTimersRef.current, syncKey, () => {
      void flushLedgerDocumentSync(projectId, entryId, kind, syncKey);
    });
  }

  return {
    clearPendingLedgerDocumentSync,
    clearPendingLedgerSync,
    scheduleLedgerDocumentSync,
    scheduleLedgerEntrySync,
  };
}
