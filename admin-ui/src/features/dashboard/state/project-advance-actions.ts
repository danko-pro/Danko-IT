/**
 * Операции по авансам вынесены отдельно, чтобы coordinator-hook не держал
 * в одном месте project CRUD, advances и ledger-specific сценарии.
 */
import type { Dispatch, SetStateAction } from "react";
import { buildProjectAdvancePayload } from "../api/project-payloads";
import { createProjectAdvance, deleteProjectAdvance } from "../api/project-client";
import type { DashboardProjectCardData } from "../model/project-model";
import {
  mergeProjectAdvanceCreateResult,
  mergeProjectAdvanceDeleteResult,
} from "./project-mutation-state-helpers";

type SetProjects = Dispatch<SetStateAction<DashboardProjectCardData[]>>;
type SetError = Dispatch<SetStateAction<string | null>>;

export type AdvancePayload = {
  title: string;
  amount: number;
  date: string;
};

export async function createDashboardProjectAdvance(params: {
  activeProject: DashboardProjectCardData | null;
  payload: AdvancePayload;
  setProjects: SetProjects;
  setError: SetError;
}) {
  if (!params.activeProject) {
    return;
  }

  try {
    const result = await createProjectAdvance(
      params.activeProject.id,
      buildProjectAdvancePayload({
        ...params.payload,
        status: "paid",
      }),
    );

    params.setProjects((current) =>
      mergeProjectAdvanceCreateResult(current, params.activeProject!.id, result),
    );
    params.setError(null);
  } catch (createError) {
    params.setError(createError instanceof Error ? createError.message : "Не удалось добавить аванс");
  }
}

export async function deleteDashboardProjectAdvance(params: {
  activeProject: DashboardProjectCardData | null;
  advanceId: string;
  setProjects: SetProjects;
  setError: SetError;
}) {
  if (!params.activeProject) {
    return;
  }

  try {
    const result = await deleteProjectAdvance(params.activeProject.id, params.advanceId);

    params.setProjects((current) =>
      mergeProjectAdvanceDeleteResult(current, params.activeProject!.id, params.advanceId, result.project),
    );
    params.setError(null);
  } catch (deleteError) {
    params.setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить аванс");
  }
}
