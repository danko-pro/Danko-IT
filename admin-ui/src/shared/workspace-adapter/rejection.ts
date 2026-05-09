import type { WorkspaceAdapterRejection, WorkspaceAdapterSnapshot } from "./types";

export function createInvalidWorkspaceContractRejection(
  snapshot: WorkspaceAdapterSnapshot,
): WorkspaceAdapterRejection | null {
  if (snapshot.validation.valid) {
    return null;
  }

  return {
    rejected: true,
    code: "INVALID_WORKSPACE_CONTRACT",
    message: `Workspace contract "${snapshot.id}" is invalid.`,
    details: snapshot.validation.issues,
  };
}
