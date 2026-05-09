import type { WorkspaceComponentSchema, WorkspaceRegistry } from "./types";

export function defineWorkspaceComponent<TComponent extends WorkspaceComponentSchema>(
  component: TComponent,
): TComponent {
  return component;
}

export function defineWorkspaceRegistry<TRegistry extends WorkspaceRegistry>(registry: TRegistry): TRegistry {
  return registry;
}

export function getWorkspaceComponentById(
  registry: WorkspaceRegistry,
  componentId: string,
): WorkspaceComponentSchema | null {
  return registry.components.find((component) => component.id === componentId) ?? null;
}
