import type { WorkspaceManifest, WorkspaceRegistry } from "./types";

export function defineWorkspaceManifest<TManifest extends WorkspaceManifest>(manifest: TManifest): TManifest {
  return manifest;
}

export function flattenWorkspaceManifestRegistries(manifest: WorkspaceManifest): WorkspaceRegistry[] {
  return manifest.registries;
}
