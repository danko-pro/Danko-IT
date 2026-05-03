import { useMemo } from "react";

import { buildCalculatorHeaderTotals, buildCalculatorStageFlags } from "../model/derived";
import {
  useCalculatorDoorsController,
  useCalculatorFlooringController,
  useCalculatorWallFinishController,
  useCalculatorWarmFloorController,
} from "../stage/hooks";
import {
  useCalculatorProjectController,
  useCalculatorRoomController,
} from "./base";
import {
  buildCalculatorDetailViews,
  buildFlooringDisplayPreview,
  buildWallFinishDisplayPreview,
  buildWarmFloorDisplayPreview,
} from "./preview";
import { useCalculatorStageController } from "../stage/use";
import type { CalculatorScreenProps, CalculatorScreenState } from "./types";

// Root orchestration for the calculator screen.
// Stage flags, hook controllers and derived totals are assembled here, while the view only receives the final shape.
export function useCalculatorScreenController(props: CalculatorScreenProps): CalculatorScreenState {
  const { data, actions } = props;
  const { activeStage, setActiveStage } = useCalculatorStageController(data.projectDetail);
  const stageFlags = buildCalculatorStageFlags(activeStage);

  const project = useCalculatorProjectController({
    projectDetail: data.projectDetail,
    onSaveProject: actions.onSaveProject,
  });
  const room = useCalculatorRoomController({
    roomDetail: data.roomDetail,
    selectedRoomId: data.selectedRoomId,
    onSaveRoom: actions.onSaveRoom,
  });
  const { projectDetailView, warmFloorDetailView, flooringDetailView, wallFinishDetailView } = useMemo(
    () => buildCalculatorDetailViews(data.projectDetail, room.roomPreviewSummary),
    [data.projectDetail, room.roomPreviewSummary],
  );
  const doors = useCalculatorDoorsController({
    projectDetail: data.projectDetail,
    setActiveStage,
    onCreateDoorCatalogItem: actions.onCreateDoorCatalogItem,
    onCreateDoorComponentCatalogItem: actions.onCreateDoorComponentCatalogItem,
    onCreateProjectDoor: actions.onCreateProjectDoor,
    onUpdateProjectDoor: actions.onUpdateProjectDoor,
    onCreateProjectDoorComponent: actions.onCreateProjectDoorComponent,
    onUpdateProjectDoorComponent: actions.onUpdateProjectDoorComponent,
  });
  const warmFloor = useCalculatorWarmFloorController({
    projectDetail: data.projectDetail,
    isWarmFloorStage: stageFlags.isWarmFloorStage,
    onSaveWarmFloor: actions.onSaveWarmFloor,
  });
  const flooring = useCalculatorFlooringController({
    projectDetail: data.projectDetail,
    isFlooringStage: stageFlags.isFlooringStage,
    onSaveFlooring: actions.onSaveFlooring,
    onCreateFlooringCovering: actions.onCreateFlooringCovering,
    onCreateFlooringPreparation: actions.onCreateFlooringPreparation,
    onCreateFlooringLayout: actions.onCreateFlooringLayout,
  });
  const wallFinish = useCalculatorWallFinishController({
    projectDetail: data.projectDetail,
    isWallFinishStage: stageFlags.isWallFinishStage,
    onSaveWallFinish: actions.onSaveWallFinish,
    onCreateWallFinishCovering: actions.onCreateWallFinishCovering,
    onCreateWallFinishPreparation: actions.onCreateWallFinishPreparation,
    onCreateWallFinishLayout: actions.onCreateWallFinishLayout,
  });
  const warmFloorPreviewView = useMemo(
    () =>
      buildWarmFloorDisplayPreview(
        warmFloorDetailView,
        stageFlags.isWarmFloorStage ? "draft" : "base",
        stageFlags.isWarmFloorStage ? warmFloor.warmFloorState : undefined,
      ),
    [stageFlags.isWarmFloorStage, warmFloor.warmFloorState, warmFloorDetailView],
  );
  const flooringPreviewView = useMemo(
    () =>
      buildFlooringDisplayPreview(
        flooringDetailView,
        stageFlags.isFlooringStage ? "draft" : "base",
        stageFlags.isFlooringStage ? flooring.flooringState : undefined,
      ),
    [flooring.flooringState, flooringDetailView, stageFlags.isFlooringStage],
  );
  const wallFinishPreviewView = useMemo(
    () =>
      buildWallFinishDisplayPreview(
        wallFinishDetailView,
        stageFlags.isWallFinishStage ? "draft" : "base",
        stageFlags.isWallFinishStage ? wallFinish.wallFinishState : undefined,
      ),
    [stageFlags.isWallFinishStage, wallFinish.wallFinishState, wallFinishDetailView],
  );
  const headerTotals = buildCalculatorHeaderTotals(
    projectDetailView,
    warmFloorPreviewView,
    flooringPreviewView,
    wallFinishPreviewView,
  );

  return {
    activeStage,
    setActiveStage,
    stageFlags,
    headerTotals,
    projectDetailView,
    warmFloorPreviewView,
    flooringDetailView,
    flooringPreviewView,
    wallFinishDetailView,
    wallFinishPreviewView,
    project,
    room,
    doors,
    warmFloor,
    flooring,
    wallFinish,
  };
}

export type CalculatorScreenControllerState = CalculatorScreenState;
