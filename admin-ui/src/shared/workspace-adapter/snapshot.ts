import {
  assertWorkspaceValidationReport,
  registryToLayoutConstraints,
  registryToLayoutItems,
  validateWorkspaceManifest,
} from "../workspace-contract";
import type {
  WorkspaceElementSchema,
  WorkspaceManifest,
  WorkspaceRegistry,
} from "../workspace-contract";
import type { WorkspaceAdapterBehaviorMode, WorkspaceAdapterSnapshot } from "./types";

export type CreateWorkspaceAdapterSnapshotOptions = {
  behaviorMode?: WorkspaceAdapterBehaviorMode;
  includeConditionalLayout?: boolean;
  assertValid?: boolean;
};

function countElements(elements: WorkspaceElementSchema[] | undefined): number {
  return (elements ?? []).reduce(
    (total, element) => total + 1 + countElements(element.children),
    0,
  );
}

function countRegistryElements(registry: WorkspaceRegistry): number {
  return registry.components.reduce(
    (total, component) => total + countElements(component.children),
    0,
  );
}

export function createWorkspaceAdapterSnapshot(
  manifest: WorkspaceManifest,
  options: CreateWorkspaceAdapterSnapshotOptions = {},
): WorkspaceAdapterSnapshot {
  const validation = validateWorkspaceManifest(manifest);
  const shouldAssert = options.assertValid ?? true;
  const projectionOptions = {
    includeConditional: options.includeConditionalLayout,
  };

  if (shouldAssert) {
    assertWorkspaceValidationReport(validation, manifest.id);
  }

  return {
    id: manifest.id,
    title: manifest.title,
    description: manifest.description,
    behaviorMode: options.behaviorMode ?? "off",
    manifest,
    validation,
    layoutItems: manifest.registries.flatMap((registry) =>
      registryToLayoutItems(registry, projectionOptions),
    ),
    constraints: manifest.registries.flatMap((registry) =>
      registryToLayoutConstraints(registry, projectionOptions),
    ),
    meta: {
      source: "host-manifest",
      registryIds: manifest.registries.map((registry) => registry.id),
      componentCount: manifest.registries.reduce(
        (total, registry) => total + registry.components.length,
        0,
      ),
      elementCount: manifest.registries.reduce(
        (total, registry) => total + countRegistryElements(registry),
        0,
      ),
      valid: validation.valid,
    },
  };
}
