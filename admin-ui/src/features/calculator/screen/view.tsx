import { useEffect, useRef, type ReactNode } from "react";

import { CalculatorEstimateStagesFacade } from "./stages";
import { CalculatorHeaderSection } from "./header";
import type { CalculatorStage } from "../model/types";
import { CalculatorProjectRoomsStage } from "../project/flow";
import type { CalculatorScreenProps, CalculatorScreenState } from "./types";
import { useCalculatorSceneHeight } from "../stage/use-scene-height";

const CALCULATOR_STAGE_ORDER: CalculatorStage[] = [
  "project",
  "rooms",
  "warmfloor",
  "flooring",
  "wallfinish",
  "ceilings",
  "doors",
];

function getStageDirection(stage: CalculatorStage, previousStage: CalculatorStage): "forward" | "backward" {
  return CALCULATOR_STAGE_ORDER.indexOf(stage) >= CALCULATOR_STAGE_ORDER.indexOf(previousStage) ? "forward" : "backward";
}

// View-СЃР»РѕР№ РєРѕСЂРЅРµРІРѕРіРѕ СЌРєСЂР°РЅР° РєР°Р»СЊРєСѓР»СЏС‚РѕСЂР°.
// РљРѕРјРїРѕРЅРµРЅС‚ РїРѕР»СѓС‡Р°РµС‚ СѓР¶Рµ СЃРѕР±СЂР°РЅРЅС‹Р№ controller state Рё С‚РѕР»СЊРєРѕ СЂР°СЃРєР»Р°РґС‹РІР°РµС‚ stage-СЃРµРєС†РёРё РїРѕ РјРµСЃС‚Сѓ.
export function CalculatorScreenContent(props: {
  props: CalculatorScreenProps;
  state: CalculatorScreenState;
}) {
  const { data, actions } = props.props;
  const {
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
  } = props.state;
  const previousStageRef = useRef(activeStage);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const previousStage = previousStageRef.current;
  const stageDirection = getStageDirection(activeStage, previousStage);
  const sceneHeightState = useCalculatorSceneHeight(activeStage, sceneRef);

  useEffect(() => {
    previousStageRef.current = activeStage;
  }, [activeStage]);

  const projectRoomsStageProps = {
    projectStage: { error: data.error },
    roomsSidebar: {
      projectDetail: projectDetailView,
      selectedRoomId: data.selectedRoomId,
      busyKey: data.busyKey,
      onCreateRoom: actions.onCreateRoom,
      onDeleteRoom: actions.onDeleteRoom,
      onSelectRoom: actions.onSelectRoom,
    },
    roomsEditor: {
      roomDetail: room.roomPreviewDetail ?? data.roomDetail,
      roomLoading: data.roomLoading,
      detailLoading: data.detailLoading,
      roomState: room.roomState,
      setRoomState: room.setRoomState,
      autosaveState: room.autosaveState,
      busyKey: data.busyKey,
    },
  } as const;

  const estimateStageProps = {
    data: {
      projectDetail: projectDetailView,
      busyKey: data.busyKey,
    },
    actions: {
      onDeleteProjectDoor: actions.onDeleteProjectDoor,
      onDeleteProjectDoorComponent: actions.onDeleteProjectDoorComponent,
    },
    stageFlags,
    doors,
    warmFloor: { ...warmFloor, warmFloorPreview: warmFloorPreviewView },
    flooring: { ...flooring, flooringDetail: flooringDetailView, flooringPreview: flooringPreviewView },
    wallFinish: {
      ...wallFinish,
      wallFinishDetail: wallFinishDetailView,
      wallFinishPreview: wallFinishPreviewView,
    },
  } as const;

  let stageNode: ReactNode;

  if (stageFlags.isProjectStage) {
    stageNode = <CalculatorProjectRoomsStage {...projectRoomsStageProps} isProjectStage={true} isRoomsStage={false} />;
  } else if (stageFlags.isRoomsStage) {
    stageNode = <CalculatorProjectRoomsStage {...projectRoomsStageProps} isProjectStage={false} isRoomsStage={true} />;
  } else if (stageFlags.isWarmFloorStage) {
    stageNode = <CalculatorEstimateStagesFacade {...estimateStageProps} forcedStage="warmfloor" />;
  } else if (stageFlags.isFlooringStage) {
    stageNode = <CalculatorEstimateStagesFacade {...estimateStageProps} forcedStage="flooring" />;
  } else if (stageFlags.isWallFinishStage) {
    stageNode = <CalculatorEstimateStagesFacade {...estimateStageProps} forcedStage="wallfinish" />;
  } else if (stageFlags.isCeilingsStage) {
    stageNode = <CalculatorEstimateStagesFacade {...estimateStageProps} forcedStage="ceilings" />;
  } else {
    stageNode = <CalculatorEstimateStagesFacade {...estimateStageProps} forcedStage="doors" />;
  }

  return (
    <div className="space-y-4">
      <CalculatorHeaderSection
        projectDetail={projectDetailView}
        headerFlooringWorkTotal={headerTotals.flooringWorkTotal}
        headerFlooringMaterialTotal={headerTotals.flooringMaterialTotal}
        headerWarmFloorWorkTotal={headerTotals.warmFloorWorkTotal}
        headerWarmFloorMaterialTotal={headerTotals.warmFloorMaterialTotal}
        headerWallFinishWorkTotal={headerTotals.wallFinishWorkTotal}
        headerWallFinishMaterialTotal={headerTotals.wallFinishMaterialTotal}
        projectForm={project}
        onReload={actions.onReload}
        activeStage={activeStage}
        setActiveStage={setActiveStage}
      />

      <div
        className="calculator-scene-stage"
        data-height-motion={sceneHeightState.motion}
        style={sceneHeightState.height ? { height: `${sceneHeightState.height}px` } : undefined}
      >
        <div
          key={activeStage}
          ref={sceneRef}
          className={`calculator-scene calculator-scene-active calculator-scene-enter-${stageDirection}`}
        >
          {stageNode}
        </div>
      </div>
    </div>
  );
}
