import type { Dispatch, SetStateAction } from "react";

import type { CalculatorProjectDetail, CalculatorWarmFloorDetail, WarmFloorEditState } from "./";

// Stage contract lives outside the view so warm-floor shell and room cards reuse one stable type.
export type WarmFloorRoomEdit = WarmFloorEditState["rooms"][number];
export type WarmFloorAutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

export type WarmFloorStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  warmFloorPreview: CalculatorWarmFloorDetail | null;
  warmFloorSettingsOpen: boolean;
  setWarmFloorSettingsOpen: Dispatch<SetStateAction<boolean>>;
  warmFloorRoomStateById: Map<number, WarmFloorRoomEdit>;
  expandedWarmFloorRoomId: number | null;
  setExpandedWarmFloorRoomId: Dispatch<SetStateAction<number | null>>;
  setWarmFloorState: Dispatch<SetStateAction<WarmFloorEditState>>;
  warmFloorState: WarmFloorEditState;
  autosaveState: WarmFloorAutosaveState;
  resetWarmFloorState: () => void;
};

export type WarmFloorStageReadyProps = Omit<WarmFloorStageSectionProps, "projectDetail" | "warmFloorPreview"> & {
  projectDetail: CalculatorProjectDetail;
  warmFloorPreview: CalculatorWarmFloorDetail;
};
