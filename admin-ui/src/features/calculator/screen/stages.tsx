import { DoorsStageSection } from "../doors/stage";
import type { DoorsStageSectionProps } from "../doors/stage";
import { FlooringStageSection } from "../flooring/stage";
import type { FlooringStageSectionProps } from "../flooring/stage";
import type {
  CalculatorScreenActionProps,
  CalculatorScreenDataProps,
  CalculatorScreenState,
} from "./types";
import { WarmFloorStageSection } from "../warm-floor/stage";
import type { WarmFloorStageSectionProps } from "../warm-floor/stage";
import { WallFinishStageSection } from "../wall-finish/stage";
import type { WallFinishStageSectionProps } from "../wall-finish/stage";
import type { CalculatorStage } from "../model/types";

type CalculatorEstimateStagesFacadeProps = {
  data: Pick<CalculatorScreenDataProps, "projectDetail" | "busyKey">;
  actions: Pick<CalculatorScreenActionProps, "onDeleteProjectDoor" | "onDeleteProjectDoorComponent">;
  stageFlags: Pick<
    CalculatorScreenState["stageFlags"],
    "isDoorsStage" | "isWarmFloorStage" | "isFlooringStage" | "isWallFinishStage"
  >;
  doors: CalculatorScreenState["doors"];
  warmFloor: CalculatorScreenState["warmFloor"];
  flooring: CalculatorScreenState["flooring"];
  wallFinish: CalculatorScreenState["wallFinish"];
  forcedStage?: Extract<CalculatorStage, "doors" | "warmfloor" | "flooring" | "wallfinish">;
};

// Screen-level facade between the root screen and estimate stages.
// The root layout now switches only between coarse sections, while each estimate stage gets a focused adapter.
export function CalculatorEstimateStagesFacade(props: CalculatorEstimateStagesFacadeProps) {
  const { forcedStage, stageFlags } = props;

  if (forcedStage === "doors" || (!forcedStage && stageFlags.isDoorsStage)) {
    return <DoorsStageSection {...buildDoorsStageProps(props)} />;
  }

  if (forcedStage === "warmfloor" || (!forcedStage && stageFlags.isWarmFloorStage)) {
    return <WarmFloorStageSection {...buildWarmFloorStageProps(props)} />;
  }

  if (forcedStage === "flooring" || (!forcedStage && stageFlags.isFlooringStage)) {
    return <FlooringStageSection {...buildFlooringStageProps(props)} />;
  }

  if (forcedStage === "wallfinish" || (!forcedStage && stageFlags.isWallFinishStage)) {
    return <WallFinishStageSection {...buildWallFinishStageProps(props)} />;
  }

  return null;
}

function buildDoorsStageProps(props: CalculatorEstimateStagesFacadeProps): DoorsStageSectionProps {
  const { data, actions, doors } = props;

  return {
    projectDetail: data.projectDetail,
    doorCatalogState: doors.doorCatalogState,
    setDoorCatalogState: doors.setDoorCatalogState,
    doorComponentCatalogState: doors.doorComponentCatalogState,
    setDoorComponentCatalogState: doors.setDoorComponentCatalogState,
    projectDoorState: doors.projectDoorState,
    setProjectDoorState: doors.setProjectDoorState,
    projectDoorComponentState: doors.projectDoorComponentState,
    setProjectDoorComponentState: doors.setProjectDoorComponentState,
    editingDoorId: doors.editingDoorId,
    selectedDoorId: doors.selectedDoorId,
    setSelectedDoorId: doors.setSelectedDoorId,
    editingDoorComponentId: doors.editingDoorComponentId,
    selectedDoor: doors.selectedDoor,
    doorsStageSummary: doors.doorsStageSummary,
    doorsStageSpecification: doors.doorsStageSpecification,
    busyKey: data.busyKey,
    handleDoorCatalogSubmit: doors.handleDoorCatalogSubmit,
    handleDoorComponentCatalogSubmit: doors.handleDoorComponentCatalogSubmit,
    handleProjectDoorSubmit: doors.handleProjectDoorSubmit,
    handleProjectDoorComponentSubmit: doors.handleProjectDoorComponentSubmit,
    startDoorEdit: doors.startDoorEdit,
    resetDoorForm: doors.resetDoorForm,
    startDoorComponentEdit: doors.startDoorComponentEdit,
    resetDoorComponentForm: doors.resetDoorComponentForm,
    onDeleteProjectDoor: actions.onDeleteProjectDoor,
    onDeleteProjectDoorComponent: actions.onDeleteProjectDoorComponent,
  };
}

