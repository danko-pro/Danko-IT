import type { ProjectCardLedgerDocument, ProjectCardLedgerEntry } from "../model/project-model";

export type LedgerDocumentKind = "invoice" | "act";

export type LedgerSyncPatch = Partial<ProjectCardLedgerEntry>;
export type LedgerDocumentSyncPatch = Partial<ProjectCardLedgerDocument>;

export const LEDGER_SYNC_DELAY_MS = 350;

export function buildLedgerEntrySyncKey(projectId: string, entryId: string) {
  return `${projectId}:${entryId}`;
}

export function buildLedgerDocumentSyncKey(projectId: string, entryId: string, kind: LedgerDocumentKind) {
  return `${projectId}:${entryId}:${kind}`;
}

export function clearQueuedSync<Patch>(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  pendingPatches: Map<string, Patch>,
  syncKey: string,
) {
  const timerId = timers.get(syncKey);
  if (timerId) {
    clearTimeout(timerId);
    timers.delete(syncKey);
  }
  pendingPatches.delete(syncKey);
}

export function clearAllQueuedSyncs<Patch>(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  pendingPatches: Map<string, Patch>,
) {
  for (const timeoutId of timers.values()) {
    clearTimeout(timeoutId);
  }
  timers.clear();
  pendingPatches.clear();
}

export function queuePendingPatch<Patch extends object>(
  pendingPatches: Map<string, Patch>,
  syncKey: string,
  patch: Patch,
) {
  const queuedPatch = pendingPatches.get(syncKey) ?? ({} as Patch);
  pendingPatches.set(syncKey, {
    ...queuedPatch,
    ...patch,
  });
}

export function scheduleQueuedSync(
  timers: Map<string, ReturnType<typeof setTimeout>>,
  syncKey: string,
  flush: () => void,
) {
  const currentTimer = timers.get(syncKey);
  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  const timeoutId = setTimeout(flush, LEDGER_SYNC_DELAY_MS);
  timers.set(syncKey, timeoutId);
}

export function buildLedgerDocumentPatchPayload(patch: LedgerDocumentSyncPatch) {
  return {
    title: patch.title,
    date: patch.date,
    amount: patch.amount,
    extracted_by_ai: patch.extractedByAi,
    verified_by_user: patch.verifiedByUser,
  };
}

export function getLedgerSyncErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
