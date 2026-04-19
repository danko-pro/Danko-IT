import type { Dispatch, SetStateAction } from "react";

import type { CalculatorProjectDetail, CalculatorRoomDetail, CalculatorRoomPayload } from "./calculator-types";
import { fetchJson } from "../../shared/utils";

type CalculatorRoomActionsControllerOptions = {
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setCalculatorBusyKey: Dispatch<SetStateAction<string | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
  setSelectedCalculatorProjectId: Dispatch<SetStateAction<number | null>>;
  setSelectedCalculatorRoomId: Dispatch<SetStateAction<number | null>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  setCalculatorRoomDetail: Dispatch<SetStateAction<CalculatorRoomDetail | null>>;
  loadCalculatorProjects: () => Promise<void>;
  loadCalculatorProjectDetail: (projectId: number) => Promise<void>;
  loadCalculatorRoomDetail: (roomId: number) => Promise<void>;
};

// Контур room-level мутаций калькулятора.
// Здесь живут создание, сохранение и удаление помещений без смешивания с загрузчиками и project-level логикой.

export function createAdminCalculatorRoomActionsController(props: CalculatorRoomActionsControllerOptions) {
  async function handleCreateCalculatorRoom(projectId: number) {
    try {
      props.setCalculatorBusyKey(`calculator-room-create-${projectId}`);
      const created = await fetchJson<CalculatorRoomDetail>(`/api/calculator/projects/${projectId}/rooms`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await props.loadCalculatorProjectDetail(projectId);
      props.setSelectedCalculatorRoomId(created.room.id);
      props.setCalculatorRoomDetail(created);
      props.setSuccessMessage(`Помещение "${created.room.name}" добавлено.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить помещение");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleSaveCalculatorRoom(roomId: number, payload: CalculatorRoomPayload) {
    try {
      props.setCalculatorBusyKey(`calculator-room-save-${roomId}`);
      const updated = await fetchJson<CalculatorRoomDetail>(`/api/calculator/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      props.setCalculatorRoomDetail(updated);
      await props.loadCalculatorProjectDetail(updated.room.project_id);
      await props.loadCalculatorProjects();
      props.setSuccessMessage(`Помещение "${updated.room.name}" сохранено.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить помещение");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleDeleteCalculatorRoom(roomId: number) {
    const confirmed = window.confirm(`Удалить помещение #${roomId} из проекта калькулятора?`);
    if (!confirmed) {
      return;
    }
    try {
      props.setCalculatorBusyKey(`calculator-room-delete-${roomId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/rooms/${roomId}`, {
        method: "DELETE",
      });
      props.setCalculatorProjectDetail(updatedProject);
      props.setSelectedCalculatorProjectId(updatedProject.project.id);
      props.setSelectedCalculatorRoomId(updatedProject.rooms[0]?.id ?? null);
      props.setCalculatorRoomDetail(null);
      await props.loadCalculatorProjects();
      if (updatedProject.rooms[0]) {
        await props.loadCalculatorRoomDetail(updatedProject.rooms[0].id);
      }
      props.setSuccessMessage(`Помещение #${roomId} удалено.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось удалить помещение");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  return {
    handleCreateCalculatorRoom,
    handleSaveCalculatorRoom,
    handleDeleteCalculatorRoom,
  };
}
