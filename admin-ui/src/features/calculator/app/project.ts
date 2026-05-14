import type { Dispatch, SetStateAction } from "react";

import type { CalculatorProject, CalculatorProjectDetail } from "../model/types";
import type { CalculatorProjectUpdatePayload } from "../project/payload";
import type { CalculatorProjectCreatePayload } from "../screen/types";
import type { ScreenKey } from "../../../shared/types";
import { fetchJson } from "../../../shared/utils";

type CalculatorProjectActionsControllerOptions = {
  setScreen: Dispatch<SetStateAction<ScreenKey>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setCalculatorBusyKey: Dispatch<SetStateAction<string | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
  setCalculatorProjects: Dispatch<SetStateAction<CalculatorProject[]>>;
  setSelectedCalculatorProjectId: Dispatch<SetStateAction<number | null>>;
  setSelectedCalculatorRoomId: Dispatch<SetStateAction<number | null>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  openCreatePanel: () => void;
  loadCalculatorProjects: () => Promise<void>;
};

// Project-level mutations for the calculator.
// Handles creation and autosave updates without coupling the shell to room/finish/door specifics.
export function createAdminCalculatorProjectActionsController(props: CalculatorProjectActionsControllerOptions) {
  function syncProjectListEntry(updatedProject: CalculatorProjectDetail) {
    props.setCalculatorProjects((current) => [
      updatedProject.project,
      ...current.filter((project) => project.id !== updatedProject.project.id),
    ]);
  }

  async function handleCreateCalculatorProject(payload: CalculatorProjectCreatePayload) {
    try {
      props.setCalculatorBusyKey("calculator-project-create");
      const created = await fetchJson<CalculatorProjectDetail>("/api/calculator/projects", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          note: payload.note || null,
        }),
      });
      await props.loadCalculatorProjects();
      props.setSelectedCalculatorProjectId(created.project.id);
      props.setCalculatorProjectDetail(created);
      props.setSelectedCalculatorRoomId(created.rooms[0]?.id ?? null);
      props.setSuccessMessage(`Проект калькулятора "${created.project.name}" создан.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось создать проект калькулятора");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleQuickCreateCalculatorProject() {
    props.setScreen("calculator");
    props.openCreatePanel();
  }

  async function handleSaveCalculatorProject(
    projectId: number,
    payload: CalculatorProjectUpdatePayload,
    options?: { silent?: boolean },
  ) {
    const silent = options?.silent === true;

    try {
      if (!silent) {
        props.setCalculatorBusyKey(`calculator-project-save-${projectId}`);
      }

      const updated = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updated);
      syncProjectListEntry(updated);

      if (!silent) {
        props.setSuccessMessage(`Проект калькулятора "${updated.project.name}" сохранён.`);
      }

      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить проект калькулятора");
    } finally {
      if (!silent) {
        props.setCalculatorBusyKey(null);
      }
    }
  }

  return {
    handleCreateCalculatorProject,
    handleQuickCreateCalculatorProject,
    handleSaveCalculatorProject,
  };
}
