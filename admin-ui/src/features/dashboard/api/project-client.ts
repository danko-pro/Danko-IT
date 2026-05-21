import type { buildProjectAdvancePayload, buildProjectContractPayload, buildProjectCreatePayload, buildProjectLedgerPayload } from "./project-payloads";
import type {
  DashboardProjectAdvanceApiRecord,
  DashboardProjectApiRecord,
  DashboardProjectContractApiRecord,
  DashboardProjectLedgerApiRecord,
  DashboardProjectLedgerDocumentApiRecord,
} from "../model/project-model";
import { fetchJson } from "../../../shared/utils";

type ProjectCreatePayload = ReturnType<typeof buildProjectCreatePayload>;
type ProjectAdvancePayload = ReturnType<typeof buildProjectAdvancePayload>;
type ProjectLedgerPayload = ReturnType<typeof buildProjectLedgerPayload>;
type ProjectContractPayload = ReturnType<typeof buildProjectContractPayload>;

export type ProjectAdvanceMutationResult = {
  advance: DashboardProjectAdvanceApiRecord;
  project: DashboardProjectApiRecord;
};

export type ProjectLedgerMutationResult = {
  entry: DashboardProjectLedgerApiRecord;
  project: DashboardProjectApiRecord;
};

export type ProjectDeleteAdvanceResult = {
  deleted: boolean;
  advance_id: number;
  project: DashboardProjectApiRecord;
};

export type ProjectDeleteLedgerEntryResult = {
  deleted: boolean;
  entry_id: number;
  project: DashboardProjectApiRecord;
};

export type ProjectLedgerDocumentMutationResult = {
  document: DashboardProjectLedgerDocumentApiRecord;
  entry: DashboardProjectLedgerApiRecord;
};

export type ProjectDeleteResult = {
  deleted: boolean;
  project_id: number;
};

type LedgerDocumentKind = "invoice" | "act";

// HTTP-клиент dashboard projects.
// Здесь сосредоточены endpoint'ы и формы запросов, чтобы hook не хранил raw URL и fetchJson.
export async function listProjects() {
  return fetchJson<DashboardProjectApiRecord[]>("/api/projects");
}

export async function getProjectDetail(projectId: string) {
  return fetchJson<DashboardProjectApiRecord>(`/api/projects/${projectId}`);
}

export async function createProject(payload: ProjectCreatePayload | Record<string, unknown>) {
  return fetchJson<DashboardProjectApiRecord>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(projectId: string, payload: Record<string, unknown>) {
  return fetchJson<DashboardProjectApiRecord>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProjectRequest(projectId: string) {
  return fetchJson<ProjectDeleteResult>(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function listProjectAdvances(projectId: string) {
  return fetchJson<DashboardProjectAdvanceApiRecord[]>(`/api/projects/${projectId}/advances`);
}

export async function createProjectAdvance(
  projectId: number | string,
  payload: ProjectAdvancePayload,
  options?: { syncTotals?: boolean },
) {
  const query = options?.syncTotals === false ? "?sync_totals=false" : "";
  return fetchJson<ProjectAdvanceMutationResult>(`/api/projects/${projectId}/advances${query}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteProjectAdvance(projectId: string, advanceId: string) {
  return fetchJson<ProjectDeleteAdvanceResult>(`/api/projects/${projectId}/advances/${advanceId}`, {
    method: "DELETE",
  });
}

export async function listProjectLedger(projectId: string) {
  return fetchJson<DashboardProjectLedgerApiRecord[]>(`/api/projects/${projectId}/ledger`);
}

export async function createProjectLedgerEntry(
  projectId: number | string,
  payload: ProjectLedgerPayload,
  options?: { syncSummary?: boolean },
) {
  const query = options?.syncSummary === false ? "?sync_summary=false" : "";
  return fetchJson<ProjectLedgerMutationResult>(`/api/projects/${projectId}/ledger${query}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchProjectLedgerEntry(projectId: string, entryId: string, payload: Record<string, unknown>) {
  return fetchJson<ProjectLedgerMutationResult>(`/api/projects/${projectId}/ledger/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProjectLedgerEntry(projectId: string, entryId: string) {
  return fetchJson<ProjectDeleteLedgerEntryResult>(`/api/projects/${projectId}/ledger/${entryId}`, {
    method: "DELETE",
  });
}

export async function patchProjectLedgerDocument(
  projectId: string,
  entryId: string,
  kind: LedgerDocumentKind,
  payload: Record<string, unknown>,
) {
  return fetchJson<ProjectLedgerDocumentMutationResult>(`/api/projects/${projectId}/ledger/${entryId}/documents/${kind}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadProjectLedgerDocument(
  projectId: string,
  entryId: string,
  kind: LedgerDocumentKind,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<ProjectLedgerDocumentMutationResult>(`/api/projects/${projectId}/ledger/${entryId}/documents/${kind}/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function getProjectContract(projectId: string) {
  return fetchJson<DashboardProjectContractApiRecord | null>(`/api/projects/${projectId}/contract`);
}

export async function upsertProjectContract(projectId: number | string, payload: ProjectContractPayload) {
  return fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${projectId}/contract`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function patchProjectContractMilestone(
  projectId: string,
  milestoneId: string,
  payload: Record<string, unknown>,
) {
  return fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${projectId}/contract/milestones/${milestoneId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function extractProjectContract(projectId: string) {
  return fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${projectId}/contract/extract`, {
    method: "POST",
  });
}

export async function uploadProjectContract(projectId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<DashboardProjectContractApiRecord>(`/api/projects/${projectId}/contract/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteProjectContract(projectId: string) {
  return fetchJson<ProjectDeleteResult>(`/api/projects/${projectId}/contract`, {
    method: "DELETE",
  });
}
