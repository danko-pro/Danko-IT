import type {
  CalculatorFlooringCoveringPayload,
  CalculatorFlooringLayoutPayload,
  CalculatorFlooringPayload,
  CalculatorFlooringPreparationPayload,
  CalculatorProject,
  CalculatorProjectDetail,
  CalculatorRoomDetail,
  CalculatorRoomPayload,
  CalculatorWallFinishCoveringPayload,
  CalculatorWallFinishLayoutPayload,
  CalculatorWallFinishPayload,
  CalculatorWallFinishPreparationPayload,
  CalculatorWarmFloorPayload,
} from "./calculator-types";
import type {
  DoorCatalogPayload as CalculatorDoorCatalogCreatePayload,
  DoorComponentCatalogPayload as CalculatorDoorComponentCatalogCreatePayload,
  ProjectDoorComponentPayload as CalculatorProjectDoorComponentPayload,
  ProjectDoorPayload as CalculatorProjectDoorPayload,
} from "./calculator-door-payloads";
import type { buildCalculatorHeaderTotals, buildCalculatorStageFlags } from "./calculator-derived";
import type { useCalculatorDoorsController } from "./calculator-doors-controller";
import type { useCalculatorFlooringController } from "./calculator-flooring-controller";
import type { useCalculatorHeaderLayoutController } from "./calculator-header-layout-controller";
import type { useCalculatorProjectController } from "./calculator-project-controller";
import type { useCalculatorRoomController } from "./calculator-room-controller";
import type { useCalculatorStageController } from "./calculator-stage-controller";
import type { useCalculatorWallFinishController } from "./calculator-wall-finish-controller";
import type { useCalculatorWarmFloorController } from "./calculator-warm-floor-controller";

// Контракт корневого экрана калькулятора.
// Здесь собраны только входные данные и callbacks, чтобы screen-компонент не хранил этот большой inline-тип.

export type CalculatorProjectCreatePayload = {
  name: string;
  note: string;
};

export type CalculatorScreenProps = {
  projects: CalculatorProject[];
  projectDetail: CalculatorProjectDetail | null;
  roomDetail: CalculatorRoomDetail | null;
  selectedProjectId: number | null;
  selectedRoomId: number | null;
  loading: boolean;
  detailLoading: boolean;
  roomLoading: boolean;
  busyKey: string | null;
  error: string | null;
  onReload: () => Promise<void>;
  onSelectProject: (projectId: number) => void;
  onSelectRoom: (roomId: number) => void;
  onCreateProject: (payload: CalculatorProjectCreatePayload) => Promise<void>;
  onCreateRoom: (projectId: number) => Promise<void>;
  onSaveRoom: (roomId: number, payload: CalculatorRoomPayload) => Promise<void>;
  onDeleteRoom: (roomId: number) => Promise<void>;
  onCreateDoorCatalogItem: (payload: CalculatorDoorCatalogCreatePayload) => Promise<void>;
  onCreateProjectDoor: (projectId: number, payload: CalculatorProjectDoorPayload) => Promise<void>;
  onUpdateProjectDoor: (doorId: number, payload: CalculatorProjectDoorPayload) => Promise<void>;
  onDeleteProjectDoor: (doorId: number) => Promise<void>;
  onCreateDoorComponentCatalogItem: (payload: CalculatorDoorComponentCatalogCreatePayload) => Promise<void>;
  onCreateProjectDoorComponent: (doorId: number, payload: CalculatorProjectDoorComponentPayload) => Promise<void>;
  onUpdateProjectDoorComponent: (
    componentId: number,
    payload: CalculatorProjectDoorComponentPayload,
  ) => Promise<void>;
  onDeleteProjectDoorComponent: (componentId: number) => Promise<void>;
  onSaveWarmFloor: (projectId: number, payload: CalculatorWarmFloorPayload) => Promise<void>;
  onSaveFlooring: (projectId: number, payload: CalculatorFlooringPayload) => Promise<void>;
  onCreateFlooringCovering: (payload: CalculatorFlooringCoveringPayload) => Promise<void>;
  onCreateFlooringPreparation: (payload: CalculatorFlooringPreparationPayload) => Promise<void>;
  onCreateFlooringLayout: (payload: CalculatorFlooringLayoutPayload) => Promise<void>;
  onSaveWallFinish: (projectId: number, payload: CalculatorWallFinishPayload) => Promise<void>;
  onCreateWallFinishCovering: (payload: CalculatorWallFinishCoveringPayload) => Promise<void>;
  onCreateWallFinishPreparation: (payload: CalculatorWallFinishPreparationPayload) => Promise<void>;
  onCreateWallFinishLayout: (payload: CalculatorWallFinishLayoutPayload) => Promise<void>;
};

export type CalculatorScreenState = {
  activeStage: ReturnType<typeof useCalculatorStageController>["activeStage"];
  setActiveStage: ReturnType<typeof useCalculatorStageController>["setActiveStage"];
  stageFlags: ReturnType<typeof buildCalculatorStageFlags>;
  headerLayout: ReturnType<typeof useCalculatorHeaderLayoutController>;
  headerTotals: ReturnType<typeof buildCalculatorHeaderTotals>;
  project: ReturnType<typeof useCalculatorProjectController>;
  room: ReturnType<typeof useCalculatorRoomController>;
  doors: ReturnType<typeof useCalculatorDoorsController>;
  warmFloor: ReturnType<typeof useCalculatorWarmFloorController>;
  flooring: ReturnType<typeof useCalculatorFlooringController>;
  wallFinish: ReturnType<typeof useCalculatorWallFinishController>;
};
