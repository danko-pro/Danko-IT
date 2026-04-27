import type { Dispatch, SetStateAction } from "react";

import type {
  CalculatorProjectDetail,
  CalculatorWallFinishCovering,
  CalculatorWallFinishDetail,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishRoom,
  WallFinishCoveringCreateState,
  WallFinishEditState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
} from "./";

// Общие типы stage-блока вынесены отдельно, чтобы shell, editor и summary
// не зависели друг от друга по кругу.
export type WallFinishRoomEdit = WallFinishEditState["rooms"][number];

export type WallFinishTechRoom = {
  room: CalculatorWallFinishRoom;
  covering: CalculatorWallFinishCovering | null;
  preparation: CalculatorWallFinishPreparation | null;
  layout: CalculatorWallFinishLayout | null;
};

export type WallFinishStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  wallFinishDetail: CalculatorWallFinishDetail | null;
  wallFinishPreview: CalculatorWallFinishDetail | null;
  wallFinishSettingsOpen: boolean;
  setWallFinishSettingsOpen: Dispatch<SetStateAction<boolean>>;
  wallFinishRoomStateById: Map<number, WallFinishRoomEdit>;
  expandedWallFinishRoomId: number | null;
  setExpandedWallFinishRoomId: Dispatch<SetStateAction<number | null>>;
  setWallFinishState: Dispatch<SetStateAction<WallFinishEditState>>;
  wallFinishState: WallFinishEditState;
  wallFinishCoveringState: WallFinishCoveringCreateState;
  setWallFinishCoveringState: Dispatch<SetStateAction<WallFinishCoveringCreateState>>;
  wallFinishPreparationState: WallFinishPreparationCreateState;
  setWallFinishPreparationState: Dispatch<SetStateAction<WallFinishPreparationCreateState>>;
  wallFinishLayoutState: WallFinishLayoutCreateState;
  setWallFinishLayoutState: Dispatch<SetStateAction<WallFinishLayoutCreateState>>;
  wallFinishCoveringById: Map<number, CalculatorWallFinishCovering>;
  wallFinishPreparationById: Map<number, CalculatorWallFinishPreparation>;
  wallFinishLayoutById: Map<number, CalculatorWallFinishLayout>;
  wallFinishSelectedTechRooms: WallFinishTechRoom[];
  busyKey: string | null;
  submitWallFinish: () => Promise<void> | void;
  submitWallFinishCovering: () => Promise<void> | void;
  submitWallFinishPreparation: () => Promise<void> | void;
  submitWallFinishLayout: () => Promise<void> | void;
  resetWallFinishState: () => void;
};

export type WallFinishStageReadyProps = Omit<
  WallFinishStageSectionProps,
  "projectDetail" | "wallFinishDetail" | "wallFinishPreview"
> & {
  projectDetail: CalculatorProjectDetail;
  wallFinishDetail: CalculatorWallFinishDetail;
  wallFinishPreview: CalculatorWallFinishDetail;
};
