import type { Dispatch, SetStateAction } from "react";

import { fetchJson } from "../../../shared/utils";
import type {
  CalculatorProjectDetail,
  CalculatorRoomCreatePayload,
  CalculatorRoomDetail,
  CalculatorRoomPayload,
} from "../model/types";

type CalculatorRoomActionsControllerOptions = {
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setCalculatorBusyKey: Dispatch<SetStateAction<string | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
  getSelectedCalculatorRoomId: () => number | null;
  setSelectedCalculatorProjectId: Dispatch<SetStateAction<number | null>>;
  setSelectedCalculatorRoomId: Dispatch<SetStateAction<number | null>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  setCalculatorRoomDetail: Dispatch<SetStateAction<CalculatorRoomDetail | null>>;
  loadCalculatorProjects: () => Promise<void>;
  loadCalculatorProjectDetail: (projectId: number) => Promise<void>;
  loadCalculatorRoomDetail: (roomId: number) => Promise<void>;
};

// Room-level write actions for the calculator.
// Autosave uses the same save path but in silent mode, without noisy toasts or global busy state.
export function createAdminCalculatorRoomActionsController(props: CalculatorRoomActionsControllerOptions) {
  async function handleCreateCalculatorRoom(projectId: number, payload: CalculatorRoomCreatePayload = {}) {
    try {
      props.setCalculatorBusyKey(`calculator-room-create-${projectId}`);
      const created = await fetchJson<CalculatorRoomDetail>(`/api/calculator/projects/${projectId}/rooms`, {
        method: "POST",
        body: JSON.stringify(payload),
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

  async function handleSaveCalculatorRoom(
    roomId: number,
    payload: CalculatorRoomPayload,
    options?: { silent?: boolean },
  ) {
    const silent = options?.silent === true;

    try {
      if (!silent) {
        props.setCalculatorBusyKey(`calculator-room-save-${roomId}`);
      }

      const updated = await fetchJson<CalculatorRoomDetail>(`/api/calculator/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (props.getSelectedCalculatorRoomId() === roomId) {
        props.setCalculatorRoomDetail(updated);
      }

      await props.loadCalculatorProjectDetail(updated.room.project_id);

      if (!silent) {
        await props.loadCalculatorProjects();
        props.setSuccessMessage(`Помещение "${updated.room.name}" сохранено.`);
      }

      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить помещение");
    } finally {
      if (!silent) {
        props.setCalculatorBusyKey(null);
      }
    }
  }

  async function handleDeleteCalculatorRoom(roomId: number) {
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
