import { useCalculatorDoorsController } from "./calculator-doors-controller";
import { buildCalculatorHeaderTotals, buildCalculatorStageFlags } from "./calculator-derived";
import {
  useCalculatorFlooringController,
  useCalculatorWallFinishController,
  useCalculatorWarmFloorController,
} from "./calculator-stage-controllers";
import {
  useCalculatorHeaderLayoutController,
  useCalculatorProjectController,
  useCalculatorRoomController,
  useCalculatorStageController,
} from "./calculator-shell-controller";
import type { CalculatorScreenProps, CalculatorScreenState } from "./calculator-screen-types";

// Оркестратор корневого экрана калькулятора.
// Здесь собираются stage flags, hook-контроллеры и derived totals, а view-слой получает уже готовую структуру.

export function useCalculatorScreenController(props: CalculatorScreenProps): CalculatorScreenState {
  const { activeStage, setActiveStage } = useCalculatorStageController(props.projectDetail);
  const stageFlags = buildCalculatorStageFlags(activeStage);

  const project = useCalculatorProjectController({
    onCreateProject: props.onCreateProject,
  });
  const room = useCalculatorRoomController({
    roomDetail: props.roomDetail,
    onSaveRoom: props.onSaveRoom,
  });
  const headerLayout = useCalculatorHeaderLayoutController();
  const doors = useCalculatorDoorsController({
    projectDetail: props.projectDetail,
    setActiveStage,
    onCreateDoorCatalogItem: props.onCreateDoorCatalogItem,
    onCreateDoorComponentCatalogItem: props.onCreateDoorComponentCatalogItem,
    onCreateProjectDoor: props.onCreateProjectDoor,
    onUpdateProjectDoor: props.onUpdateProjectDoor,
    onCreateProjectDoorComponent: props.onCreateProjectDoorComponent,
    onUpdateProjectDoorComponent: props.onUpdateProjectDoorComponent,
  });
  const warmFloor = useCalculatorWarmFloorController({
    projectDetail: props.projectDetail,
    isWarmFloorStage: stageFlags.isWarmFloorStage,
    onSaveWarmFloor: props.onSaveWarmFloor,
  });
  const flooring = useCalculatorFlooringController({
    projectDetail: props.projectDetail,
    isFlooringStage: stageFlags.isFlooringStage,
    onSaveFlooring: props.onSaveFlooring,
    onCreateFlooringCovering: props.onCreateFlooringCovering,
    onCreateFlooringPreparation: props.onCreateFlooringPreparation,
    onCreateFlooringLayout: props.onCreateFlooringLayout,
  });
  const wallFinish = useCalculatorWallFinishController({
    projectDetail: props.projectDetail,
    isWallFinishStage: stageFlags.isWallFinishStage,
    onSaveWallFinish: props.onSaveWallFinish,
    onCreateWallFinishCovering: props.onCreateWallFinishCovering,
    onCreateWallFinishPreparation: props.onCreateWallFinishPreparation,
    onCreateWallFinishLayout: props.onCreateWallFinishLayout,
  });
  const headerTotals = buildCalculatorHeaderTotals(props.projectDetail, warmFloor.warmFloorPreview, flooring.flooringPreview);

  return {
    activeStage,
    setActiveStage,
    stageFlags,
    headerLayout,
    headerTotals,
    project,
    room,
    doors,
    warmFloor,
    flooring,
    wallFinish,
  };
}

export type CalculatorScreenControllerState = CalculatorScreenState;
