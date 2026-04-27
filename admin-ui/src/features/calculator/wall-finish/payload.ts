import { toInteger, toNumber } from "./";
import type {
  CalculatorWallFinishCoveringPayload,
  CalculatorWallFinishLayoutPayload,
  CalculatorWallFinishPayload,
  CalculatorWallFinishPreparationPayload,
  WallFinishCoveringCreateState,
  WallFinishEditState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
} from "./";

// Transport-payload builders для отделки стен.
// Wall-finish формы и каталоги нормализуются отдельно от других сценариев калькулятора.

export function buildWallFinishPayload(state: WallFinishEditState): CalculatorWallFinishPayload {
  return {
    include_preparation: state.include_preparation,
    include_demolition: state.include_demolition,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? 0),
    rooms: state.rooms.map((room) => ({
      room_id: room.room_id,
      selected: room.selected,
      covering_id: toInteger(room.covering_id),
      preparation_id: toInteger(room.preparation_id),
      layout_id: toInteger(room.layout_id),
      area_m2_override: toNumber(room.area_m2_override),
      note: room.note.trim() || null,
    })),
  };
}

export function buildWallFinishCoveringPayload(
  state: WallFinishCoveringCreateState,
): CalculatorWallFinishCoveringPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    base_waste_percent: Math.max(0, toNumber(state.base_waste_percent) ?? 5),
    glue_consumption_per_m2: Math.max(0, toNumber(state.glue_consumption_per_m2) ?? 0),
    glue_unit: state.glue_unit.trim() || "??",
    glue_price_per_unit: Math.max(0, toNumber(state.glue_price_per_unit) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "?",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    putty_consumption_per_m2: Math.max(0, toNumber(state.putty_consumption_per_m2) ?? 0),
    putty_unit: state.putty_unit.trim() || "??",
    putty_price_per_unit: Math.max(0, toNumber(state.putty_price_per_unit) ?? 0),
    mesh_consumption_per_m2: Math.max(0, toNumber(state.mesh_consumption_per_m2) ?? 0),
    mesh_unit: state.mesh_unit.trim() || "??",
    mesh_price_per_unit: Math.max(0, toNumber(state.mesh_price_per_unit) ?? 0),
    instrument_price_per_m2: Math.max(0, toNumber(state.instrument_price_per_m2) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildWallFinishPreparationPayload(
  state: WallFinishPreparationCreateState,
): CalculatorWallFinishPreparationPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "?",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildWallFinishLayoutPayload(
  state: WallFinishLayoutCreateState,
): CalculatorWallFinishLayoutPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    labor_multiplier: Math.max(0.1, toNumber(state.labor_multiplier) ?? 1),
    extra_waste_percent: Math.max(0, toNumber(state.extra_waste_percent) ?? 0),
    note: state.note.trim() || null,
  };
}
