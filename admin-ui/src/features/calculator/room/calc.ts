import { toNumber } from "../shared";
import type { CalculatorRoomDetail, CalculatorRoomStats, CalculatorRoomSummary, RoomEditState } from "./model";

type RoomPreviewMetrics = CalculatorRoomStats;

function clampNonNegative(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  return Math.max(0, value);
}

function normalizeQuantity(value: number | null): number {
  if (value === null) {
    return 1;
  }
  return Math.max(0, value);
}

export function estimateOpeningAreaFromDraft(opening: RoomEditState["openings"][number]): number | null {
  const manualArea = clampNonNegative(toNumber(opening.area_m2));
  if (manualArea !== null) {
    return manualArea;
  }

  const width = clampNonNegative(toNumber(opening.width_m));
  const height = clampNonNegative(toNumber(opening.height_m));
  const quantity = normalizeQuantity(toNumber(opening.quantity));
  if (width === null || height === null) {
    return null;
  }
  return width * height * quantity;
}

export function buildRoomPreviewMetrics(roomDetail: CalculatorRoomDetail, roomState: RoomEditState): RoomPreviewMetrics {
  const manualFloorArea = clampNonNegative(toNumber(roomState.manual_floor_area_m2));
  const floorAreaM2 =
    manualFloorArea ??
    roomState.floor_sections.reduce((total, section) => {
      const length = clampNonNegative(toNumber(section.length_m));
      const width = clampNonNegative(toNumber(section.width_m));
      if (length === null || width === null) {
        return total;
      }
      return total + length * width;
    }, 0);

  const measuredPerimeterM = roomState.walls_m.reduce((total, wall) => {
    const length = clampNonNegative(toNumber(wall));
    return total + (length ?? 0);
  }, 0);

  const autoPerimeterCalc = roomState.auto_perimeter_calc;
  const perimeterFactor = Math.max(1, toNumber(roomState.perimeter_factor) ?? 1.15);
  let perimeterM = 0;
  let perimeterSource = "missing";
  if (measuredPerimeterM > 0) {
    perimeterM = measuredPerimeterM;
    perimeterSource = "measured";
  } else if (autoPerimeterCalc && floorAreaM2 > 0) {
    perimeterM = 4 * Math.sqrt(floorAreaM2) * perimeterFactor;
    perimeterSource = "estimated";
  }

  const ceilingHeightM = Math.max(0, toNumber(roomState.ceiling_height_m) ?? roomDetail.room.ceiling_height_m ?? 0);
  const wallAreaGrossM2 = perimeterM * ceilingHeightM;
  const openingsAreaM2 = roomState.openings.reduce((total, opening) => total + (estimateOpeningAreaFromDraft(opening) ?? 0), 0);
  const doorAreaM2 = Math.max(0, roomDetail.stats.door_area_m2 ?? 0);
  const wallAreaNetM2 = Math.max(0, wallAreaGrossM2 - openingsAreaM2 - doorAreaM2);

  return {
    perimeter_m: perimeterM,
    floor_area_m2: floorAreaM2,
    wall_area_gross_m2: wallAreaGrossM2,
    openings_area_m2: openingsAreaM2,
    door_area_m2: doorAreaM2,
    wall_area_net_m2: wallAreaNetM2,
    is_perimeter_estimated: perimeterSource === "estimated" ? 1 : 0,
    perimeter_source: perimeterSource,
  };
}

export function buildRoomPreviewDetail(roomDetail: CalculatorRoomDetail, roomState: RoomEditState): CalculatorRoomDetail {
  const stats = buildRoomPreviewMetrics(roomDetail, roomState);

  return {
    ...roomDetail,
    room: {
      ...roomDetail.room,
      name: roomState.name,
      ceiling_height_m: Math.max(0, toNumber(roomState.ceiling_height_m) ?? roomDetail.room.ceiling_height_m),
      manual_floor_area_m2: clampNonNegative(toNumber(roomState.manual_floor_area_m2)),
      auto_perimeter_calc: roomState.auto_perimeter_calc,
      perimeter_factor: Math.max(1, toNumber(roomState.perimeter_factor) ?? roomDetail.room.perimeter_factor),
      note: roomState.note.trim() || null,
    },
    stats,
  };
}

export function buildRoomPreviewSummary(roomDetail: CalculatorRoomDetail, roomState: RoomEditState): CalculatorRoomSummary {
  const previewDetail = buildRoomPreviewDetail(roomDetail, roomState);

  return {
    id: previewDetail.room.id,
    project_id: previewDetail.room.project_id,
    name: previewDetail.room.name,
    ceiling_height_m: previewDetail.room.ceiling_height_m,
    manual_floor_area_m2: previewDetail.room.manual_floor_area_m2,
    auto_perimeter_calc: previewDetail.room.auto_perimeter_calc,
    perimeter_factor: previewDetail.room.perimeter_factor,
    note: previewDetail.room.note,
    sort_order: previewDetail.room.sort_order,
    perimeter_m: previewDetail.stats.perimeter_m,
    floor_area_m2: previewDetail.stats.floor_area_m2,
    wall_area_gross_m2: previewDetail.stats.wall_area_gross_m2,
    openings_area_m2: previewDetail.stats.openings_area_m2,
    door_area_m2: previewDetail.stats.door_area_m2,
    wall_area_net_m2: previewDetail.stats.wall_area_net_m2,
    is_perimeter_estimated: previewDetail.stats.is_perimeter_estimated,
    perimeter_source: previewDetail.stats.perimeter_source,
  };
}