function buildWarmFloorStageProps(props: CalculatorEstimateStagesFacadeProps): WarmFloorStageSectionProps {
  const { data, warmFloor } = props;

  return {
    projectDetail: data.projectDetail,
    warmFloorPreview: warmFloor.warmFloorPreview,
    warmFloorSettingsOpen: warmFloor.warmFloorSettingsOpen,
    setWarmFloorSettingsOpen: warmFloor.setWarmFloorSettingsOpen,
    handleWarmFloorSubmit: warmFloor.handleWarmFloorSubmit,
    warmFloorRoomStateById: warmFloor.warmFloorRoomStateById,
    expandedWarmFloorRoomId: warmFloor.expandedWarmFloorRoomId,
    setExpandedWarmFloorRoomId: warmFloor.setExpandedWarmFloorRoomId,
    setWarmFloorState: warmFloor.setWarmFloorState,
    warmFloorState: warmFloor.warmFloorState,
    busyKey: data.busyKey,
    resetWarmFloorState: warmFloor.resetWarmFloorState,
  };
}

function buildFlooringStageProps(props: CalculatorEstimateStagesFacadeProps): FlooringStageSectionProps {
  const { data, flooring } = props;

  return {
    projectDetail: data.projectDetail,
    flooringDetail: flooring.flooringDetail,
    flooringPreview: flooring.flooringPreview,
    flooringSettingsOpen: flooring.flooringSettingsOpen,
    setFlooringSettingsOpen: flooring.setFlooringSettingsOpen,
    flooringRoomStateById: flooring.flooringRoomStateById,
    expandedFlooringRoomId: flooring.expandedFlooringRoomId,
    setExpandedFlooringRoomId: flooring.setExpandedFlooringRoomId,
    setFlooringState: flooring.setFlooringState,
    flooringState: flooring.flooringState,
    flooringCoveringState: flooring.flooringCoveringState,
    setFlooringCoveringState: flooring.setFlooringCoveringState,
    flooringPreparationState: flooring.flooringPreparationState,
    setFlooringPreparationState: flooring.setFlooringPreparationState,
    flooringLayoutState: flooring.flooringLayoutState,
    setFlooringLayoutState: flooring.setFlooringLayoutState,
    flooringCoveringById: flooring.flooringCoveringById,
    flooringPreparationById: flooring.flooringPreparationById,
    flooringLayoutById: flooring.flooringLayoutById,
    flooringSelectedTechRooms: flooring.flooringSelectedTechRooms,
    busyKey: data.busyKey,
    submitFlooring: flooring.submitFlooring,
    submitFlooringCovering: flooring.submitFlooringCovering,
    submitFlooringPreparation: flooring.submitFlooringPreparation,
    submitFlooringLayout: flooring.submitFlooringLayout,
    resetFlooringState: flooring.resetFlooringState,
  };
}

function buildWallFinishStageProps(props: CalculatorEstimateStagesFacadeProps): WallFinishStageSectionProps {
  const { data, wallFinish } = props;

  return {
    projectDetail: data.projectDetail,
    wallFinishDetail: wallFinish.wallFinishDetail,
    wallFinishPreview: wallFinish.wallFinishPreview,
    wallFinishSettingsOpen: wallFinish.wallFinishSettingsOpen,
    setWallFinishSettingsOpen: wallFinish.setWallFinishSettingsOpen,
    wallFinishRoomStateById: wallFinish.wallFinishRoomStateById,
    expandedWallFinishRoomId: wallFinish.expandedWallFinishRoomId,
    setExpandedWallFinishRoomId: wallFinish.setExpandedWallFinishRoomId,
    setWallFinishState: wallFinish.setWallFinishState,
    wallFinishState: wallFinish.wallFinishState,
    wallFinishCoveringState: wallFinish.wallFinishCoveringState,
    setWallFinishCoveringState: wallFinish.setWallFinishCoveringState,
    wallFinishPreparationState: wallFinish.wallFinishPreparationState,
    setWallFinishPreparationState: wallFinish.setWallFinishPreparationState,
    wallFinishLayoutState: wallFinish.wallFinishLayoutState,
    setWallFinishLayoutState: wallFinish.setWallFinishLayoutState,
    wallFinishCoveringById: wallFinish.wallFinishCoveringById,
    wallFinishPreparationById: wallFinish.wallFinishPreparationById,
    wallFinishLayoutById: wallFinish.wallFinishLayoutById,
    wallFinishSelectedTechRooms: wallFinish.wallFinishSelectedTechRooms,
    busyKey: data.busyKey,
    submitWallFinish: wallFinish.submitWallFinish,
    submitWallFinishCovering: wallFinish.submitWallFinishCovering,
    submitWallFinishPreparation: wallFinish.submitWallFinishPreparation,
    submitWallFinishLayout: wallFinish.submitWallFinishLayout,
    resetWallFinishState: wallFinish.resetWallFinishState,
  };
}
