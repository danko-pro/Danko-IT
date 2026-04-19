/**
 * Локальный hook для синхронизации и мутаций договора проекта.
 * Он держит status banner для UI и изолирует contract-specific optimistic flow
 * от общего dashboard state orchestration.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "../../../shared/utils";
import { buildProjectContractPayload } from "../api/project-payloads";
import {
  deleteProjectContract,
  extractProjectContract,
  patchProjectContractMilestone,
  uploadProjectContract,
  upsertProjectContract,
} from "../api/project-client";
import { createEmptyProjectContract } from "../model/project-card.mock";
import type { ContractSyncState } from "../model/project-contract-sync";
import type { DashboardProjectCardData, ProjectCardContract } from "../model/project-model";
import type { UpdateSelectedProject } from "./project-local-state";
import {
  buildContractExtractingState,
  buildContractSyncErrorState,
  buildContractSyncInfoState,
  buildContractSyncSuccessState,
  buildContractUploadingState,
  getContractSyncErrorMessage,
  idleContractSyncState,
  isPersistedMilestoneId,
  markContractMilestoneCompleted,
  markContractStarted,
} from "./project-contract-sync-helpers";
import { mergeProjectContract } from "./project-state-merge";

type UseDashboardProjectContractSyncParams = {
  activeProject: DashboardProjectCardData | null;
  selectedProjectId: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  setProjects: Dispatch<SetStateAction<DashboardProjectCardData[]>>;
  updateSelectedProject: UpdateSelectedProject;
  loadProjectContract: (projectId: string) => Promise<void>;
};

export function useDashboardProjectContractSync(params: UseDashboardProjectContractSyncParams) {
  const [contractSyncState, setContractSyncState] = useState<ContractSyncState>(idleContractSyncState);

  useEffect(() => {
    setContractSyncState(idleContractSyncState);
  }, [params.selectedProjectId]);

  async function extractContractForProject(projectId: string, options?: { suppressUnavailable?: boolean }) {
    setContractSyncState(buildContractExtractingState("Проверяю договор нейросетью..."));

    try {
      const contract = await extractProjectContract(projectId);
      params.setProjects((current) => mergeProjectContract(current, projectId, contract));
      params.setError(null);
      setContractSyncState(buildContractSyncSuccessState("Договор проверен. Поля и вехи обновлены."));
    } catch (extractError) {
      if (options?.suppressUnavailable && extractError instanceof ApiError && extractError.status === 503) {
        setContractSyncState(buildContractSyncInfoState("Договор загружен. AI-проверка сейчас недоступна."));
        return;
      }

      const message = getContractSyncErrorMessage(
        extractError,
        "Не удалось проверить договор нейросетью",
      );
      setContractSyncState(buildContractSyncErrorState(message));
      params.setError(message);
    }
  }

  function completeContractMilestone(milestoneId: string) {
    const activeProject = params.activeProject;
    if (!activeProject) {
      return;
    }

    if (milestoneId === "synthetic:start-after-advance") {
      const startedAt = new Date().toISOString().slice(0, 10);
      const nextContract = markContractStarted(activeProject.contract, startedAt);

      params.updateSelectedProject((current) => ({
        ...current,
        contract: nextContract,
      }));

      void (async () => {
        try {
          const result = await upsertProjectContract(activeProject.id, buildProjectContractPayload(nextContract));
          params.setProjects((current) => mergeProjectContract(current, activeProject.id, result));
          params.setError(null);
        } catch (completeError) {
          params.setError(
            getContractSyncErrorMessage(completeError, "Не удалось зафиксировать старт работ"),
          );
          await params.loadProjectContract(activeProject.id);
        }
      })();
      return;
    }

    params.updateSelectedProject((current) => ({
      ...current,
      contract: markContractMilestoneCompleted(current.contract, milestoneId),
    }));

    if (!isPersistedMilestoneId(milestoneId)) {
      return;
    }

    void (async () => {
      try {
        const result = await patchProjectContractMilestone(activeProject.id, milestoneId, { status: "completed" });
        params.setProjects((current) => mergeProjectContract(current, activeProject.id, result));
        params.setError(null);
      } catch (completeError) {
        params.setError(
          getContractSyncErrorMessage(completeError, "Не удалось обновить веху договора"),
        );
        await params.loadProjectContract(activeProject.id);
      }
    })();
  }

  async function extractContract(options?: { suppressUnavailable?: boolean }) {
    const activeProject = params.activeProject;
    if (!activeProject) {
      return;
    }

    await extractContractForProject(activeProject.id, options);
  }

  async function uploadContract(file: File) {
    const activeProject = params.activeProject;
    if (!activeProject) {
      return;
    }

    const projectId = activeProject.id;
    setContractSyncState(buildContractUploadingState("Загружаю договор..."));

    try {
      const uploadedContract = await uploadProjectContract(projectId, file);
      params.setProjects((current) => mergeProjectContract(current, projectId, uploadedContract));
      params.setError(null);
      setContractSyncState(buildContractExtractingState("Договор загружен. Проверяю нейросетью..."));
      await extractContractForProject(projectId, { suppressUnavailable: true });
    } catch (uploadError) {
      const message = getContractSyncErrorMessage(uploadError, "Не удалось загрузить договор");
      params.setError(message);
      setContractSyncState(buildContractSyncErrorState(message));
    }
  }

  async function updateContract(nextContract: ProjectCardContract) {
    const activeProject = params.activeProject;
    if (!activeProject) {
      return;
    }

    const projectId = activeProject.id;

    params.updateSelectedProject((current) => ({
      ...current,
      contract: nextContract,
    }));

    setContractSyncState(buildContractSyncInfoState("Сохраняю договор..."));

    try {
      const result = await upsertProjectContract(projectId, buildProjectContractPayload(nextContract));
      params.setProjects((current) => mergeProjectContract(current, projectId, result));
      params.setError(null);
      setContractSyncState(buildContractSyncSuccessState("Договор обновлён."));
    } catch (updateError) {
      const message = getContractSyncErrorMessage(updateError, "Не удалось обновить договор");
      params.setError(message);
      setContractSyncState(buildContractSyncErrorState(message));
      await params.loadProjectContract(projectId);
    }
  }

  async function deleteContract() {
    const activeProject = params.activeProject;
    if (!activeProject) {
      return;
    }

    const projectId = activeProject.id;
    setContractSyncState(buildContractSyncInfoState("Удаляю договор..."));

    try {
      await deleteProjectContract(projectId);
      params.setProjects((current) =>
        current.map((candidate) =>
          candidate.id === projectId
            ? {
                ...candidate,
                contract: createEmptyProjectContract(),
              }
            : candidate,
        ),
      );
      params.setError(null);
      setContractSyncState(buildContractSyncSuccessState("Договор удалён."));
    } catch (deleteError) {
      const message = getContractSyncErrorMessage(deleteError, "Не удалось удалить договор");
      params.setError(message);
      setContractSyncState(buildContractSyncErrorState(message));
      await params.loadProjectContract(projectId);
    }
  }

  return {
    contractSyncState,
    completeContractMilestone,
    extractContract,
    uploadContract,
    updateContract,
    deleteContract,
  };
}
