import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../shared/workspace-adapter";
import { shellWorkspaceRegistry } from "./workspace-registry";

export const shellWorkspaceManifest = defineWorkspaceManifest({
  id: "shell-workspace",
  title: "Application shell workspace",
  description: "Host manifest for the engine-managed application shell: navigation, route outlet, header, footer and auth gate.",
  registries: [shellWorkspaceRegistry],
});

export const shellWorkspaceLayoutItems = registryToLayoutItems(shellWorkspaceRegistry);
export const shellWorkspaceLayoutConstraints = registryToLayoutConstraints(shellWorkspaceRegistry);
export const shellWorkspaceValidationReport = validateWorkspaceManifest(shellWorkspaceManifest);
export const shellWorkspaceAdapterSnapshot = createWorkspaceAdapterSnapshot(shellWorkspaceManifest);
