import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { CalculatorStage } from "../model/core";
import type { CalculatorProjectDetail } from "../project/model";
import type {
  CalculatorDoorSpecItem,
  CalculatorDoorsSummary,
  CalculatorProjectDoor,
  CalculatorProjectDoorComponent,
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorAutosaveState,
  ProjectDoorComponentState,
  ProjectDoorCreateState,
} from "./model";
import type {
  DoorCatalogPayload,
  DoorComponentCatalogPayload,
  ProjectDoorComponentPayload,
  ProjectDoorPayload,
} from "./payload";

export type UseCalculatorDoorsControllerParams = {
  projectDetail: CalculatorProjectDetail | null;
  isDoorsStage: boolean;
  setActiveStage: Dispatch<SetStateAction<CalculatorStage>>;
  onCreateDoorCatalogItem: (payload: DoorCatalogPayload) => Promise<void>;
  onCreateDoorComponentCatalogItem: (payload: DoorComponentCatalogPayload) => Promise<void>;
  onCreateProjectDoor: (projectId: number, payload: ProjectDoorPayload) => Promise<CalculatorProjectDetail | void>;
  onUpdateProjectDoor: (doorId: number, payload: ProjectDoorPayload, options?: { silent?: boolean }) => Promise<void>;
  onCreateProjectDoorComponent: (doorId: number, payload: ProjectDoorComponentPayload) => Promise<void>;
  onUpdateProjectDoorComponent: (componentId: number, payload: ProjectDoorComponentPayload) => Promise<void>;
};

export type UseCalculatorDoorsControllerResult = {
  doorCatalogState: DoorCatalogCreateState;
  setDoorCatalogState: Dispatch<SetStateAction<DoorCatalogCreateState>>;
  doorComponentCatalogState: DoorComponentCatalogCreateState;
  setDoorComponentCatalogState: Dispatch<SetStateAction<DoorComponentCatalogCreateState>>;
  projectDoorState: ProjectDoorCreateState;
  setProjectDoorState: Dispatch<SetStateAction<ProjectDoorCreateState>>;
  projectDoorAutosaveState: ProjectDoorAutosaveState;
  projectDoorComponentState: ProjectDoorComponentState;
  setProjectDoorComponentState: Dispatch<SetStateAction<ProjectDoorComponentState>>;
  editingDoorId: number | null;
  selectedDoorId: number | null;
  setSelectedDoorId: Dispatch<SetStateAction<number | null>>;
  editingDoorComponentId: number | null;
  selectedDoor: CalculatorProjectDoor | null;
  doorsStageSummary: CalculatorDoorsSummary;
  doorsStageSpecification: CalculatorDoorSpecItem[];
  handleDoorCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDoorComponentCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleProjectDoorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createBlankProjectDoor: () => Promise<void>;
  duplicateSelectedProjectDoor: () => Promise<void>;
  handleProjectDoorComponentSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  startDoorEdit: (door: CalculatorProjectDoor) => void;
  closeDoorEditor: () => void;
  resetDoorForm: () => void;
  startDoorComponentEdit: (component: CalculatorProjectDoorComponent) => void;
  resetDoorComponentForm: () => void;
};
