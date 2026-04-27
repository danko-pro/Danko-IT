import type { Dispatch, SetStateAction } from "react";
import type { CalculatorProjectDetail } from "../model/types";
import type {
  DoorCatalogPayload,
  DoorComponentCatalogPayload,
  ProjectDoorComponentPayload,
  ProjectDoorPayload,
} from "./";
import { fetchJson } from "../../../shared/utils";

type CalculatorDoorsControllerOptions = {
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

// Дверной контур калькулятора: каталог дверей, проектные двери и комплектующие.
export function createAdminCalculatorDoorsController(props: CalculatorDoorsControllerOptions) {
  async function handleCreateCalculatorDoorCatalogItem(payload: DoorCatalogPayload) {
    try {
      props.setCalculatorBusyKey("calculator-door-catalog-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/door-catalog", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title,
          width_mm: payload.width_mm,
          height_mm: payload.height_mm,
          thickness_mm: payload.thickness_mm,
          purchase_price: payload.purchase_price,
          sale_price: payload.sale_price,
          install_price: payload.install_price,
          note: payload.note || null,
        }),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Типоразмер "${created.title}" добавлен.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить типоразмер двери");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorProjectDoor(projectId: number, payload: ProjectDoorPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-project-door-create-${projectId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}/doors`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      if (props.selectedCalculatorRoomId !== null) {
        await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
      }
      props.setSuccessMessage("Дверной блок добавлен в проект.");
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить дверь или проём");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleDeleteCalculatorProjectDoor(doorId: number) {
    const confirmed = window.confirm(`Удалить дверной блок #${doorId} из проекта?`);
    if (!confirmed) {
      return;
    }
    try {
      props.setCalculatorBusyKey(`calculator-project-door-delete-${doorId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/project-doors/${doorId}`, {
        method: "DELETE",
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      if (props.selectedCalculatorRoomId !== null) {
        await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
      }
      props.setSuccessMessage(`Дверной блок #${doorId} удалён.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось удалить дверной блок");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleUpdateCalculatorProjectDoor(doorId: number, payload: ProjectDoorPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-project-door-save-${doorId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/project-doors/${doorId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      if (props.selectedCalculatorRoomId !== null) {
        await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
      }
      props.setSuccessMessage(`Дверной блок #${doorId} обновлён.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось обновить дверной блок");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorDoorComponentCatalogItem(payload: DoorComponentCatalogPayload) {
    try {
      props.setCalculatorBusyKey("calculator-door-component-catalog-create");
      const created = await fetchJson<{ id: number; title: string }>("/api/calculator/door-component-catalog", {
        method: "POST",
        body: JSON.stringify({
          category_code: payload.category_code,
          title: payload.title,
          unit: payload.unit,
          purchase_price: payload.purchase_price,
          sale_price: payload.sale_price,
          note: payload.note || null,
        }),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await props.loadCalculatorProjectDetail(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Комплектующая "${created.title}" добавлена в каталог.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить комплектующую");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorProjectDoorComponent(doorId: number, payload: ProjectDoorComponentPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-project-door-component-create-${doorId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/project-doors/${doorId}/components`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      if (props.selectedCalculatorRoomId !== null) {
        await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
      }
      props.setSuccessMessage("Комплектующая добавлена к двери.");
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить комплектующую к двери");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleUpdateCalculatorProjectDoorComponent(componentId: number, payload: ProjectDoorComponentPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-project-door-component-save-${componentId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/door-components/${componentId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      if (props.selectedCalculatorRoomId !== null) {
        await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
      }
      props.setSuccessMessage(`Комплектующая #${componentId} обновлена.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось обновить комплектующую");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleDeleteCalculatorProjectDoorComponent(componentId: number) {
    const confirmed = window.confirm(`Удалить комплектующую #${componentId}?`);
    if (!confirmed) {
      return;
    }
    try {
      props.setCalculatorBusyKey(`calculator-project-door-component-delete-${componentId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/door-components/${componentId}`, {
        method: "DELETE",
      });
      props.setCalculatorProjectDetail(updatedProject);
      await props.loadCalculatorProjects();
      if (props.selectedCalculatorRoomId !== null) {
        await props.loadCalculatorRoomDetail(props.selectedCalculatorRoomId);
      }
      props.setSuccessMessage(`Комплектующая #${componentId} удалена.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось удалить комплектующую");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  return {
    handleCreateCalculatorDoorCatalogItem,
    handleCreateCalculatorProjectDoor,
    handleDeleteCalculatorProjectDoor,
    handleUpdateCalculatorProjectDoor,
    handleCreateCalculatorDoorComponentCatalogItem,
    handleCreateCalculatorProjectDoorComponent,
    handleUpdateCalculatorProjectDoorComponent,
    handleDeleteCalculatorProjectDoorComponent,
  };
}

