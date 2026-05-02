import { toInteger, toNumber, trimFloat } from "../shared";
import type {
  CalculatorFlooringConfig,
  CalculatorFlooringDetail,
  CalculatorFlooringGlobalItem,
  FlooringEditState,
} from "./model";
import { buildFlooringPreviewRooms } from "./preview-room";
import { createFlooringSpecCollector, createFlooringSummary, finalizeFlooringSummary } from "./preview-summary";

// Расчёты и подготовка состояния для напольных покрытий.
// Основной модуль держит только orchestration flooring-логики.

export function buildFlooringState(detail: CalculatorFlooringDetail, draft: FlooringEditState | null = null): FlooringEditState {
  const draftRooms = new Map((draft?.rooms ?? []).map((room) => [room.room_id, room]));
  return {
    include_underlay: draft?.include_underlay ?? Boolean(detail.config.include_underlay),
    include_plinth: draft?.include_plinth ?? Boolean(detail.config.include_plinth),
    include_demolition: draft?.include_demolition ?? Boolean(detail.config.include_demolition),
    include_preparation: draft?.include_preparation ?? Boolean(detail.config.include_preparation),
    default_preparation_id: "",
    demolition_price_per_m2: draft?.demolition_price_per_m2 ?? trimFloat(detail.config.demolition_price_per_m2),
    underlay_price_per_m2: draft?.underlay_price_per_m2 ?? trimFloat(detail.config.underlay_price_per_m2),
    plinth_material_price_per_m: draft?.plinth_material_price_per_m ?? trimFloat(detail.config.plinth_material_price_per_m),
    plinth_install_price_per_m: draft?.plinth_install_price_per_m ?? trimFloat(detail.config.plinth_install_price_per_m),
    threshold_profile_count: draft?.threshold_profile_count ?? trimFloat(detail.config.threshold_profile_count),
    threshold_profile_price: draft?.threshold_profile_price ?? trimFloat(detail.config.threshold_profile_price),
    global_items: draft?.global_items ?? parseGlobalItems(detail.config.global_items_json),
    rooms: detail.rooms.map((room) => {
      const draftRoom = draftRooms.get(room.room_id);
      return {
        room_id: room.room_id,
        selected: draftRoom?.selected ?? room.selected,
        covering_id: draftRoom?.covering_id ?? (room.covering_id === null ? "" : String(room.covering_id)),
        preparation_id: draftRoom?.preparation_id ?? (room.preparation_id === null ? "" : String(room.preparation_id)),
        layout_id: draftRoom?.layout_id ?? (room.layout_id === null ? "" : String(room.layout_id)),
        area_m2_override: draftRoom?.area_m2_override ?? (room.area_m2_override === null ? "" : trimFloat(room.area_m2_override)),
        perimeter_m_override:
          draftRoom?.perimeter_m_override ?? (room.perimeter_m_override === null ? "" : trimFloat(room.perimeter_m_override)),
        plinth_m_override: draftRoom?.plinth_m_override ?? (room.plinth_m_override === null ? "" : trimFloat(room.plinth_m_override)),
        plinth_type: draftRoom?.plinth_type ?? "",
        note: draftRoom?.note ?? (room.note ?? ""),
        zones:
          draftRoom?.zones ??
          (room.zones?.length
            ? room.zones.map((zone, index) => ({
                id: String(zone.id ?? index + 1),
                covering_id: zone.covering_id === null ? "" : String(zone.covering_id),
                preparation_id: zone.preparation_id === null ? "" : String(zone.preparation_id),
                layout_id: zone.layout_id === null ? "" : String(zone.layout_id),
                area_m2: zone.area_m2 === null ? "" : trimFloat(zone.area_m2),
                note: zone.note ?? "",
              }))
            : [
                {
                  id: "1",
                  covering_id: room.covering_id === null ? "" : String(room.covering_id),
                  preparation_id: room.preparation_id === null ? "" : String(room.preparation_id),
                  layout_id: room.layout_id === null ? "" : String(room.layout_id),
                  area_m2: "",
                  note: room.note ?? "",
                },
              ]),
      };
    }),
  };
}

export function buildFlooringPreview(detail: CalculatorFlooringDetail, state: FlooringEditState): CalculatorFlooringDetail {
  const config = buildFlooringConfig(detail.config, state);
  const summary = createFlooringSummary(config);
  const specCollector = createFlooringSpecCollector();
  const rooms = buildFlooringPreviewRooms({
    detail,
    state,
    config,
    summary,
    specCollector,
  });

  finalizeFlooringSummary(summary, config, specCollector);

  return {
    config,
    coverings: detail.coverings,
    preparations: detail.preparations,
    layouts: detail.layouts,
    rooms,
    summary,
    specification: specCollector.toArray(),
  };
}

function buildFlooringConfig(config: CalculatorFlooringConfig, state: FlooringEditState): CalculatorFlooringConfig {
  return {
    project_id: config.project_id,
    include_underlay: state.include_underlay,
    include_plinth: state.include_plinth,
    include_demolition: state.include_demolition,
    include_preparation: state.include_preparation,
    default_preparation_id: null,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? config.demolition_price_per_m2),
    underlay_price_per_m2: Math.max(0, toNumber(state.underlay_price_per_m2) ?? config.underlay_price_per_m2),
    plinth_material_price_per_m: Math.max(0, toNumber(state.plinth_material_price_per_m) ?? config.plinth_material_price_per_m),
    plinth_install_price_per_m: Math.max(0, toNumber(state.plinth_install_price_per_m) ?? config.plinth_install_price_per_m),
    threshold_profile_count: Math.max(0, toInteger(state.threshold_profile_count) ?? config.threshold_profile_count),
    threshold_profile_price: Math.max(0, toNumber(state.threshold_profile_price) ?? config.threshold_profile_price),
    global_items_json: JSON.stringify(
      state.global_items.map((item) => ({
        kind: item.kind,
        title: item.title.trim(),
        mode: item.mode,
        rate: Math.max(0, toNumber(item.rate) ?? 0),
        quantity: Math.max(0, toNumber(item.quantity) ?? 0),
        enabled: item.enabled,
      })),
    ),
  };
}

function parseGlobalItems(raw: string): FlooringEditState["global_items"] {
  try {
    const items = JSON.parse(raw || "[]") as CalculatorFlooringGlobalItem[];
    return items.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      kind: item.kind,
      title: item.title,
      mode: item.mode,
      rate: trimFloat(item.rate),
      quantity: trimFloat(item.quantity),
      enabled: item.enabled,
    }));
  } catch {
    return [];
  }
}
