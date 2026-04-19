import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  CalculatorDoorSpecItem,
  CalculatorDoorsSummary,
  CalculatorProjectDetail,
  CalculatorProjectDoor,
  CalculatorProjectDoorComponent,
  ProjectDoorComponentState,
} from "./calculator-types";

// Общие контракты project-блока дверного stage.
// Здесь собраны props для списка дверей, сводки и редактора комплектующих.

export type DoorsProjectPanelProps = {
  projectDetail: CalculatorProjectDetail;
  projectDoorComponentState: ProjectDoorComponentState;
  setProjectDoorComponentState: Dispatch<SetStateAction<ProjectDoorComponentState>>;
  selectedDoorId: number | null;
  setSelectedDoorId: Dispatch<SetStateAction<number | null>>;
  editingDoorComponentId: number | null;
  selectedDoor: CalculatorProjectDoor | null;
  doorsStageSummary: CalculatorDoorsSummary;
  doorsStageSpecification: CalculatorDoorSpecItem[];
  busyKey: string | null;
  handleProjectDoorComponentSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  startDoorEdit: (door: CalculatorProjectDoor) => void;
  startDoorComponentEdit: (component: CalculatorProjectDoorComponent) => void;
  resetDoorComponentForm: () => void;
  onDeleteProjectDoor: (doorId: number) => Promise<void> | void;
  onDeleteProjectDoorComponent: (componentId: number) => Promise<void> | void;
};

export type DoorsProjectComponentsPanelProps = Pick<
  DoorsProjectPanelProps,
  | "projectDetail"
  | "projectDoorComponentState"
  | "setProjectDoorComponentState"
  | "editingDoorComponentId"
  | "selectedDoor"
  | "busyKey"
  | "handleProjectDoorComponentSubmit"
  | "startDoorComponentEdit"
  | "resetDoorComponentForm"
  | "onDeleteProjectDoorComponent"
>;

export type DoorsProjectComponentsReadyProps = Omit<DoorsProjectComponentsPanelProps, "selectedDoor"> & {
  selectedDoor: CalculatorProjectDoor;
};
