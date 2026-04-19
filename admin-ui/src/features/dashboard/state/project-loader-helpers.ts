import {
  buildProjectAdvancePayload,
  buildProjectContractPayload,
  buildProjectCreatePayload,
  buildProjectLedgerPayload,
} from "../api/project-payloads";
import {
  createProject,
  createProjectAdvance,
  createProjectLedgerEntry,
  upsertProjectContract,
} from "../api/project-client";
import { createEmptyProjectContract, firstProjectCardMock } from "../model/project-card.mock";
import type {
  DashboardProjectApiRecord,
  DashboardProjectCardData,
} from "../model/project-model";
import { mergeProjectRecord } from "./project-state-merge";

export async function ensureDashboardProjectSeed(
  records: DashboardProjectApiRecord[],
) {
  if (records.length > 0) {
    return {
      records,
      usePrototypeSeed: false,
    };
  }

  const seededRecord = await createProject(buildProjectCreatePayload(firstProjectCardMock));
  await Promise.all([
    ...firstProjectCardMock.advances.map((advance) =>
      createProjectAdvance(seededRecord.id, buildProjectAdvancePayload(advance), {
        syncTotals: false,
      }),
    ),
    ...firstProjectCardMock.ledgerEntries.map((entry) =>
      createProjectLedgerEntry(seededRecord.id, buildProjectLedgerPayload(entry), {
        syncSummary: false,
      }),
    ),
    upsertProjectContract(seededRecord.id, buildProjectContractPayload(firstProjectCardMock.contract)),
  ]);

  return {
    records: [seededRecord],
    usePrototypeSeed: true,
  };
}

export function mergeLoadedProjectRecords(
  currentProjects: DashboardProjectCardData[],
  records: DashboardProjectApiRecord[],
  usePrototypeSeed: boolean,
) {
  return records.map((record, index) =>
    mergeProjectRecord(record, currentProjects.find((candidate) => candidate.id === String(record.id)), {
      usePrototypeSeed: usePrototypeSeed && index === 0,
      sequence: index + 1,
    }),
  );
}

export function replaceProjectContractWithEmpty(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
) {
  return currentProjects.map((candidate) =>
    candidate.id === projectId
      ? {
          ...candidate,
          contract: createEmptyProjectContract(),
        }
      : candidate,
  );
}
