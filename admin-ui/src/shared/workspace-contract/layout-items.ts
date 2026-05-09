import type { WorkspaceComponentSchema, WorkspaceRegistry } from "./types";

export type WorkspaceLayoutItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WorkspaceLayoutConstraint = {
  id: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  canMove?: boolean;
  canResize?: boolean;
  canDelete?: boolean;
};

export type WorkspaceLayoutProjectionOptions = {
  includeConditional?: boolean;
};

function canProjectComponent(
  component: WorkspaceComponentSchema,
  options?: WorkspaceLayoutProjectionOptions,
) {
  const participation = component.layoutParticipation ?? "always";

  if (participation === "none") {
    return false;
  }

  if (participation === "conditional" && !options?.includeConditional) {
    return false;
  }

  return true;
}

export function componentToLayoutItem(
  component: WorkspaceComponentSchema,
  options?: WorkspaceLayoutProjectionOptions,
): WorkspaceLayoutItem | null {
  if (!component.area) {
    return null;
  }

  if (!canProjectComponent(component, options)) {
    return null;
  }

  return {
    id: component.id,
    x: component.area.x,
    y: component.area.y,
    w: component.area.w,
    h: component.area.h,
  };
}

export function registryToLayoutItems(
  registry: WorkspaceRegistry,
  options?: WorkspaceLayoutProjectionOptions,
): WorkspaceLayoutItem[] {
  return registry.components.flatMap((component) => {
    const item = componentToLayoutItem(component, options);
    return item ? [item] : [];
  });
}

export function componentToLayoutConstraint(
  component: WorkspaceComponentSchema,
  options?: WorkspaceLayoutProjectionOptions,
): WorkspaceLayoutConstraint | null {
  if (!component.area || !canProjectComponent(component, options)) {
    return null;
  }

  return {
    id: component.id,
    minW: component.minArea?.w,
    minH: component.minArea?.h,
    maxW: component.maxArea?.w,
    maxH: component.maxArea?.h,
    canMove: component.capabilities.movable,
    canResize: component.capabilities.resizable,
    canDelete: component.capabilities.deletable,
  };
}

export function registryToLayoutConstraints(
  registry: WorkspaceRegistry,
  options?: WorkspaceLayoutProjectionOptions,
): WorkspaceLayoutConstraint[] {
  return registry.components.flatMap((component) => {
    const constraint = componentToLayoutConstraint(component, options);
    return constraint ? [constraint] : [];
  });
}
