import type { Dispatch, SetStateAction } from "react";

import type { CalculatorProjectDetail } from "../project/model";
import type { CalculatorRoomCreatePayload, CalculatorRoomDetail, RoomEditState } from "../room/model";
import type { RoomAutosaveState } from "../room/use";

// Общие контракты room stage.
// Здесь собраны props editor/sidebar и общий setter draft-состояния комнаты.

export type RoomStateSetter = Dispatch<SetStateAction<RoomEditState>>;

export type RoomsStageSidebarSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  selectedRoomId: number | null;
  roomSelectionToken: number;
  busyKey: string | null;
  onCreateRoom: (projectId: number, payload?: CalculatorRoomCreatePayload) => Promise<void> | void;
  onDeleteRoom: (roomId: number) => Promise<void> | void;
  onSelectRoom: (roomId: number) => void;
  onActiveRoomAnchorChange: (anchorTop: number | null) => void;
};

export type RoomsCreatePanelProps = {
  projectId: number;
  roomSelectionToken: number;
  busyKey: string | null;
  onCreateRoom: (projectId: number, payload?: CalculatorRoomCreatePayload) => Promise<void> | void;
};

export type RoomsCreateState = {
  name: string;
  ceilingHeight: string;
  autoPerimeterCalc: boolean;
  error: string | null;
};

export type RoomsStageEditorSectionProps = {
  roomDetail: CalculatorRoomDetail | null;
  roomLoading: boolean;
  detailLoading: boolean;
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
  autosaveState: RoomAutosaveState;
  busyKey: string | null;
  collapsed: boolean;
  selectedRoomAnchorTop: number | null;
};
