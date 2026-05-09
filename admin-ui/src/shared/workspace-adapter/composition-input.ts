import type {
  WorkspaceCompositionContentType,
  WorkspaceCompositionInput,
  WorkspaceCompositionMode,
  WorkspaceRuntimeComponent,
  WorkspaceRuntimeElement,
  WorkspaceRuntimeRelationship,
  WorkspaceRuntimeSnapshot,
} from "./types";

export type CreateWorkspaceCompositionInputOptions = {
  mode?: WorkspaceCompositionMode;
  contentTypeOverrides?: Record<string, WorkspaceCompositionContentType>;
};

function normalizeText(value: string | undefined) {
  return String(value ?? "").toLowerCase();
}

function mapWorkspaceTypeToCompositionType(
  component: WorkspaceRuntimeComponent,
  overrides: Record<string, WorkspaceCompositionContentType> = {},
): WorkspaceCompositionContentType {
  const override = overrides[component.id];
  if (override) {
    return override;
  }

  const identity = `${normalizeText(component.id)} ${normalizeText(component.title)}`;

  if (identity.includes("warning") || identity.includes("danger")) {
    return "warning";
  }

  if (identity.includes("header")) {
    return "header";
  }

  if (identity.includes("sidebar") || identity.includes("side-panel") || identity.includes("side panel")) {
    return "sidebar";
  }

  if (identity.includes("footer")) {
    return "control";
  }

  switch (component.type) {
    case "toolbar":
      return "control";
    case "stage":
    case "workspace":
    case "list":
    case "table":
    case "summary":
    case "panel":
      return "content";
    case "form":
    case "editor":
      return "control";
    default:
      return "unknown";
  }
}

function createComponentIndex(components: WorkspaceRuntimeComponent[]) {
  return new Map(components.map((component) => [component.id, component]));
}

function createElementParentIndex(elements: WorkspaceRuntimeElement[]) {
  return new Map(elements.map((element) => [element.id, element.parentId]));
}

function resolveComponentId(
  id: string,
  componentIds: Set<string>,
  elementParents: Map<string, string>,
): string | null {
  if (componentIds.has(id)) {
    return id;
  }

  const seen = new Set<string>();
  let parentId = elementParents.get(id);

  while (parentId && !seen.has(parentId)) {
    if (componentIds.has(parentId)) {
      return parentId;
    }
    seen.add(parentId);
    parentId = elementParents.get(parentId);
  }

  return null;
}

function runtimeRelationshipsToDependencies(
  relationships: WorkspaceRuntimeRelationship[],
  components: WorkspaceRuntimeComponent[],
  elements: WorkspaceRuntimeElement[],
) {
  const componentIds = new Set(components.map((component) => component.id));
  const elementParents = createElementParentIndex(elements);
  const dependencies: Record<string, Set<string>> = {};

  for (const relationship of relationships) {
    const sourceId = resolveComponentId(relationship.sourceId, componentIds, elementParents);
    const targetId = resolveComponentId(relationship.targetId, componentIds, elementParents);

    if (!sourceId || !targetId || sourceId === targetId) {
      continue;
    }

    dependencies[sourceId] ??= new Set<string>();
    dependencies[sourceId].add(targetId);
  }

  return Object.fromEntries(
    Object.entries(dependencies).map(([sourceId, targetIds]) => [sourceId, [...targetIds]]),
  );
}

export function createWorkspaceCompositionInput(
  snapshot: WorkspaceRuntimeSnapshot,
  options: CreateWorkspaceCompositionInputOptions = {},
): WorkspaceCompositionInput {
  const componentsWithArea = snapshot.components.filter((component) => component.area);
  const contentSchemas = Object.fromEntries(
    componentsWithArea.map((component) => [
      component.id,
      {
        type: mapWorkspaceTypeToCompositionType(component, options.contentTypeOverrides),
        sourceType: component.type,
        title: component.title,
        dataKey: component.dataKey,
        capabilities: component.capabilities,
        layoutParticipation: component.layoutParticipation,
        parentId: component.parentId,
      },
    ]),
  );

  return {
    mode: options.mode ?? "suggest",
    metrics: snapshot.metrics,
    sourceMetrics: snapshot.metrics,
    items: componentsWithArea.map((component) => ({
      id: component.id,
      x: component.area?.x ?? 0,
      y: component.area?.y ?? 0,
      w: component.area?.w ?? 0,
      h: component.area?.h ?? 0,
      type: component.type,
      meta: {
        title: component.title,
        sourceType: component.type,
        dataKey: component.dataKey,
        capabilities: component.capabilities,
        layoutParticipation: component.layoutParticipation,
        parentId: component.parentId,
      },
    })),
    contentSchemas,
    dependencies: runtimeRelationshipsToDependencies(
      snapshot.relationships,
      componentsWithArea,
      snapshot.elements,
    ),
  };
}
