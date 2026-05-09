import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../../shared/workspace-adapter";
import { requestsWorkspaceRegistry } from "./workspace-registry";

export const requestsWorkspaceManifest = defineWorkspaceManifest({
  id: "requests-workspace",
  title: "Requests workspace",
  description: "Host manifest for logistics request overview, list, detail, delivery and item controls.",
  registries: [requestsWorkspaceRegistry],
});

export const requestsWorkspaceLayoutItems = registryToLayoutItems(requestsWorkspaceRegistry);
export const requestsWorkspaceLayoutConstraints = registryToLayoutConstraints(requestsWorkspaceRegistry);
export const requestsWorkspaceValidationReport = validateWorkspaceManifest(requestsWorkspaceManifest);
export const requestsWorkspaceAdapterSnapshot = createWorkspaceAdapterSnapshot(requestsWorkspaceManifest);
