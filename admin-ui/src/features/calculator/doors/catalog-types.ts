import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  CalculatorProjectDetail,
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorAutosaveState,
  ProjectDoorCreateState,
} from "./";

// Общий контракт catalog-блока дверного stage.
// Нужен, чтобы верхний контейнер и отдельные панели редактирования не тянули типы друг через друга.
export type DoorsCatalogPanelProps = {
  projectDetail: CalculatorProjectDetail;
  doorCatalogState: DoorCatalogCreateState;
  setDoorCatalogState: Dispatch<SetStateAction<DoorCatalogCreateState>>;
  doorComponentCatalogState: DoorComponentCatalogCreateState;
  setDoorComponentCatalogState: Dispatch<SetStateAction<DoorComponentCatalogCreateState>>;
  projectDoorState: ProjectDoorCreateState;
  setProjectDoorState: Dispatch<SetStateAction<ProjectDoorCreateState>>;
  projectDoorAutosaveState: ProjectDoorAutosaveState;
  editingDoorId: number | null;
  busyKey: string | null;
  handleDoorCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleDoorComponentCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleProjectDoorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  resetDoorForm: () => void;
};
