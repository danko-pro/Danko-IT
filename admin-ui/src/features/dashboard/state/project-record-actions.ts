/**
 * Базовые CRUD-операции по карточкам проектов вынесены отдельно, чтобы
 * coordinator-hook не смешивал загрузку, React state и прямые project mutations.
 */
import type { Dispatch, SetStateAction } from "react";
import { buildProjectPassportPatchPayload } from "../api/project-payloads";
import { createProject, deleteProjectRequest, updateProject } from "../api/project-client";
import type { DashboardProjectCardData } from "../model/project-model";
import {
  appendCreatedProject,
  removeProjectFromState,
  resolveNextSelectedProjectIdAfterDeletion,
} from "./project-mutation-state-helpers";
import { mergeProjectSummary } from "./project-state-merge";

type SetProjects = Dispatch<SetStateAction<DashboardProjectCardData[]>>;
type SetSelectedProjectId = Dispatch<SetStateAction<string | null>>;
type SetError = Dispatch<SetStateAction<string | null>>;

export type ProjectPassportPatch = Pick<
  DashboardProjectCardData,
  | "name"
  | "address"
  | "apartment"
  | "floor"
  | "hasElevator"
  | "siteAccess"
  | "intercomCode"
  | "responsiblePerson"
  | "areaM2"
  | "plannedMarginPercent"
>;

export async function createDashboardProject(params: {
  setProjects: SetProjects;
  setSelectedProjectId: SetSelectedProjectId;
  setError: SetError;
}) {
  try {
    const createdRecord = await createProject({});
    params.setProjects((current) => appendCreatedProject(current, createdRecord));
    params.setSelectedProjectId(String(createdRecord.id));
    params.setError(null);
  } catch (createError) {
    params.setError(createError instanceof Error ? createError.message : "Не удалось создать объект");
  }
}

export async function renameDashboardProject(params: {
  projectId: string;
  nextCode: string;
  setProjects: SetProjects;
  setError: SetError;
}) {
  const normalizedCode = params.nextCode.trim();
  if (!normalizedCode) {
    return;
  }

  try {
    const updatedRecord = await updateProject(params.projectId, { code: normalizedCode });
    params.setProjects((current) => mergeProjectSummary(current, params.projectId, updatedRecord));
    params.setError(null);
  } catch (renameError) {
    params.setError(renameError instanceof Error ? renameError.message : "Не удалось переименовать объект");
  }
}

export async function updateDashboardProjectPassport(params: {
  projectId: string;
  passport: ProjectPassportPatch;
  setProjects: SetProjects;
  setError: SetError;
}) {
  try {
    const updatedRecord = await updateProject(
      params.projectId,
      buildProjectPassportPatchPayload(params.passport),
    );
    params.setProjects((current) => mergeProjectSummary(current, params.projectId, updatedRecord));
    params.setError(null);
  } catch (updateError) {
    params.setError(updateError instanceof Error ? updateError.message : "Не удалось сохранить паспорт объекта");
    throw updateError;
  }
}

export async function deleteDashboardProject(params: {
  projectId: string;
  setProjects: SetProjects;
  setSelectedProjectId: SetSelectedProjectId;
  setError: SetError;
}) {
  try {
    await deleteProjectRequest(params.projectId);
    params.setProjects((current) => {
      params.setSelectedProjectId((currentSelectedId) => {
        return resolveNextSelectedProjectIdAfterDeletion(current, params.projectId, currentSelectedId);
      });
      return removeProjectFromState(current, params.projectId);
    });
    params.setError(null);
  } catch (deleteError) {
    params.setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить объект");
  }
}
