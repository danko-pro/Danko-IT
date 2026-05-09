import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../../../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../../../shared/workspace-adapter";
import { dashboardPassportWorkspaceRegistry } from "./workspace-registry";

export const dashboardPassportWorkspaceManifest = defineWorkspaceManifest({
  id: "dashboard.passport-workspace",
  title: "Dashboard passport workspace",
  description: "Host manifest for dashboard passport identity, access, metrics and save controls.",
  registries: [dashboardPassportWorkspaceRegistry],
});

export const dashboardPassportWorkspaceLayoutItems =
  registryToLayoutItems(dashboardPassportWorkspaceRegistry);
export const dashboardPassportWorkspaceLayoutConstraints =
  registryToLayoutConstraints(dashboardPassportWorkspaceRegistry);
export const dashboardPassportWorkspaceValidationReport =
  validateWorkspaceManifest(dashboardPassportWorkspaceManifest);
export const dashboardPassportWorkspaceAdapterSnapshot =
  createWorkspaceAdapterSnapshot(dashboardPassportWorkspaceManifest);
