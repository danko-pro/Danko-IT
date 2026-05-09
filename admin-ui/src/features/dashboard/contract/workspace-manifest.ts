import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../../../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../../../shared/workspace-adapter";
import { dashboardContractWorkspaceRegistry } from "./workspace-registry";

export const dashboardContractWorkspaceManifest = defineWorkspaceManifest({
  id: "dashboard.contract-workspace",
  title: "Dashboard contract workspace",
  description: "Host manifest for dashboard finance scene contract, advances and milestone controls.",
  registries: [dashboardContractWorkspaceRegistry],
});

export const dashboardContractWorkspaceLayoutItems =
  registryToLayoutItems(dashboardContractWorkspaceRegistry);
export const dashboardContractWorkspaceLayoutConstraints =
  registryToLayoutConstraints(dashboardContractWorkspaceRegistry);
export const dashboardContractWorkspaceValidationReport =
  validateWorkspaceManifest(dashboardContractWorkspaceManifest);
export const dashboardContractWorkspaceAdapterSnapshot =
  createWorkspaceAdapterSnapshot(dashboardContractWorkspaceManifest);
