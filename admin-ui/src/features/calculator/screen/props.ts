import type { AdminAppController } from "../../../shell/controller";
import type { CalculatorScreenProps } from "./types";

export type CalculatorScreenControllerSlice = Pick<
  AdminAppController,
  | "calculatorProjectDetail"
  | "calculatorRoomDetail"
  | "selectedCalculatorRoomId"
  | "calculatorProjectLoading"
  | "calculatorRoomLoading"
  | "calculatorBusyKey"
  | "calculatorError"
  | "loadCalculatorProjects"
  | "setSelectedCalculatorRoomId"
  | "handleSaveCalculatorProject"
  | "handleCreateCalculatorRoom"
  | "handleSaveCalculatorRoom"
  | "handleDeleteCalculatorRoom"
  | "handleCreateCalculatorDoorCatalogItem"
  | "handleCreateCalculatorDoorComponentCatalogItem"
  | "handleCreateCalculatorProjectDoor"
  | "handleUpdateCalculatorProjectDoor"
  | "handleDeleteCalculatorProjectDoor"
  | "handleCreateCalculatorProjectDoorComponent"
  | "handleUpdateCalculatorProjectDoorComponent"
  | "handleDeleteCalculatorProjectDoorComponent"
  | "handleSaveCalculatorWarmFloor"
  | "handleSaveCalculatorFlooring"
  | "handleCreateCalculatorFlooringCovering"
  | "handleCreateCalculatorFlooringPreparation"
  | "handleCreateCalculatorFlooringLayout"
  | "handleSaveCalculatorWallFinish"
  | "handleCreateCalculatorWallFinishCovering"
  | "handleCreateCalculatorWallFinishPreparation"
  | "handleCreateCalculatorWallFinishLayout"
>;

// Adapter between the shell controller and the calculator screen contract.
// The router only forwards the data that the calculator screen actually consumes.
export function buildCalculatorScreenProps(controller: CalculatorScreenControllerSlice): CalculatorScreenProps {
  return {
    data: {
      projectDetail: controller.calculatorProjectDetail,
      roomDetail: controller.calculatorRoomDetail,
      selectedRoomId: controller.selectedCalculatorRoomId,
      detailLoading: controller.calculatorProjectLoading,
      roomLoading: controller.calculatorRoomLoading,
      busyKey: controller.calculatorBusyKey,
      error: controller.calculatorError,
    },
    actions: {
      onReload: controller.loadCalculatorProjects,
      onSelectRoom: controller.setSelectedCalculatorRoomId,
      onSaveProject: controller.handleSaveCalculatorProject,
      onCreateRoom: controller.handleCreateCalculatorRoom,
      onSaveRoom: controller.handleSaveCalculatorRoom,
      onDeleteRoom: controller.handleDeleteCalculatorRoom,
      onCreateDoorCatalogItem: controller.handleCreateCalculatorDoorCatalogItem,
      onCreateProjectDoor: controller.handleCreateCalculatorProjectDoor,
      onUpdateProjectDoor: controller.handleUpdateCalculatorProjectDoor,
      onDeleteProjectDoor: controller.handleDeleteCalculatorProjectDoor,
      onCreateDoorComponentCatalogItem: controller.handleCreateCalculatorDoorComponentCatalogItem,
      onCreateProjectDoorComponent: controller.handleCreateCalculatorProjectDoorComponent,
      onUpdateProjectDoorComponent: controller.handleUpdateCalculatorProjectDoorComponent,
      onDeleteProjectDoorComponent: controller.handleDeleteCalculatorProjectDoorComponent,
      onSaveWarmFloor: controller.handleSaveCalculatorWarmFloor,
      onSaveFlooring: controller.handleSaveCalculatorFlooring,
      onCreateFlooringCovering: controller.handleCreateCalculatorFlooringCovering,
      onCreateFlooringPreparation: controller.handleCreateCalculatorFlooringPreparation,
      onCreateFlooringLayout: controller.handleCreateCalculatorFlooringLayout,
      onSaveWallFinish: controller.handleSaveCalculatorWallFinish,
      onCreateWallFinishCovering: controller.handleCreateCalculatorWallFinishCovering,
      onCreateWallFinishPreparation: controller.handleCreateCalculatorWallFinishPreparation,
      onCreateWallFinishLayout: controller.handleCreateCalculatorWallFinishLayout,
    },
  };
}
