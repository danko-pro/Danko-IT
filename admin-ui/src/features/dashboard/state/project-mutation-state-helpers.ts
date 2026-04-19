import type {
  DashboardProjectAdvanceApiRecord,
  DashboardProjectApiRecord,
  DashboardProjectCardData,
} from "../model/project-model";
import { mapAdvanceRecord } from "../model/project-api-mappers";
import { mergeProjectRecord } from "./project-state-merge";

export function appendCreatedProject(
  currentProjects: DashboardProjectCardData[],
  createdRecord: DashboardProjectApiRecord,
) {
  return [
    ...currentProjects,
    mergeProjectRecord(createdRecord, undefined, {
      usePrototypeSeed: false,
      sequence: currentProjects.length + 1,
    }),
  ];
}

export function mergeProjectAdvanceCreateResult(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  result: {
    project: DashboardProjectApiRecord;
    advance: DashboardProjectAdvanceApiRecord;
  },
) {
  return currentProjects.map((candidate, index) =>
    candidate.id === projectId
      ? {
          ...mergeProjectRecord(result.project, candidate, {
            usePrototypeSeed: false,
            sequence: index + 1,
          }),
          advances: [
            mapAdvanceRecord(result.advance),
            ...candidate.advances.filter((advance) => advance.id !== String(result.advance.id)),
          ],
        }
      : candidate,
  );
}

export function mergeProjectAdvanceDeleteResult(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  advanceId: string,
  projectRecord: DashboardProjectApiRecord,
) {
  return currentProjects.map((candidate, index) =>
    candidate.id === projectId
      ? {
          ...mergeProjectRecord(projectRecord, candidate, {
            usePrototypeSeed: false,
            sequence: index + 1,
          }),
          advances: candidate.advances.filter((advance) => advance.id !== advanceId),
        }
      : candidate,
  );
}

export function removeProjectFromState(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
) {
  return currentProjects.filter((candidate) => candidate.id !== projectId);
}

export function resolveNextSelectedProjectIdAfterDeletion(
  currentProjects: DashboardProjectCardData[],
  projectId: string,
  currentSelectedId: string | null,
) {
  if (currentSelectedId !== projectId) {
    return currentSelectedId;
  }

  const nextProjects = removeProjectFromState(currentProjects, projectId);
  const removedIndex = currentProjects.findIndex((candidate) => candidate.id === projectId);
  const nextSelectedProject = nextProjects[Math.max(0, removedIndex - 1)] ?? nextProjects[0] ?? null;
  return nextSelectedProject?.id ?? null;
}
