export type WorkspaceArea = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WorkspaceCapabilityMap = {
  movable: boolean;
  resizable: boolean;
  deletable: boolean;
  copyable: boolean;
  collapsible?: boolean;
};

export type WorkspaceComponentType =
  | "workspace"
  | "stage"
  | "panel"
  | "editor"
  | "list"
  | "table"
  | "toolbar"
  | "summary"
  | "form"
  | (string & {});

export type WorkspaceElementType =
  | "button"
  | "input"
  | "select"
  | "textarea"
  | "dropdown"
  | "confirm"
  | "chip"
  | "metric"
  | "status"
  | "list-item"
  | (string & {});

export type WorkspaceElementRole =
  | "primary-action"
  | "secondary-action"
  | "danger-action"
  | "submit-action"
  | "field"
  | "selector"
  | "navigation"
  | "summary"
  | "status"
  | (string & {});

export type WorkspaceRelationshipType =
  | "reads"
  | "writes"
  | "selects"
  | "controls"
  | "depends-on"
  | "summarizes"
  | (string & {});

export type WorkspaceRelationship = {
  type: WorkspaceRelationshipType;
  targetId: string;
  note?: string;
};

export type WorkspaceElementSchema = {
  id: string;
  type: WorkspaceElementType;
  role: WorkspaceElementRole;
  label: string;
  dataKey?: string;
  critical?: boolean;
  capabilities?: Partial<WorkspaceCapabilityMap>;
  children?: WorkspaceElementSchema[];
  relationships?: WorkspaceRelationship[];
};

export type WorkspaceComponentSchema = {
  id: string;
  parentId?: string;
  type: WorkspaceComponentType;
  title: string;
  description?: string;
  dataKey?: string;
  area?: WorkspaceArea;
  layoutParticipation?: "always" | "conditional" | "none";
  minArea?: Pick<WorkspaceArea, "w" | "h">;
  maxArea?: Pick<WorkspaceArea, "w" | "h">;
  priority?: number;
  capabilities: WorkspaceCapabilityMap;
  children?: WorkspaceElementSchema[];
  relationships?: WorkspaceRelationship[];
  source?: {
    feature: string;
    file?: string;
  };
};

export type WorkspaceRegistry = {
  id: string;
  title: string;
  description?: string;
  components: WorkspaceComponentSchema[];
};

export type WorkspaceManifest = {
  id: string;
  title: string;
  description?: string;
  registries: WorkspaceRegistry[];
};
