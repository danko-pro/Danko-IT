import { formatContourWord, toInteger, toNumber, trimFloat } from "./";
import type {
  CalculatorWarmFloorConfig,
  CalculatorWarmFloorDetail,
  CalculatorWarmFloorSpecItem,
  CalculatorWarmFloorSummary,
  WarmFloorEditState,
} from "./";

// Расчёты и нормализация draft-состояния для тёплого пола.
// Здесь живёт только доменная математика warm-floor без примесей других calculator-срезов.

export function buildWarmFloorState(detail: CalculatorWarmFloorDetail, draft: WarmFloorEditState | null = null): WarmFloorEditState {
  const draftRooms = new Map((draft?.rooms ?? []).map((room) => [room.room_id, room]));
  return {
    work_price_per_m2: draft?.work_price_per_m2 ?? trimFloat(detail.config.work_price_per_m2),
    pipe_m_per_m2: draft?.pipe_m_per_m2 ?? trimFloat(detail.config.pipe_m_per_m2),
    max_contour_area_m2: draft?.max_contour_area_m2 ?? trimFloat(detail.config.max_contour_area_m2),
    small_zone_area_m2: draft?.small_zone_area_m2 ?? trimFloat(detail.config.small_zone_area_m2),
    manifold_work_price: draft?.manifold_work_price ?? trimFloat(detail.config.manifold_work_price),
    manifold_material_price: draft?.manifold_material_price ?? trimFloat(detail.config.manifold_material_price),
    pump_work_price: draft?.pump_work_price ?? trimFloat(detail.config.pump_work_price),
    pump_material_price: draft?.pump_material_price ?? trimFloat(detail.config.pump_material_price),
    pipe_price_per_m: draft?.pipe_price_per_m ?? trimFloat(detail.config.pipe_price_per_m),
    pump_rooms_threshold: draft?.pump_rooms_threshold ?? trimFloat(detail.config.pump_rooms_threshold),
    pump_contours_threshold: draft?.pump_contours_threshold ?? trimFloat(detail.config.pump_contours_threshold),
    rooms: detail.rooms.map((room) => {
      const draftRoom = draftRooms.get(room.room_id);
      return {
        room_id: room.room_id,
        selected: draftRoom?.selected ?? room.selected,
        area_m2_override: draftRoom?.area_m2_override ?? (room.area_m2_override === null ? "" : trimFloat(room.area_m2_override)),
        note: draftRoom?.note ?? (room.note ?? ""),
      };
    }),
  };
}

