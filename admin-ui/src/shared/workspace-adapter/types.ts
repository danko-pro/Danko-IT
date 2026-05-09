import type {
  WorkspaceArea,
  WorkspaceCapabilityMap,
  WorkspaceComponentSchema,
  WorkspaceElementRole,
  WorkspaceElementType,
  WorkspaceLayoutConstraint,
  WorkspaceLayoutItem,
  WorkspaceManifest,
  WorkspaceRelationshipType,
  WorkspaceValidationReport,
} from "../workspace-contract";

export type WorkspaceAdapterBehaviorMode = "off" | "suggest" | "auto";

export type WorkspaceAdapterSnapshot = {
  id: string;
  title: string;
  description?: string;
  behaviorMode: WorkspaceAdapterBehaviorMode;
  manifest: WorkspaceManifest;
  validation: WorkspaceValidationReport;
  layoutItems: WorkspaceLayoutItem[];
  constraints: WorkspaceLayoutConstraint[];
  meta: {
    source: "host-manifest";
    registryIds: string[];
    componentCount: number;
    elementCount: number;
    valid: boolean;
  };
};

export type WorkspaceAdapterRejection = {
  rejected: true;
  code: "INVALID_WORKSPACE_CONTRACT";
  message: string;
  details?: unknown;
};

export type WorkspaceRuntimeMetrics = {
  columns: number;
  rows: number;
};

export type WorkspaceRuntimeComponent = {
  id: string;
  parentId?: string;
  type: WorkspaceComponentSchema["type"];
  title: string;
  area?: WorkspaceArea;
  dataKey?: string;
  capabilities: WorkspaceCapabilityMap;
  layoutParticipation: NonNullable<WorkspaceComponentSchema["layoutParticipation"]>;
};

export type WorkspaceRuntimeElement = {
  id: string;
  parentId: string;
  type: WorkspaceElementType;
  role: WorkspaceElementRole;
  dataKey?: string;
  critical?: boolean;
};

export type WorkspaceRuntimeRelationship = {
  sourceId: string;
  targetId: string;
  type: WorkspaceRelationshipType;
  note?: string;
};

export type WorkspaceRuntimeSnapshot = {
  workspaceId: string;
  activeRoute?: string;
  metrics: WorkspaceRuntimeMetrics;
  components: WorkspaceRuntimeComponent[];
  elements: WorkspaceRuntimeElement[];
  relationships: WorkspaceRuntimeRelationship[];
};

export type WorkspaceCompositionMode = "off" | "suggest" | "auto";

export type WorkspaceCompositionContentType =
  | "header"
  | "content"
  | "sidebar"
  | "control"
  | "warning"
  | "unknown";

export type WorkspaceCompositionItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: WorkspaceRuntimeComponent["type"];
  meta: {
    title: string;
    sourceType: WorkspaceRuntimeComponent["type"];
    dataKey?: string;
    capabilities: WorkspaceCapabilityMap;
    layoutParticipation: WorkspaceRuntimeComponent["layoutParticipation"];
    parentId?: string;
  };
};

export type WorkspaceCompositionContentSchema = {
  type: WorkspaceCompositionContentType;
  sourceType: WorkspaceRuntimeComponent["type"];
  title: string;
  dataKey?: string;
  capabilities: WorkspaceCapabilityMap;
  layoutParticipation: WorkspaceRuntimeComponent["layoutParticipation"];
  parentId?: string;
};

export type WorkspaceCompositionInput = {
  mode: WorkspaceCompositionMode;
  metrics: WorkspaceRuntimeMetrics;
  sourceMetrics: WorkspaceRuntimeMetrics;
  items: WorkspaceCompositionItem[];
  contentSchemas: Record<string, WorkspaceCompositionContentSchema>;
  dependencies: Record<string, string[]>;
};
