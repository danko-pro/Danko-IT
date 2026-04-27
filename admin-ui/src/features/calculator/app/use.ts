import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

import type { CalculatorProject, CalculatorProjectDetail, CalculatorRoomDetail } from "../model/types";
import type { ScreenKey } from "../../../shared/types";
import { createAdminCalculatorDoorsController } from "./doors";
import { createAdminCalculatorFinishesController } from "./finishes";
import { createAdminCalculatorLoadersController } from "./load";
import { createAdminCalculatorProjectActionsController } from "./project";
import { createAdminCalculatorRoomActionsController } from "./room";

type CalculatorControllerOptions = {
  screen: ScreenKey;
  setScreen: Dispatch<SetStateAction<ScreenKey>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
};

// Корневой runtime-контроллер проектного калькулятора.
// Здесь остаётся только композиция состояния, lifecycle-эффекты и wiring подмодулей read/write контуров.

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

  const { loadCalculatorProjects, loadCalculatorProjectDetail, loadCalculatorRoomDetail } = createAdminCalculatorLoadersController({
    setCalculatorLoading,
    setCalculatorProjectLoading,
    setCalculatorRoomLoading,
    setCalculatorProjects,
    setCalculatorProjectDetail,
    setCalculatorRoomDetail,
    setCalculatorError,
  });

  const { handleCreateCalculatorProject, handleQuickCreateCalculatorProject, handleSaveCalculatorProject } =
    createAdminCalculatorProjectActionsController({
      setScreen: props.setScreen,
      setSuccessMessage: props.setSuccessMessage,
      setCalculatorBusyKey,
      setCalculatorError,
      setCalculatorProjects,
      setSelectedCalculatorProjectId,
      setSelectedCalculatorRoomId,
      setCalculatorProjectDetail,
      loadCalculatorProjects,
    });

  const { handleCreateCalculatorRoom, handleSaveCalculatorRoom, handleDeleteCalculatorRoom } = createAdminCalculatorRoomActionsController({
    setSuccessMessage: props.setSuccessMessage,
    setCalculatorBusyKey,
    setCalculatorError,
    getSelectedCalculatorRoomId: () => selectedCalculatorRoomId,
    setSelectedCalculatorProjectId,
    setSelectedCalculatorRoomId,
    setCalculatorProjectDetail,
    setCalculatorRoomDetail,
    loadCalculatorProjects,
    loadCalculatorProjectDetail,
    loadCalculatorRoomDetail,
  });

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
    handleSaveCalculatorProject,
    handleCreateCalculatorRoom,
    handleSaveCalculatorRoom,
    handleDeleteCalculatorRoom,
    handleQuickCreateCalculatorProject,
    ...finishesController,
    ...doorsController,
  };
}