export function buildWarmFloorPreview(
  detail: CalculatorWarmFloorDetail,
  state: WarmFloorEditState,
): CalculatorWarmFloorDetail {
  const config: CalculatorWarmFloorConfig = {
    project_id: detail.config.project_id,
    work_price_per_m2: Math.max(0, toNumber(state.work_price_per_m2) ?? detail.config.work_price_per_m2),
    pipe_m_per_m2: Math.max(0, toNumber(state.pipe_m_per_m2) ?? detail.config.pipe_m_per_m2),
    max_contour_area_m2: Math.max(0.1, toNumber(state.max_contour_area_m2) ?? detail.config.max_contour_area_m2),
    small_zone_area_m2: Math.max(0, toNumber(state.small_zone_area_m2) ?? detail.config.small_zone_area_m2),
    manifold_work_price: Math.max(0, toNumber(state.manifold_work_price) ?? detail.config.manifold_work_price),
    manifold_material_price: Math.max(0, toNumber(state.manifold_material_price) ?? detail.config.manifold_material_price),
    pump_work_price: Math.max(0, toNumber(state.pump_work_price) ?? detail.config.pump_work_price),
    pump_material_price: Math.max(0, toNumber(state.pump_material_price) ?? detail.config.pump_material_price),
    pipe_price_per_m: Math.max(0, toNumber(state.pipe_price_per_m) ?? detail.config.pipe_price_per_m),
    pump_rooms_threshold: Math.max(1, toInteger(state.pump_rooms_threshold) ?? detail.config.pump_rooms_threshold),
    pump_contours_threshold: Math.max(1, toInteger(state.pump_contours_threshold) ?? detail.config.pump_contours_threshold),
  };

  const stateRooms = new Map(state.rooms.map((room) => [room.room_id, room]));
  const rooms = detail.rooms.map((room) => {
    const edit = stateRooms.get(room.room_id);
    const selected = edit?.selected ?? room.selected;
    const areaOverride = edit ? toNumber(edit.area_m2_override) : room.area_m2_override;
    const effectiveArea = selected ? Math.max(0, areaOverride ?? room.base_floor_area_m2) : 0;
    const contours = selected && effectiveArea > 0 ? Math.ceil(effectiveArea / config.max_contour_area_m2) : 0;
    const pipeM = selected ? effectiveArea * config.pipe_m_per_m2 : 0;
    let zoneLabel = "";
    if (selected && effectiveArea > 0) {
      if (effectiveArea <= config.small_zone_area_m2) {
        zoneLabel = "Малая зона";
      } else if (contours === 1) {
        zoneLabel = "1 контур";
      } else {
        zoneLabel = `${contours} ${formatContourWord(contours)}`;
      }
    }
    return {
      ...room,
      selected,
      area_m2_override: areaOverride,
      effective_area_m2: effectiveArea,
      pipe_m: pipeM,
      contours,
      zone_label: zoneLabel,
      work_total: selected ? effectiveArea * config.work_price_per_m2 : 0,
      note: edit?.note ?? room.note,
    };
  });

  const summary: CalculatorWarmFloorSummary = {
    rooms_count: rooms.filter((room) => room.selected && room.effective_area_m2 > 0).length,
    total_area_m2: rooms.reduce((acc, room) => acc + (room.selected ? room.effective_area_m2 : 0), 0),
    total_pipe_m: rooms.reduce((acc, room) => acc + (room.selected ? room.pipe_m : 0), 0),
    total_contours: rooms.reduce((acc, room) => acc + (room.selected ? room.contours : 0), 0),
    floor_work_total: rooms.reduce((acc, room) => acc + (room.selected ? room.work_total : 0), 0),
    pipe_material_total: 0,
    manifold_needed: false,
    manifold_work_total: 0,
    manifold_material_total: 0,
    pump_needed: false,
    pump_work_total: 0,
    pump_material_total: 0,
    work_total: 0,
    material_total: 0,
    grand_total: 0,
    price_per_m2: null,
  };

  summary.pipe_material_total = summary.total_pipe_m * config.pipe_price_per_m;
  summary.manifold_needed = summary.total_contours >= 2 || summary.rooms_count > 1;
  summary.manifold_work_total = summary.manifold_needed ? config.manifold_work_price : 0;
  summary.manifold_material_total = summary.manifold_needed ? config.manifold_material_price : 0;
  summary.pump_needed = summary.rooms_count >= config.pump_rooms_threshold || summary.total_contours >= config.pump_contours_threshold;
  summary.pump_work_total = summary.pump_needed ? config.pump_work_price : 0;
  summary.pump_material_total = summary.pump_needed ? config.pump_material_price : 0;
  summary.work_total = summary.floor_work_total + summary.manifold_work_total + summary.pump_work_total;
  summary.material_total = summary.pipe_material_total + summary.manifold_material_total + summary.pump_material_total;
  summary.grand_total = summary.work_total + summary.material_total;
  summary.price_per_m2 = summary.total_area_m2 > 0 ? summary.grand_total / summary.total_area_m2 : null;

  const specification: CalculatorWarmFloorSpecItem[] = [];
  if (summary.total_area_m2 > 0) {
    specification.push({
      code: "floor_work",
      kind: "work",
      title: "Устройство водяного тёплого пола",
      unit: "м²",
      quantity: summary.total_area_m2,
      amount: summary.floor_work_total,
    });
  }
  if (summary.total_pipe_m > 0) {
    specification.push({
      code: "pipe_material",
      kind: "material",
      title: "Труба для водяного тёплого пола",
      unit: "м.п.",
      quantity: summary.total_pipe_m,
      amount: summary.pipe_material_total,
    });
  }
  if (summary.manifold_needed) {
    specification.push({
      code: "manifold_work",
      kind: "work",
      title: "Монтаж распределительной гребёнки тёплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.manifold_work_total,
    });
    specification.push({
      code: "manifold_material",
      kind: "material",
      title: "Комплект распределительной гребёнки тёплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.manifold_material_total,
    });
  }
  if (summary.pump_needed) {
    specification.push({
      code: "pump_work",
      kind: "work",
      title: "Монтаж насосно-смесительного узла тёплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.pump_work_total,
    });
    specification.push({
      code: "pump_material",
      kind: "material",
      title: "Комплект насосно-смесительного узла тёплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.pump_material_total,
    });
  }

  return {
    config,
    rooms,
    summary,
    specification,
  };
}
