import {
  defineWorkspaceManifest,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../../shared/workspace-contract";
import { createWorkspaceAdapterSnapshot } from "../../shared/workspace-adapter";
import { materialsWorkspaceRegistry } from "./workspace-registry";

export const materialsWorkspaceManifest = defineWorkspaceManifest({
  id: "materials-workspace",
  title: "Materials workspace",
  description: "Host manifest for material families, variants, SKUs, aliases and catalog search controls.",
  registries: [materialsWorkspaceRegistry],
});

export const materialsWorkspaceLayoutItems = registryToLayoutItems(materialsWorkspaceRegistry);
export const materialsWorkspaceLayoutConstraints = registryToLayoutConstraints(materialsWorkspaceRegistry);
export const materialsWorkspaceValidationReport = validateWorkspaceManifest(materialsWorkspaceManifest);
export const materialsWorkspaceAdapterSnapshot = createWorkspaceAdapterSnapshot(materialsWorkspaceManifest);
