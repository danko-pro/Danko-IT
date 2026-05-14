import type { Dispatch, SetStateAction } from "react";

import type { CalculatorCeilingCatalogItem, CalculatorCeilingsDetail, CalculatorProjectDetail } from "../model/types";
import type {
  CeilingCatalogItemPayload,
  CeilingConfigUpdatePayload,
  CeilingRoomsReplacePayload,
  ProjectCeilingItemPayload,
} from "../ceilings/payload";
import { fetchJson } from "../../../shared/utils";

type CalculatorCeilingsControllerOptions = {
  selectedCalculatorProjectId: number | null;
  setCalculatorBusyKey: Dispatch<SetStateAction<string | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
};

export function createAdminCalculatorCeilingsController(props: CalculatorCeilingsControllerOptions) {
  function updateCeilingsDetail(ceilings: CalculatorCeilingsDetail) {
    props.setCalculatorProjectDetail((current) => (current ? { ...current, ceilings } : current));
  }

  async function handleLoadCalculatorCeilings(projectId: number) {
    try {
      props.setCalculatorBusyKey(`calculator-ceilings-load-${projectId}`);
      const ceilings = await fetchJson<CalculatorCeilingsDetail>(`/api/calculator/projects/${projectId}/ceilings`);
      updateCeilingsDetail(ceilings);
      props.setCalculatorError(null);
      return ceilings;
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось загрузить потолки");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleSaveCalculatorCeilingConfig(projectId: number, payload: CeilingConfigUpdatePayload) {
    try {
      props.setCalculatorBusyKey(`calculator-ceiling-config-save-${projectId}`);
      const ceilings = await fetchJson<CalculatorCeilingsDetail>(`/api/calculator/projects/${projectId}/ceilings/config`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      updateCeilingsDetail(ceilings);
      props.setSuccessMessage("Настройки потолков сохранены.");
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить настройки потолков");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorCeilingCatalogItem(payload: CeilingCatalogItemPayload) {
    try {
      props.setCalculatorBusyKey("calculator-ceiling-catalog-create");
      const created = await fetchJson<CalculatorCeilingCatalogItem>("/api/calculator/ceilings/catalog-items", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await handleLoadCalculatorCeilings(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Потолочная позиция "${created.title}" добавлена в каталог.`);
      props.setCalculatorError(null);
      return created;
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось создать потолочную позицию каталога");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleUpdateCalculatorCeilingCatalogItem(itemId: number, payload: Partial<CeilingCatalogItemPayload>) {
    try {
      props.setCalculatorBusyKey(`calculator-ceiling-catalog-save-${itemId}`);
      const updated = await fetchJson<CalculatorCeilingCatalogItem>(`/api/calculator/ceilings/catalog-items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (props.selectedCalculatorProjectId !== null) {
        await handleLoadCalculatorCeilings(props.selectedCalculatorProjectId);
      }
      props.setSuccessMessage(`Потолочная позиция "${updated.title}" обновлена.`);
      props.setCalculatorError(null);
      return updated;
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось обновить потолочную позицию каталога");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleReplaceCalculatorCeilingRooms(projectId: number, payload: CeilingRoomsReplacePayload) {
    try {
      props.setCalculatorBusyKey(`calculator-ceiling-rooms-save-${projectId}`);
      const ceilings = await fetchJson<CalculatorCeilingsDetail>(`/api/calculator/projects/${projectId}/ceilings/rooms`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      updateCeilingsDetail(ceilings);
      props.setSuccessMessage("Помещения потолков сохранены.");
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить помещения потолков");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorProjectCeilingItem(projectId: number, payload: ProjectCeilingItemPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-ceiling-item-create-${projectId}`);
      const ceilings = await fetchJson<CalculatorCeilingsDetail>(`/api/calculator/projects/${projectId}/ceilings/items`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      updateCeilingsDetail(ceilings);
      props.setSuccessMessage("Потолочная позиция добавлена.");
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить потолочную позицию");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleUpdateCalculatorProjectCeilingItem(itemId: number, payload: ProjectCeilingItemPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-ceiling-item-save-${itemId}`);
      const ceilings = await fetchJson<CalculatorCeilingsDetail>(`/api/calculator/ceilings/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      updateCeilingsDetail(ceilings);
      props.setSuccessMessage(`Потолочная позиция #${itemId} обновлена.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось обновить потолочную позицию");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleDeleteCalculatorProjectCeilingItem(itemId: number) {
    const confirmed = window.confirm(`Удалить потолочную позицию #${itemId}?`);
    if (!confirmed) {
      return;
    }

    try {
      props.setCalculatorBusyKey(`calculator-ceiling-item-delete-${itemId}`);
      const ceilings = await fetchJson<CalculatorCeilingsDetail>(`/api/calculator/ceilings/items/${itemId}`, {
        method: "DELETE",
      });
      updateCeilingsDetail(ceilings);
      props.setSuccessMessage(`Потолочная позиция #${itemId} удалена.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось удалить потолочную позицию");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  return {
    handleLoadCalculatorCeilings,
    handleSaveCalculatorCeilingConfig,
    handleCreateCalculatorCeilingCatalogItem,
    handleUpdateCalculatorCeilingCatalogItem,
    handleReplaceCalculatorCeilingRooms,
    handleCreateCalculatorProjectCeilingItem,
    handleUpdateCalculatorProjectCeilingItem,
    handleDeleteCalculatorProjectCeilingItem,
  };
}
