import type { Dispatch, SetStateAction } from "react";
import {
  type CalculatorFlooringCoveringPayload,
  type CalculatorFlooringLayoutPayload,
  type CalculatorFlooringPayload,
  type CalculatorFlooringPreparationPayload,
  type CalculatorProjectDetail,
  type CalculatorWallFinishCoveringPayload,
  type CalculatorWallFinishLayoutPayload,
  type CalculatorWallFinishPayload,
  type CalculatorWallFinishPreparationPayload,
  type CalculatorWarmFloorPayload,
} from "../model/types";
import { fetchJson } from "../../../shared/utils";

type CalculatorFinishesControllerOptions = {
  selectedCalculatorProjectId: number | null;
  selectedCalculatorRoomId: number | null;
  setCalculatorBusyKey: Dispatch<SetStateAction<string | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  loadCalculatorProjects: () => Promise<void>;
  loadCalculatorProjectDetail: (projectId: number) => Promise<void>;
  loadCalculatorRoomDetail: (roomId: number) => Promise<void>;
};

// Отделочные подсекции калькулятора: тёплый пол, полы и отделка стен.
export function createAdminCalculatorFinishesController(props: CalculatorFinishesControllerOptions) {
  async function handleSaveCalculatorWarmFloor(
    projectId: number,
    payload: CalculatorWarmFloorPayload,
    options?: { silent?: boolean },
  ) {
    try {
      props.setCalculatorBusyKey(`calculator-warm-floor-save-${projectId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}/warm-floor`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      if (!options?.silent) {
        await props.loadCalculatorProjects();
        if (props.selectedCalculatorRoomId !== null) {
          await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
        }
        props.setSuccessMessage(`Тёплый пол по проекту "${updatedProject.project.name}" сохранён.`);
      }
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить тёплый пол");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleSaveCalculatorFlooring(
    projectId: number,
    payload: CalculatorFlooringPayload,
    options?: { silent?: boolean },
  ) {
    try {
      if (!options?.silent) {
        props.setCalculatorBusyKey(`calculator-flooring-save-${projectId}`);
      }
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}/flooring`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      if (!options?.silent) {
        await props.loadCalculatorProjects();
        props.setSuccessMessage(`Напольные покрытия по проекту "${updatedProject.project.name}" сохранены.`);
      }
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить напольные покрытия");
    } finally {
      if (!options?.silent) {
        props.setCalculatorBusyKey(null);
      }
    }
  }

  async function handleCreateCalculatorFlooringCovering(payload: CalculatorFlooringCoveringPayload) {
    try {
      props.setCalculatorBusyKey("calculator-flooring-covering-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/flooring/coverings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Покрытие "${created.title}" добавлено в справочник.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить покрытие");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorFlooringPreparation(payload: CalculatorFlooringPreparationPayload) {
    try {
      props.setCalculatorBusyKey("calculator-flooring-preparation-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/flooring/preparations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Подготовка "${created.title}" добавлена в справочник.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить подготовку");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorFlooringLayout(payload: CalculatorFlooringLayoutPayload) {
    try {
      props.setCalculatorBusyKey("calculator-flooring-layout-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/flooring/layouts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Способ укладки "${created.title}" добавлен в справочник.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить способ укладки");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleSaveCalculatorWallFinish(projectId: number, payload: CalculatorWallFinishPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-wall-finish-save-${projectId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}/wall-finishes`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      props.setSuccessMessage(`Отделка стен по проекту "${updatedProject.project.name}" сохранена.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить отделку стен");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorWallFinishCovering(payload: CalculatorWallFinishCoveringPayload) {
    try {
      props.setCalculatorBusyKey("calculator-wall-finish-covering-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/wall-finishes/coverings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Отделка "${created.title}" добавлена в справочник.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить отделку стен");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorWallFinishPreparation(payload: CalculatorWallFinishPreparationPayload) {
    try {
      props.setCalculatorBusyKey("calculator-wall-finish-preparation-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/wall-finishes/preparations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Подготовка "${created.title}" добавлена в справочник.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить подготовку стен");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorWallFinishLayout(payload: CalculatorWallFinishLayoutPayload) {
    try {
      props.setCalculatorBusyKey("calculator-wall-finish-layout-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/wall-finishes/layouts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Способ монтажа "${created.title}" добавлен в справочник.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить способ монтажа");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  return {
    handleSaveCalculatorWarmFloor,
    handleSaveCalculatorFlooring,
    handleCreateCalculatorFlooringCovering,
    handleCreateCalculatorFlooringPreparation,
    handleCreateCalculatorFlooringLayout,
    handleSaveCalculatorWallFinish,
    handleCreateCalculatorWallFinishCovering,
    handleCreateCalculatorWallFinishPreparation,
    handleCreateCalculatorWallFinishLayout,
  };
}
