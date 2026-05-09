import type {
  WorkspaceArea,
  WorkspaceElementSchema,
  WorkspaceManifest,
  WorkspaceRegistry,
  WorkspaceRelationship,
} from "./types";

export type WorkspaceValidationSeverity = "error" | "warning";

export type WorkspaceValidationIssue = {
  severity: WorkspaceValidationSeverity;
  code:
    | "DUPLICATE_ID"
    | "INVALID_ID"
    | "INVALID_AREA"
    | "INVALID_MIN_AREA"
    | "INVALID_MAX_AREA"
    | "BROKEN_PARENT"
    | "BROKEN_RELATIONSHIP";
  id?: string;
  targetId?: string;
  message: string;
};

export type WorkspaceValidationReport = {
  valid: boolean;
  issues: WorkspaceValidationIssue[];
};

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function validateArea(area: WorkspaceArea | undefined, id: string, issues: WorkspaceValidationIssue[]) {
  if (!area) {
    return;
  }

  if (!isPositiveInteger(area.x) || !isPositiveInteger(area.y) || !isPositiveInteger(area.w) || !isPositiveInteger(area.h)) {
    issues.push({
      severity: "error",
      code: "INVALID_AREA",
      id,
      message: `Workspace component "${id}" has invalid grid area.`,
    });
  }
}

function collectElementIds(elements: WorkspaceElementSchema[] | undefined, targetIds: Set<string>, issues: WorkspaceValidationIssue[]) {
  for (const element of elements ?? []) {
    if (!element.id.trim()) {
      issues.push({
        severity: "error",
        code: "INVALID_ID",
        message: "Workspace element has empty id.",
      });
    } else if (targetIds.has(element.id)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_ID",
        id: element.id,
        message: `Workspace id "${element.id}" is duplicated.`,
      });
    } else {
      targetIds.add(element.id);
    }

    collectElementIds(element.children, targetIds, issues);
  }
}

function validateRelationships(
  ownerId: string,
  relationships: WorkspaceRelationship[] | undefined,
  targetIds: Set<string>,
  issues: WorkspaceValidationIssue[],
) {
  for (const relationship of relationships ?? []) {
    if (!targetIds.has(relationship.targetId)) {
      issues.push({
        severity: "warning",
        code: "BROKEN_RELATIONSHIP",
        id: ownerId,
        targetId: relationship.targetId,
        message: `Workspace relationship from "${ownerId}" points to missing "${relationship.targetId}".`,
      });
    }
  }
}

function validateParent(
  componentId: string,
  parentId: string | undefined,
  targetIds: Set<string>,
  issues: WorkspaceValidationIssue[],
) {
  if (!parentId || targetIds.has(parentId)) {
    return;
  }

  issues.push({
    severity: "warning",
    code: "BROKEN_PARENT",
    id: componentId,
    targetId: parentId,
    message: `Workspace component "${componentId}" points to missing parent "${parentId}".`,
  });
}

function validateElementRelationships(
  elements: WorkspaceElementSchema[] | undefined,
  targetIds: Set<string>,
  issues: WorkspaceValidationIssue[],
) {
  for (const element of elements ?? []) {
    validateRelationships(element.id, element.relationships, targetIds, issues);
    validateElementRelationships(element.children, targetIds, issues);
  }
}

export function validateWorkspaceRegistry(registry: WorkspaceRegistry): WorkspaceValidationReport {
  const issues: WorkspaceValidationIssue[] = [];
  const targetIds = new Set<string>();

  if (!registry.id.trim()) {
    issues.push({
      severity: "error",
      code: "INVALID_ID",
      message: "Workspace registry has empty id.",
    });
  }

  for (const component of registry.components) {
    if (!component.id.trim()) {
      issues.push({
        severity: "error",
        code: "INVALID_ID",
        message: "Workspace component has empty id.",
      });
    } else if (targetIds.has(component.id)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_ID",
        id: component.id,
        message: `Workspace id "${component.id}" is duplicated.`,
      });
    } else {
      targetIds.add(component.id);
    }

    validateArea(component.area, component.id, issues);

    if (component.minArea && (!isPositiveInteger(component.minArea.w) || !isPositiveInteger(component.minArea.h))) {
      issues.push({
        severity: "error",
        code: "INVALID_MIN_AREA",
        id: component.id,
        message: `Workspace component "${component.id}" has invalid minArea.`,
      });
    }

    if (component.maxArea && (!isPositiveInteger(component.maxArea.w) || !isPositiveInteger(component.maxArea.h))) {
      issues.push({
        severity: "error",
        code: "INVALID_MAX_AREA",
        id: component.id,
        message: `Workspace component "${component.id}" has invalid maxArea.`,
      });
    }

    collectElementIds(component.children, targetIds, issues);
  }

  for (const component of registry.components) {
    validateParent(component.id, component.parentId, targetIds, issues);
    validateRelationships(component.id, component.relationships, targetIds, issues);
    validateElementRelationships(component.children, targetIds, issues);
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function validateWorkspaceManifest(manifest: WorkspaceManifest): WorkspaceValidationReport {
  const issues: WorkspaceValidationIssue[] = [];
  const registryIds = new Set<string>();

  if (!manifest.id.trim()) {
    issues.push({
      severity: "error",
      code: "INVALID_ID",
      message: "Workspace manifest has empty id.",
    });
  }

  for (const registry of manifest.registries) {
    if (registryIds.has(registry.id)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_ID",
        id: registry.id,
        message: `Workspace registry id "${registry.id}" is duplicated.`,
      });
    } else {
      registryIds.add(registry.id);
    }

    issues.push(...validateWorkspaceRegistry(registry).issues);
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function assertWorkspaceValidationReport(report: WorkspaceValidationReport, label: string) {
  if (report.valid) {
    return;
  }

  const details = report.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => `${issue.code}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid workspace contract "${label}". ${details}`);
}
