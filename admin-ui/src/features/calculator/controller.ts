import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type {
  CalculatorProject,
  CalculatorProjectDetail,
  CalculatorRoomDetail,
  CalculatorRoomPayload,
} from "./calculator";
import type { ScreenKey } from "../../shared/types";
import { createAdminCalculatorDoorsController } from "./doors-controller";
import { createAdminCalculatorFinishesController } from "./finishes-controller";
import { fetchJson } from "../../shared/utils";

type CalculatorControllerOptions = {
  screen: ScreenKey;
  setScreen: Dispatch<SetStateAction<ScreenKey>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
};

// Контур проектного калькулятора: shell проектов и делегирование в подмодули.
export function useAdminCalculatorController(props: CalculatorControllerOptions) {
  const [calculatorProjects, setCalculatorProjects] = useState<CalculatorProject[]>([]);
  const [selectedCalculatorProjectId, setSelectedCalculatorProjectId] = useState<number | null>(null);
  const [calculatorProjectDetail, setCalculatorProjectDetail] = useState<CalculatorProjectDetail | null>(null);
  const [selectedCalculatorRoomId, setSelectedCalculatorRoomId] = useState<number | null>(null);
  const [calculatorRoomDetail, setCalculatorRoomDetail] = useState<CalculatorRoomDetail | null>(null);

  const [calculatorLoading, setCalculatorLoading] = useState(false);
  const [calculatorProjectLoading, setCalculatorProjectLoading] = useState(false);
  const [calculatorRoomLoading, setCalculatorRoomLoading] = useState(false);
  const [calculatorBusyKey, setCalculatorBusyKey] = useState<string | null>(null);
  const [calculatorError, setCalculatorError] = useState<string | null>(null);

  useEffect(() => {
    if (!calculatorProjects.length) {
      setSelectedCalculatorProjectId(null);
      setSelectedCalculatorRoomId(null);
      setCalculatorProjectDetail(null);
      setCalculatorRoomDetail(null);
      return;
    }
    const projectIds = new Set(calculatorProjects.map((project) => project.id));
    if (selectedCalculatorProjectId === null || !projectIds.has(selectedCalculatorProjectId)) {
      setSelectedCalculatorProjectId(calculatorProjects[0].id);
    }
  }, [calculatorProjects, selectedCalculatorProjectId]);

  useEffect(() => {
    if (props.screen === "calculator" && !calculatorLoading && !calculatorProjects.length) {
      void loadCalculatorProjects();
    }
  }, [props.screen, calculatorLoading, calculatorProjects.length]);

  useEffect(() => {
    if (selectedCalculatorProjectId !== null) {
      void loadCalculatorProjectDetail(selectedCalculatorProjectId);
    }
  }, [selectedCalculatorProjectId]);

  useEffect(() => {
    if (!calculatorProjectDetail) {
      return;
    }
    const roomIds = calculatorProjectDetail.rooms.map((room) => room.id);
    if (!roomIds.length) {
      setSelectedCalculatorRoomId(null);
      setCalculatorRoomDetail(null);
      return;
    }
    if (selectedCalculatorRoomId === null || !roomIds.includes(selectedCalculatorRoomId)) {
      setSelectedCalculatorRoomId(roomIds[0]);
    }
  }, [calculatorProjectDetail, selectedCalculatorRoomId]);

  useEffect(() => {
    if (selectedCalculatorRoomId !== null) {
      void loadCalculatorRoomDetail(selectedCalculatorRoomId);
    }
  }, [selectedCalculatorRoomId]);

  async function loadCalculatorProjects() {
    try {
      setCalculatorLoading(true);
      const data = await fetchJson<CalculatorProject[]>("/api/calculator/projects");
      setCalculatorProjects(data);
      setCalculatorError(null);
    } catch (loadError) {
      setCalculatorError(loadError instanceof Error ? loadError.message : "Не удалось загрузить проекты калькулятора");
    } finally {
      setCalculatorLoading(false);
    }
  }

  async function loadCalculatorProjectDetail(projectId: number) {
    try {
      setCalculatorProjectLoading(true);
      const data = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}`);
      setCalculatorProjectDetail(data);
      setCalculatorError(null);
    } catch (loadError) {
      setCalculatorProjectDetail(null);
      setCalculatorError(loadError instanceof Error ? loadError.message : "Не удалось загрузить проект калькулятора");
    } finally {
      setCalculatorProjectLoading(false);
    }
  }

  async function loadCalculatorRoomDetail(roomId: number) {
    try {
      setCalculatorRoomLoading(true);
      const data = await fetchJson<CalculatorRoomDetail>(`/api/calculator/rooms/${roomId}`);
      setCalculatorRoomDetail(data);
      setCalculatorError(null);
    } catch (loadError) {
      setCalculatorRoomDetail(null);
      setCalculatorError(loadError instanceof Error ? loadError.message : "Не удалось загрузить комнату");
    } finally {
      setCalculatorRoomLoading(false);
    }
  }

  async function handleCreateCalculatorProject(payload: { name: string; note: string }) {
    try {
      setCalculatorBusyKey("calculator-project-create");
      const created = await fetchJson<CalculatorProjectDetail>("/api/calculator/projects", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          note: payload.note || null,
        }),
      });
      await loadCalculatorProjects();
      setSelectedCalculatorProjectId(created.project.id);
      setCalculatorProjectDetail(created);
      setSelectedCalculatorRoomId(created.rooms[0]?.id ?? null);
      props.setSuccessMessage(`Проект калькулятора "${created.project.name}" создан.`);
      setCalculatorError(null);
    } catch (actionError) {
      setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось создать проект калькулятора");
    } finally {
      setCalculatorBusyKey(null);
    }
  }

  async function handleCreateCalculatorRoom(projectId: number) {
    try {
      setCalculatorBusyKey(`calculator-room-create-${projectId}`);
      const created = await fetchJson<CalculatorRoomDetail>(`/api/calculator/projects/${projectId}/rooms`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadCalculatorProjectDetail(projectId);
      setSelectedCalculatorRoomId(created.room.id);
      setCalculatorRoomDetail(created);
      props.setSuccessMessage(`Помещение "${created.room.name}" добавлено.`);
      setCalculatorError(null);
    } catch (actionError) {
      setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось добавить помещение");
    } finally {
      setCalculatorBusyKey(null);
    }
  }

  async function handleSaveCalculatorRoom(roomId: number, payload: CalculatorRoomPayload) {
    try {
      setCalculatorBusyKey(`calculator-room-save-${roomId}`);
      const updated = await fetchJson<CalculatorRoomDetail>(`/api/calculator/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setCalculatorRoomDetail(updated);
      await loadCalculatorProjectDetail(updated.room.project_id);
      await loadCalculatorProjects();
      props.setSuccessMessage(`Помещение "${updated.room.name}" сохранено.`);
      setCalculatorError(null);
    } catch (actionError) {
      setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось сохранить помещение");
    } finally {
      setCalculatorBusyKey(null);
    }
  }

  async function handleDeleteCalculatorRoom(roomId: number) {
    const confirmed = window.confirm(`Удалить помещение #${roomId} из проекта калькулятора?`);
    if (!confirmed) {
      return;
    }
    try {
      setCalculatorBusyKey(`calculator-room-delete-${roomId}`);
      const updatedProject = await fetchJson<CalculatorProjectDetail>(`/api/calculator/rooms/${roomId}`, {
        method: "DELETE",
      });
      setCalculatorProjectDetail(updatedProject);
      setSelectedCalculatorProjectId(updatedProject.project.id);
      setSelectedCalculatorRoomId(updatedProject.rooms[0]?.id ?? null);
      setCalculatorRoomDetail(null);
      await loadCalculatorProjects();
      if (updatedProject.rooms[0]) {
        await loadCalculatorRoomDetail(updatedProject.rooms[0].id);
      }
      props.setSuccessMessage(`Помещение #${roomId} удалено.`);
      setCalculatorError(null);
    } catch (actionError) {
      setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось удалить помещение");
    } finally {
      setCalculatorBusyKey(null);
    }
  }

  async function handleQuickCreateCalculatorProject() {
    const name = window.prompt("Название нового объекта / проекта:");
    if (!name || !name.trim()) {
      return;
    }
    props.setScreen("calculator");
    await handleCreateCalculatorProject({
      name: name.trim(),
      note: "",
    });
  }

  const finishesController = createAdminCalculatorFinishesController({
    selectedCalculatorProjectId,
    selectedCalculatorRoomId,
    setCalculatorBusyKey,
    setCalculatorError,
    setCalculatorProjectDetail,
    setSuccessMessage: props.setSuccessMessage,
    loadCalculatorProjects,
    loadCalculatorProjectDetail,
    loadCalculatorRoomDetail,
  });

  const doorsController = createAdminCalculatorDoorsController({
    selectedCalculatorProjectId,
    selectedCalculatorRoomId,
    setCalculatorBusyKey,
    setCalculatorError,
    setCalculatorProjectDetail,
    setSuccessMessage: props.setSuccessMessage,
    loadCalculatorProjects,
    loadCalculatorProjectDetail,
    loadCalculatorRoomDetail,
  });

  return {
    calculatorProjects,
    selectedCalculatorProjectId,
    setSelectedCalculatorProjectId,
    calculatorProjectDetail,
    selectedCalculatorRoomId,
    setSelectedCalculatorRoomId,
    calculatorRoomDetail,
    calculatorLoading,
    calculatorProjectLoading,
    calculatorRoomLoading,
    calculatorBusyKey,
    calculatorError,
    loadCalculatorProjects,
    loadCalculatorProjectDetail,
    loadCalculatorRoomDetail,
    handleCreateCalculatorProject,
    handleCreateCalculatorRoom,
    handleSaveCalculatorRoom,
    handleDeleteCalculatorRoom,
    handleQuickCreateCalculatorProject,
    ...finishesController,
    ...doorsController,
  };
}

