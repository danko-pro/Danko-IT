import { toNumber, trimFloat } from "../shared";
import type { CalculatorWallFinishConfig, CalculatorWallFinishDetail, WallFinishEditState } from "./model";
import { buildWallFinishPreviewRooms } from "./preview-room";
import { createWallFinishSpecCollector, createWallFinishSummary, finalizeWallFinishSummary } from "./preview-summary";

// Расчёты и draft-состояние для отделки стен.
// Основной модуль держит только orchestration wall-finish логики.

export function buildWallFinishState(detail: CalculatorWallFinishDetail, draft: WallFinishEditState | null = null): WallFinishEditState {
  const draftRooms = new Map((draft?.rooms ?? []).map((room) => [room.room_id, room]));
  return {
    include_preparation: draft?.include_preparation ?? Boolean(detail.config.include_preparation),
    include_demolition: draft?.include_demolition ?? Boolean(detail.config.include_demolition),
    demolition_price_per_m2: draft?.demolition_price_per_m2 ?? trimFloat(detail.config.demolition_price_per_m2),
    rooms: detail.rooms.map((room) => {
      const draftRoom = draftRooms.get(room.room_id);
      return {
        room_id: room.room_id,
        selected: draftRoom?.selected ?? room.selected,
        covering_id: draftRoom?.covering_id ?? (room.covering_id === null ? "" : String(room.covering_id)),
        preparation_id: draftRoom?.preparation_id ?? (room.preparation_id === null ? "" : String(room.preparation_id)),
        layout_id: draftRoom?.layout_id ?? (room.layout_id === null ? "" : String(room.layout_id)),
        area_m2_override: draftRoom?.area_m2_override ?? (room.area_m2_override === null ? "" : trimFloat(room.area_m2_override)),
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
            : []),
      };
    }),
  };
}

export function buildWallFinishPreview(detail: CalculatorWallFinishDetail, state: WallFinishEditState): CalculatorWallFinishDetail {
  const config = buildWallFinishConfig(detail.config, state);
  const summary = createWallFinishSummary();
  const specCollector = createWallFinishSpecCollector();
  const rooms = buildWallFinishPreviewRooms({
    detail,
    state,
    config,
    summary,
    specCollector,
  });

  finalizeWallFinishSummary(summary);

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

function buildWallFinishConfig(config: CalculatorWallFinishConfig, state: WallFinishEditState): CalculatorWallFinishConfig {
  return {
    project_id: config.project_id,
    include_preparation: state.include_preparation,
    include_demolition: state.include_demolition,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? config.demolition_price_per_m2),
  };
}
