import type { Dispatch, SetStateAction } from "react";

import type {
  CalculatorFlooringCovering,
  CalculatorFlooringDetail,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  CalculatorFlooringRoom,
  CalculatorProjectDetail,
  FlooringCoveringCreateState,
  FlooringEditState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
} from "./";

// Общие типы stage-блока вынесены отдельно, чтобы shell, editor и summary
// не зависели друг от друга по кругу.
export type FlooringRoomEdit = FlooringEditState["rooms"][number];
export type FlooringAutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

export type FlooringTechRoom = {
  room: CalculatorFlooringRoom;
  covering: CalculatorFlooringCovering | null;
  preparation: CalculatorFlooringPreparation | null;
  layout: CalculatorFlooringLayout | null;
};

export type FlooringStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  flooringDetail: CalculatorFlooringDetail | null;
  flooringPreview: CalculatorFlooringDetail | null;
  flooringSettingsOpen: boolean;
  setFlooringSettingsOpen: Dispatch<SetStateAction<boolean>>;
  flooringRoomStateById: Map<number, FlooringRoomEdit>;
  expandedFlooringRoomId: number | null;
  setExpandedFlooringRoomId: Dispatch<SetStateAction<number | null>>;
  setFlooringState: Dispatch<SetStateAction<FlooringEditState>>;
  flooringState: FlooringEditState;
  flooringCoveringState: FlooringCoveringCreateState;
  setFlooringCoveringState: Dispatch<SetStateAction<FlooringCoveringCreateState>>;
  flooringPreparationState: FlooringPreparationCreateState;
  setFlooringPreparationState: Dispatch<SetStateAction<FlooringPreparationCreateState>>;
  flooringLayoutState: FlooringLayoutCreateState;
  setFlooringLayoutState: Dispatch<SetStateAction<FlooringLayoutCreateState>>;
  flooringCoveringById: Map<number, CalculatorFlooringCovering>;
  flooringPreparationById: Map<number, CalculatorFlooringPreparation>;
  flooringLayoutById: Map<number, CalculatorFlooringLayout>;
  flooringSelectedTechRooms: FlooringTechRoom[];
  autosaveState: FlooringAutosaveState;
  busyKey: string | null;
  submitFlooring: () => Promise<void> | void;
  submitFlooringCovering: () => Promise<void> | void;
  submitFlooringPreparation: () => Promise<void> | void;
  submitFlooringLayout: () => Promise<void> | void;
  resetFlooringState: () => void;
};

export type FlooringStageReadyProps = Omit<
  FlooringStageSectionProps,
  "projectDetail" | "flooringDetail" | "flooringPreview"
> & {
  projectDetail: CalculatorProjectDetail;
  flooringDetail: CalculatorFlooringDetail;
  flooringPreview: CalculatorFlooringDetail;
};
