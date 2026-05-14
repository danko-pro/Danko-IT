import type {
  CalculatorFlooringCoveringPayload,
  CalculatorFlooringLayoutPayload,
  CalculatorFlooringPayload,
  CalculatorFlooringPreparationPayload,
  CalculatorProjectDetail,
  CalculatorRoomCreatePayload,
  CalculatorRoomDetail,
  CalculatorRoomPayload,
  CalculatorWallFinishCoveringPayload,
  CalculatorWallFinishLayoutPayload,
  CalculatorWallFinishPayload,
  CalculatorWallFinishPreparationPayload,
  CalculatorWarmFloorPayload,
} from "../model/types";
import type { CalculatorProjectUpdatePayload } from "../project/payload";
import type {
  DoorCatalogPayload as CalculatorDoorCatalogCreatePayload,
  DoorComponentCatalogPayload as CalculatorDoorComponentCatalogCreatePayload,
  ProjectDoorComponentPayload as CalculatorProjectDoorComponentPayload,
  ProjectDoorPayload as CalculatorProjectDoorPayload,
} from "../model/payloads";
import type {
  CeilingCatalogItemPayload,
  CeilingConfigUpdatePayload,
  CeilingRoomsReplacePayload,
  ProjectCeilingItemPayload,
} from "../ceilings/payload";
import type { buildCalculatorHeaderTotals, buildCalculatorStageFlags } from "../model/derived";
import type {
  useCalculatorDoorsController,
  useCalculatorFlooringController,
  useCalculatorWallFinishController,
  useCalculatorWarmFloorController,
} from "../stage/hooks";
import type { useCalculatorProjectController } from "../project/use";
import type { useCalculatorRoomController } from "../room/use";
import type { useCalculatorStageController } from "../stage/use";

export type CalculatorProjectCreatePayload = {
  name: string;
  note: string;
};

// Screen contract for the calculator is split into data/actions so UI blocks do not depend on shell wiring.
export type CalculatorScreenDataProps = {
  projectDetail: CalculatorProjectDetail | null;
  roomDetail: CalculatorRoomDetail | null;
  selectedRoomId: number | null;
  loading: boolean;
  detailLoading: boolean;
  roomLoading: boolean;
  busyKey: string | null;
  error: string | null;
  createPanelOpen: boolean;
};

export type CalculatorScreenActionProps = {
  onReload: () => Promise<void>;
  onCreateProject: (payload: CalculatorProjectCreatePayload) => Promise<void>;
  onCreateProjectPanelOpenChange: (open: boolean) => void;
  onSelectRoom: (roomId: number) => void;
  onSaveProject: (
    projectId: number,
    payload: CalculatorProjectUpdatePayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
  onCreateRoom: (projectId: number, payload?: CalculatorRoomCreatePayload) => Promise<void>;
  onSaveRoom: (roomId: number, payload: CalculatorRoomPayload, options?: { silent?: boolean }) => Promise<void>;
  onDeleteRoom: (roomId: number) => Promise<void>;
  onCreateDoorCatalogItem: (payload: CalculatorDoorCatalogCreatePayload) => Promise<void>;
  onCreateProjectDoor: (
    projectId: number,
    payload: CalculatorProjectDoorPayload,
  ) => Promise<CalculatorProjectDetail | void>;
  onUpdateProjectDoor: (
    doorId: number,
    payload: CalculatorProjectDoorPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
  onDeleteProjectDoor: (doorId: number) => Promise<void>;
  onCreateDoorComponentCatalogItem: (payload: CalculatorDoorComponentCatalogCreatePayload) => Promise<void>;
  onCreateProjectDoorComponent: (doorId: number, payload: CalculatorProjectDoorComponentPayload) => Promise<void>;
  onUpdateProjectDoorComponent: (
    componentId: number,
    payload: CalculatorProjectDoorComponentPayload,
  ) => Promise<void>;
  onDeleteProjectDoorComponent: (componentId: number) => Promise<void>;
  onLoadCeilings: (projectId: number) => Promise<unknown>;
  onSaveCeilingConfig: (projectId: number, payload: CeilingConfigUpdatePayload) => Promise<void>;
  onCreateCeilingCatalogItem: (payload: CeilingCatalogItemPayload) => Promise<unknown>;
  onUpdateCeilingCatalogItem: (itemId: number, payload: Partial<CeilingCatalogItemPayload>) => Promise<unknown>;
  onReplaceCeilingRooms: (projectId: number, payload: CeilingRoomsReplacePayload) => Promise<void>;
  onCreateProjectCeilingItem: (projectId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onUpdateProjectCeilingItem: (itemId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onDeleteProjectCeilingItem: (itemId: number) => Promise<void>;
  onSaveWarmFloor: (
    projectId: number,
    payload: CalculatorWarmFloorPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
  onSaveFlooring: (
    projectId: number,
    payload: CalculatorFlooringPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
  onCreateFlooringCovering: (payload: CalculatorFlooringCoveringPayload) => Promise<void>;
  onCreateFlooringPreparation: (payload: CalculatorFlooringPreparationPayload) => Promise<void>;
  onCreateFlooringLayout: (payload: CalculatorFlooringLayoutPayload) => Promise<void>;
  onSaveWallFinish: (
    projectId: number,
    payload: CalculatorWallFinishPayload,
    options?: { silent?: boolean },
  ) => Promise<void>;
  onCreateWallFinishCovering: (payload: CalculatorWallFinishCoveringPayload) => Promise<void>;
  onCreateWallFinishPreparation: (payload: CalculatorWallFinishPreparationPayload) => Promise<void>;
  onCreateWallFinishLayout: (payload: CalculatorWallFinishLayoutPayload) => Promise<void>;
};

export type CalculatorScreenProps = {
  data: CalculatorScreenDataProps;
  actions: CalculatorScreenActionProps;
};

export type CalculatorScreenState = {
  activeStage: ReturnType<typeof useCalculatorStageController>["activeStage"];
  setActiveStage: ReturnType<typeof useCalculatorStageController>["setActiveStage"];
  stageFlags: ReturnType<typeof buildCalculatorStageFlags>;
  headerTotals: ReturnType<typeof buildCalculatorHeaderTotals>;
  projectDetailView: CalculatorProjectDetail | null;
  warmFloorPreviewView: ReturnType<typeof useCalculatorWarmFloorController>["warmFloorPreview"];
  flooringDetailView: ReturnType<typeof useCalculatorFlooringController>["flooringDetail"];
  flooringPreviewView: ReturnType<typeof useCalculatorFlooringController>["flooringPreview"];
  wallFinishDetailView: ReturnType<typeof useCalculatorWallFinishController>["wallFinishDetail"];
  wallFinishPreviewView: ReturnType<typeof useCalculatorWallFinishController>["wallFinishPreview"];
  project: ReturnType<typeof useCalculatorProjectController>;
  room: ReturnType<typeof useCalculatorRoomController>;
  doors: ReturnType<typeof useCalculatorDoorsController>;
  warmFloor: ReturnType<typeof useCalculatorWarmFloorController>;
  flooring: ReturnType<typeof useCalculatorFlooringController>;
  wallFinish: ReturnType<typeof useCalculatorWallFinishController>;
};
