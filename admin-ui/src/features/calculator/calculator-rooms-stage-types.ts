import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { CalculatorProjectDetail, CalculatorRoomDetail, RoomEditState } from "./calculator-types";

// Общие контракты room stage.
// Здесь собраны props editor/sidebar и общий setter draft-состояния комнаты.

export type RoomStateSetter = Dispatch<SetStateAction<RoomEditState>>;

export type RoomsStageSidebarSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  selectedRoomId: number | null;
  busyKey: string | null;
  onCreateRoom: (projectId: number) => Promise<void> | void;
  onSelectRoom: (roomId: number) => void;
};

export type RoomsStageEditorSectionProps = {
  roomDetail: CalculatorRoomDetail | null;
  roomLoading: boolean;
  detailLoading: boolean;
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
  busyKey: string | null;
  handleRoomSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  onDeleteRoom: (roomId: number) => Promise<void> | void;
};
