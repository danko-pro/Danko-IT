import { toNumber } from "../shared";
import type { CalculatorRoomPayload, RoomEditState } from "./model";

// Сборка transport-payload для комнаты.
// Модуль изолирует нормализацию room state перед отправкой на backend.

export function buildRoomPayload(state: RoomEditState): CalculatorRoomPayload {
  return {
    name: state.name.trim(),
    ceiling_height_m: toNumber(state.ceiling_height_m) ?? 2.7,
    manual_floor_area_m2: toNumber(state.manual_floor_area_m2),
    auto_perimeter_calc: state.auto_perimeter_calc,
    perimeter_factor: toNumber(state.perimeter_factor) ?? 1.15,
    note: state.note.trim() || null,
    walls_m: state.walls_m.map(toNumber).filter((value): value is number => value !== null),
    floor_sections: state.floor_sections.map((section) => ({
      length_m: toNumber(section.length_m),
      width_m: toNumber(section.width_m),
    })),
    openings: state.openings.map((opening) => ({
      opening_type: opening.opening_type,
      width_m: toNumber(opening.width_m),
      height_m: toNumber(opening.height_m),
      quantity: toNumber(opening.quantity),
      area_m2: toNumber(opening.area_m2),
      note: opening.note.trim() || null,
    })),
  };
}
