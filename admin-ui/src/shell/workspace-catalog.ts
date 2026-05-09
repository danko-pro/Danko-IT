import {
  createWorkspaceCompositionInput,
  createWorkspaceRuntimeSnapshot,
  type CreateWorkspaceCompositionInputOptions,
  type CreateWorkspaceRuntimeSnapshotOptions,
  type WorkspaceAdapterSnapshot,
  type WorkspaceCompositionInput,
  type WorkspaceRuntimeSnapshot,
} from "../shared/workspace-adapter";
import type { WorkspaceManifest } from "../shared/workspace-contract";
import {
  shellWorkspaceAdapterSnapshot,
  shellWorkspaceManifest,
} from "./workspace-manifest";
import {
  calculatorWorkspaceAdapterSnapshot,
  calculatorWorkspaceManifest,
} from "../features/calculator/app/workspace-manifest";
import {
  dashboardAccountingWorkspaceAdapterSnapshot,
  dashboardAccountingWorkspaceManifest,
} from "../features/dashboard/accounting/workspace-manifest";
import {
  dashboardContractWorkspaceAdapterSnapshot,
  dashboardContractWorkspaceManifest,
} from "../features/dashboard/contract/workspace-manifest";
import {
  dashboardPassportWorkspaceAdapterSnapshot,
  dashboardPassportWorkspaceManifest,
} from "../features/dashboard/passport/workspace-manifest";
import {
  materialsWorkspaceAdapterSnapshot,
  materialsWorkspaceManifest,
} from "../features/materials/workspace-manifest";
import {
  requestsWorkspaceAdapterSnapshot,
  requestsWorkspaceManifest,
} from "../features/requests/workspace-manifest";

export const appWorkspaceManifests: readonly WorkspaceManifest[] = [
  shellWorkspaceManifest,
  calculatorWorkspaceManifest,
  dashboardAccountingWorkspaceManifest,
  dashboardContractWorkspaceManifest,
  dashboardPassportWorkspaceManifest,
  requestsWorkspaceManifest,
  materialsWorkspaceManifest,
];

export const appWorkspaceAdapterSnapshots: readonly WorkspaceAdapterSnapshot[] = [
  shellWorkspaceAdapterSnapshot,
  calculatorWorkspaceAdapterSnapshot,
  dashboardAccountingWorkspaceAdapterSnapshot,
  dashboardContractWorkspaceAdapterSnapshot,
  dashboardPassportWorkspaceAdapterSnapshot,
  requestsWorkspaceAdapterSnapshot,
  materialsWorkspaceAdapterSnapshot,
];

export function getAppWorkspaceAdapterSnapshot(id: string): WorkspaceAdapterSnapshot | null {
  return appWorkspaceAdapterSnapshots.find((snapshot) => snapshot.id === id) ?? null;
}

export function getAppWorkspaceRuntimeSnapshot(
  id: string,
  options: CreateWorkspaceRuntimeSnapshotOptions = {},
): WorkspaceRuntimeSnapshot | null {
  const snapshot = getAppWorkspaceAdapterSnapshot(id);
  return snapshot ? createWorkspaceRuntimeSnapshot(snapshot, options) : null;
}

export function getAppWorkspaceCompositionInput(
  id: string,
  runtimeOptions: CreateWorkspaceRuntimeSnapshotOptions = {},
  compositionOptions: CreateWorkspaceCompositionInputOptions = {},
): WorkspaceCompositionInput | null {
  const runtimeSnapshot = getAppWorkspaceRuntimeSnapshot(id, runtimeOptions);
  return runtimeSnapshot ? createWorkspaceCompositionInput(runtimeSnapshot, compositionOptions) : null;
}
