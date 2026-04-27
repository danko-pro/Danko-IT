import { RoomFloorSectionsPanel } from "../room/floors";
import type { CalculatorRoomDetail, RoomEditState } from "../room/model";
import { RoomOpeningsPanel } from "../room/openings";
import { RoomStatsSummary } from "../room/stats";
import { RoomWallsPanel } from "../room/walls";
import { RoomsEditorPrimary } from "./primary";
import type { RoomStateSetter } from "./types";

type RoomsEditorFormProps = {
  roomDetail: CalculatorRoomDetail;
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

export function RoomsEditorForm(props: RoomsEditorFormProps) {
  const { roomDetail, roomState, setRoomState } = props;

  return (
    <div className="calculator-room-editor-form">
      <RoomsEditorPrimary roomState={roomState} setRoomState={setRoomState} />

      <RoomStatsSummary roomDetail={roomDetail} />
      <RoomWallsPanel roomState={roomState} setRoomState={setRoomState} />
      <RoomFloorSectionsPanel roomState={roomState} setRoomState={setRoomState} />
      <RoomOpeningsPanel roomState={roomState} setRoomState={setRoomState} />
    </div>
  );
}
