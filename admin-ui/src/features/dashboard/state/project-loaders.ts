/**
 * Загрузчики project-срезов вынесены отдельно, чтобы основной hook не хранил
 * одновременно React state orchestration и детали первичной/частичной загрузки.
 */
import type { Dispatch, SetStateAction } from "react";
import {
  getProjectContract,
  listProjectAdvances,
  listProjectLedger,
  listProjects,
} from "../api/project-client";
import type { DashboardProjectCardData } from "../model/project-model";
import {
  ensureDashboardProjectSeed,
  mergeLoadedProjectRecords,
  replaceProjectContractWithEmpty,
} from "./project-loader-helpers";
import {
  mergeProjectAdvances,
  mergeProjectContract,
  mergeProjectLedger,
} from "./project-state-merge";

type SetProjects = Dispatch<SetStateAction<DashboardProjectCardData[]>>;
type SetSelectedProjectId = Dispatch<SetStateAction<string | null>>;
type SetLoading = Dispatch<SetStateAction<boolean>>;
type SetError = Dispatch<SetStateAction<string | null>>;

type ProjectLoaderBaseParams = {
  setError: SetError;
  setProjects: SetProjects;
};

export async function loadDashboardProjects(params: {
  setLoading: SetLoading;
  setError: SetError;
  setProjects: SetProjects;
  setSelectedProjectId: SetSelectedProjectId;
}) {
  try {
    params.setLoading(true);
    params.setError(null);

    const seededProjects = await ensureDashboardProjectSeed(await listProjects());

    params.setProjects((current) =>
      mergeLoadedProjectRecords(current, seededProjects.records, seededProjects.usePrototypeSeed),
    );
    params.setSelectedProjectId((currentSelectedId) => {
      if (
        currentSelectedId &&
        seededProjects.records.some((record) => String(record.id) === currentSelectedId)
      ) {
        return currentSelectedId;
      }
      return seededProjects.records[0] ? String(seededProjects.records[0].id) : null;
    });
  } catch (loadError) {
    params.setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить объекты");
    params.setProjects([]);
    params.setSelectedProjectId(null);
  } finally {
    params.setLoading(false);
  }
}

export async function loadDashboardProjectAdvances(
  projectId: string,
  params: ProjectLoaderBaseParams,
) {
  try {
    const advances = await listProjectAdvances(projectId);
    params.setProjects((current) => mergeProjectAdvances(current, projectId, advances));
    params.setError(null);
  } catch (loadError) {
    params.setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить авансы объекта");
  }
}

export async function loadDashboardProjectLedger(
  projectId: string,
  params: ProjectLoaderBaseParams,
) {
  try {
    const entries = await listProjectLedger(projectId);
    params.setProjects((current) => mergeProjectLedger(current, projectId, entries));
    params.setError(null);
  } catch (loadError) {
    params.setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить таблицу учета объекта");
  }
}

export async function loadDashboardProjectContract(
  projectId: string,
  params: ProjectLoaderBaseParams,
) {
  try {
    const contract = await getProjectContract(projectId);
    params.setProjects((current) =>
      contract
        ? mergeProjectContract(current, projectId, contract)
        : replaceProjectContractWithEmpty(current, projectId),
    );
    params.setError(null);
  } catch (loadError) {
    params.setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить договор объекта");
  }
}
