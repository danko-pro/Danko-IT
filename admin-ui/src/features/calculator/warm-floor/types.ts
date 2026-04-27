import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { CalculatorProjectDetail, CalculatorWarmFloorDetail, WarmFloorEditState } from "./";

// Stage contract lives outside the view so warm-floor shell and room cards reuse one stable type.
export type WarmFloorRoomEdit = WarmFloorEditState["rooms"][number];

export type WarmFloorStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  warmFloorPreview: CalculatorWarmFloorDetail | null;
  warmFloorSettingsOpen: boolean;
  setWarmFloorSettingsOpen: Dispatch<SetStateAction<boolean>>;
  handleWarmFloorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  warmFloorRoomStateById: Map<number, WarmFloorRoomEdit>;
  expandedWarmFloorRoomId: number | null;
  setExpandedWarmFloorRoomId: Dispatch<SetStateAction<number | null>>;
  setWarmFloorState: Dispatch<SetStateAction<WarmFloorEditState>>;
  warmFloorState: WarmFloorEditState;
  busyKey: string | null;
  resetWarmFloorState: () => void;
};

export type WarmFloorStageReadyProps = Omit<WarmFloorStageSectionProps, "projectDetail" | "warmFloorPreview"> & {
  projectDetail: CalculatorProjectDetail;
  warmFloorPreview: CalculatorWarmFloorDetail;
};
