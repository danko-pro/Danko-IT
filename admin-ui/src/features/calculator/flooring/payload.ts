import { toInteger, toNumber } from "./";
import type {
  CalculatorFlooringCoveringPayload,
  CalculatorFlooringLayoutPayload,
  CalculatorFlooringPayload,
  CalculatorFlooringPreparationPayload,
  FlooringCoveringCreateState,
  FlooringEditState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
} from "./";

// Transport-payload builders для напольных покрытий.
// Flooring-формы и каталоги нормализуются здесь, а контроллеры получают уже готовые payload-объекты.

export function buildFlooringPayload(state: FlooringEditState): CalculatorFlooringPayload {
  return {
    include_underlay: state.include_underlay,
    include_plinth: state.include_plinth,
    include_demolition: state.include_demolition,
    include_preparation: state.include_preparation,
    default_preparation_id: null,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? 0),
    underlay_price_per_m2: Math.max(0, toNumber(state.underlay_price_per_m2) ?? 0),
    plinth_material_price_per_m: Math.max(0, toNumber(state.plinth_material_price_per_m) ?? 0),
    plinth_install_price_per_m: Math.max(0, toNumber(state.plinth_install_price_per_m) ?? 0),
    threshold_profile_count: Math.max(0, toInteger(state.threshold_profile_count) ?? 0),
    threshold_profile_price: Math.max(0, toNumber(state.threshold_profile_price) ?? 0),
    global_items: state.global_items
      .filter((item) => item.title.trim())
      .map((item) => ({
        kind: item.kind,
        title: item.title.trim(),
        mode: item.mode,
        rate: Math.max(0, toNumber(item.rate) ?? 0),
        quantity: Math.max(0, toNumber(item.quantity) ?? 0),
        enabled: item.enabled,
      })),
    rooms: state.rooms.map((room) => ({
      room_id: room.room_id,
      selected: room.selected,
      covering_id: toInteger(room.covering_id),
      preparation_id: toInteger(room.preparation_id),
      layout_id: toInteger(room.layout_id),
      area_m2_override: toNumber(room.area_m2_override),
      perimeter_m_override: toNumber(room.perimeter_m_override),
      plinth_m_override: toNumber(room.plinth_m_override),
      note: room.note.trim() || null,
      zones: (room.zones ?? []).map((zone) => ({
        covering_id: toInteger(zone.covering_id),
        preparation_id: toInteger(zone.preparation_id),
        layout_id: toInteger(zone.layout_id),
        area_m2: toNumber(zone.area_m2),
        note: zone.note.trim() || null,
      })),
    })),
  };
}

export function buildFlooringCoveringPayload(
  state: FlooringCoveringCreateState,
): CalculatorFlooringCoveringPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    base_waste_percent: Math.max(0, toNumber(state.base_waste_percent) ?? 7),
    underlay_mode: state.underlay_mode,
    underlay_consumption_per_m2: Math.max(
      0,
      toNumber(state.underlay_consumption_per_m2) ?? (state.underlay_mode === "none" ? 0 : 1),
    ),
    glue_consumption_per_m2: Math.max(0, toNumber(state.glue_consumption_per_m2) ?? 0),
    glue_unit: state.glue_unit.trim() || "??",
    glue_price_per_unit: Math.max(0, toNumber(state.glue_price_per_unit) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "?",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    svp_consumption_per_m2: Math.max(0, toNumber(state.svp_consumption_per_m2) ?? 0),
    svp_unit: state.svp_unit.trim() || "??",
    svp_price_per_unit: Math.max(0, toNumber(state.svp_price_per_unit) ?? 0),
    grout_consumption_per_m2: Math.max(0, toNumber(state.grout_consumption_per_m2) ?? 0),
    grout_unit: state.grout_unit.trim() || "??",
    grout_price_per_unit: Math.max(0, toNumber(state.grout_price_per_unit) ?? 0),
    custom_consumables: state.custom_consumables
      .filter((item) => item.title.trim())
      .map((item) => ({
        title: item.title.trim(),
        consumption_per_m2: Math.max(0, toNumber(item.consumption_per_m2) ?? 0),
        unit: item.unit.trim() || "шт",
        price_per_unit: Math.max(0, toNumber(item.price_per_unit) ?? 0),
      })),
    needs_plinth: state.needs_plinth,
    instrument_price_per_m2: Math.max(0, toNumber(state.instrument_price_per_m2) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildFlooringPreparationPayload(
  state: FlooringPreparationCreateState,
): CalculatorFlooringPreparationPayload | null {
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

export function buildFlooringLayoutPayload(state: FlooringLayoutCreateState): CalculatorFlooringLayoutPayload | null {
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
