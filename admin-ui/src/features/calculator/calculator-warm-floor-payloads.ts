import { toInteger, toNumber } from "./calculator-shared";
import type { CalculatorWarmFloorPayload, WarmFloorEditState } from "./calculator-types";

// Сборка payload для сценария тёплого пола.
// Здесь остаётся только нормализация формы перед сохранением в API.

export function buildWarmFloorPayload(state: WarmFloorEditState): CalculatorWarmFloorPayload {
  return {
    work_price_per_m2: toNumber(state.work_price_per_m2) ?? 1600,
    pipe_m_per_m2: toNumber(state.pipe_m_per_m2) ?? 6,
    max_contour_area_m2: toNumber(state.max_contour_area_m2) ?? 15,
    small_zone_area_m2: toNumber(state.small_zone_area_m2) ?? 5,
    manifold_work_price: toNumber(state.manifold_work_price) ?? 6000,
    manifold_material_price: toNumber(state.manifold_material_price) ?? 20000,
    pump_work_price: toNumber(state.pump_work_price) ?? 8000,
    pump_material_price: toNumber(state.pump_material_price) ?? 25000,
    pipe_price_per_m: toNumber(state.pipe_price_per_m) ?? 170,
    pump_rooms_threshold: toInteger(state.pump_rooms_threshold) ?? 3,
    pump_contours_threshold: toInteger(state.pump_contours_threshold) ?? 4,
    rooms: state.rooms.map((room) => ({
      room_id: room.room_id,
      selected: room.selected,
      area_m2_override: toNumber(room.area_m2_override),
      note: room.note.trim() || null,
    })),
  };
}
