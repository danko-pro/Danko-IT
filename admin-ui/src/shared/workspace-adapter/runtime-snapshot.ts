import type {
  WorkspaceComponentSchema,
  WorkspaceElementSchema,
  WorkspaceManifest,
  WorkspaceRegistry,
} from "../workspace-contract";
import type {
  WorkspaceAdapterSnapshot,
  WorkspaceRuntimeComponent,
  WorkspaceRuntimeElement,
  WorkspaceRuntimeMetrics,
  WorkspaceRuntimeRelationship,
  WorkspaceRuntimeSnapshot,
} from "./types";

export type CreateWorkspaceRuntimeSnapshotOptions = {
  activeRoute?: string;
  metrics?: WorkspaceRuntimeMetrics;
  registryIds?: string[];
  includeConditional?: boolean;
};

function shouldIncludeComponent(
  component: WorkspaceComponentSchema,
  options: CreateWorkspaceRuntimeSnapshotOptions,
) {
  const participation = component.layoutParticipation ?? "always";
  return participation !== "conditional" || Boolean(options.includeConditional);
}

function toRuntimeComponent(component: WorkspaceComponentSchema): WorkspaceRuntimeComponent {
  return {
    id: component.id,
    parentId: component.parentId,
    type: component.type,
    title: component.title,
    area: component.area,
    dataKey: component.dataKey,
    capabilities: component.capabilities,
    layoutParticipation: component.layoutParticipation ?? "always",
  };
}

function collectElements(
  elements: WorkspaceElementSchema[] | undefined,
  parentId: string,
  target: WorkspaceRuntimeElement[],
) {
  for (const element of elements ?? []) {
    target.push({
      id: element.id,
      parentId,
      type: element.type,
      role: element.role,
      dataKey: element.dataKey,
      critical: element.critical,
    });
    collectElements(element.children, element.id, target);
  }
}

function collectElementRelationships(
  elements: WorkspaceElementSchema[] | undefined,
  target: WorkspaceRuntimeRelationship[],
) {
  for (const element of elements ?? []) {
    for (const relationship of element.relationships ?? []) {
      target.push({
        sourceId: element.id,
        targetId: relationship.targetId,
        type: relationship.type,
        note: relationship.note,
      });
    }
    collectElementRelationships(element.children, target);
  }
}

function collectRelationships(
  component: WorkspaceComponentSchema,
  target: WorkspaceRuntimeRelationship[],
) {
  for (const relationship of component.relationships ?? []) {
    target.push({
      sourceId: component.id,
      targetId: relationship.targetId,
      type: relationship.type,
      note: relationship.note,
    });
  }
  collectElementRelationships(component.children, target);
}

function inferMetrics(components: WorkspaceRuntimeComponent[]): WorkspaceRuntimeMetrics {
  return components.reduce(
    (metrics, component) => {
      if (!component.area) {
        return metrics;
      }
      return {
        columns: Math.max(metrics.columns, component.area.x + component.area.w - 1),
        rows: Math.max(metrics.rows, component.area.y + component.area.h - 1),
      };
    },
    { columns: 0, rows: 0 },
  );
}

function filterRegistries(
  manifest: WorkspaceManifest,
  registryIds: string[] | undefined,
): WorkspaceRegistry[] {
  if (!registryIds?.length) {
    return manifest.registries;
  }
  const allowed = new Set(registryIds);
  return manifest.registries.filter((registry) => allowed.has(registry.id));
}

export function createWorkspaceRuntimeSnapshot(
  snapshot: WorkspaceAdapterSnapshot,
  options: CreateWorkspaceRuntimeSnapshotOptions = {},
): WorkspaceRuntimeSnapshot {
  const components: WorkspaceRuntimeComponent[] = [];
  const elements: WorkspaceRuntimeElement[] = [];
  const relationships: WorkspaceRuntimeRelationship[] = [];

  for (const registry of filterRegistries(snapshot.manifest, options.registryIds)) {
    for (const component of registry.components) {
      if (!shouldIncludeComponent(component, options)) {
        continue;
      }
      components.push(toRuntimeComponent(component));
      collectElements(component.children, component.id, elements);
      collectRelationships(component, relationships);
    }
  }

  return {
    workspaceId: snapshot.id,
    activeRoute: options.activeRoute,
    metrics: options.metrics ?? inferMetrics(components),
    components,
    elements,
    relationships,
  };
}
