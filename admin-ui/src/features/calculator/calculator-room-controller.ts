import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useState } from "react";

import { buildRoomPayload } from "./calculator-payloads";
import { emptyRoomState } from "./calculator-state";
import { trimFloat } from "./calculator-shared";
import type { CalculatorRoomDetail, CalculatorRoomPayload, RoomEditState } from "./calculator-types";

type UseCalculatorRoomControllerParams = {
  roomDetail: CalculatorRoomDetail | null;
  onSaveRoom: (roomId: number, payload: CalculatorRoomPayload) => Promise<void>;
};

type UseCalculatorRoomControllerResult = {
  roomState: RoomEditState;
  setRoomState: Dispatch<SetStateAction<RoomEditState>>;
  handleRoomSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

// Контроллер формы комнаты калькулятора.
// Он строит локальный draft из room detail и отправляет нормализованный payload через общий builder.

function buildRoomEditState(roomDetail: CalculatorRoomDetail | null): RoomEditState {
  if (!roomDetail) {
    return emptyRoomState;
  }

  return {
    name: roomDetail.room.name,
    ceiling_height_m: trimFloat(roomDetail.room.ceiling_height_m),
    manual_floor_area_m2:
      roomDetail.room.manual_floor_area_m2 === null ? "" : trimFloat(roomDetail.room.manual_floor_area_m2),
    auto_perimeter_calc: roomDetail.room.auto_perimeter_calc,
    perimeter_factor: trimFloat(roomDetail.room.perimeter_factor),
    note: roomDetail.room.note ?? "",
    walls_m: roomDetail.walls.length ? roomDetail.walls.map((wall) => trimFloat(wall.length_m)) : ["", "", "", ""],
    floor_sections: roomDetail.floor_sections.length
      ? roomDetail.floor_sections.map((section) => ({
          length_m: trimFloat(section.length_m),
          width_m: trimFloat(section.width_m),
        }))
      : [{ length_m: "", width_m: "" }],
    openings: roomDetail.openings.length
      ? roomDetail.openings.map((opening) => ({
          opening_type: opening.opening_type,
          width_m: opening.width_m === null ? "" : trimFloat(opening.width_m),
          height_m: opening.height_m === null ? "" : trimFloat(opening.height_m),
          quantity: trimFloat(opening.quantity),
          area_m2: opening.area_m2 === null ? "" : trimFloat(opening.area_m2),
          note: opening.note ?? "",
        }))
      : [{ opening_type: "window", width_m: "", height_m: "", quantity: "1", area_m2: "", note: "" }],
  };
}

export function useCalculatorRoomController(
  params: UseCalculatorRoomControllerParams,
): UseCalculatorRoomControllerResult {
  const { roomDetail, onSaveRoom } = params;
  const [roomState, setRoomState] = useState<RoomEditState>(emptyRoomState);

  useEffect(() => {
    setRoomState(buildRoomEditState(roomDetail));
  }, [roomDetail]);

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomDetail) {
      return;
    }
    await onSaveRoom(roomDetail.room.id, buildRoomPayload(roomState));
  }

  return {
    roomState,
    setRoomState,
    handleRoomSubmit,
  };
}
