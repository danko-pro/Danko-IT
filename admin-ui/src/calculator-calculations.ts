import { formatContourWord, toInteger, toNumber, trimFloat } from "./calculator-shared";
import type {
  CalculatorFlooringConfig,
  CalculatorFlooringDetail,
  CalculatorFlooringSpecItem,
  CalculatorFlooringSummary,
  CalculatorWallFinishConfig,
  CalculatorWallFinishDetail,
  CalculatorWallFinishSpecItem,
  CalculatorWallFinishSummary,
  CalculatorWarmFloorConfig,
  CalculatorWarmFloorDetail,
  CalculatorWarmFloorSpecItem,
  CalculatorWarmFloorSummary,
  FlooringEditState,
  WarmFloorEditState,
  WallFinishEditState,
} from "./calculator";

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

export function buildFlooringState(detail: CalculatorFlooringDetail, draft: FlooringEditState | null = null): FlooringEditState {
  const draftRooms = new Map((draft?.rooms ?? []).map((room) => [room.room_id, room]));
  return {
    include_underlay: draft?.include_underlay ?? Boolean(detail.config.include_underlay),
    include_plinth: draft?.include_plinth ?? Boolean(detail.config.include_plinth),
    include_demolition: draft?.include_demolition ?? Boolean(detail.config.include_demolition),
    include_preparation: draft?.include_preparation ?? Boolean(detail.config.include_preparation),
    demolition_price_per_m2: draft?.demolition_price_per_m2 ?? trimFloat(detail.config.demolition_price_per_m2),
    underlay_price_per_m2: draft?.underlay_price_per_m2 ?? trimFloat(detail.config.underlay_price_per_m2),
    plinth_material_price_per_m: draft?.plinth_material_price_per_m ?? trimFloat(detail.config.plinth_material_price_per_m),
    plinth_install_price_per_m: draft?.plinth_install_price_per_m ?? trimFloat(detail.config.plinth_install_price_per_m),
    threshold_profile_count: draft?.threshold_profile_count ?? trimFloat(detail.config.threshold_profile_count),
    threshold_profile_price: draft?.threshold_profile_price ?? trimFloat(detail.config.threshold_profile_price),
    rooms: detail.rooms.map((room) => {
      const draftRoom = draftRooms.get(room.room_id);
      return {
        room_id: room.room_id,
        selected: draftRoom?.selected ?? room.selected,
        covering_id: draftRoom?.covering_id ?? (room.covering_id === null ? "" : String(room.covering_id)),
        preparation_id: draftRoom?.preparation_id ?? (room.preparation_id === null ? "" : String(room.preparation_id)),
        layout_id: draftRoom?.layout_id ?? (room.layout_id === null ? "" : String(room.layout_id)),
        area_m2_override: draftRoom?.area_m2_override ?? (room.area_m2_override === null ? "" : trimFloat(room.area_m2_override)),
        perimeter_m_override: draftRoom?.perimeter_m_override ?? (room.perimeter_m_override === null ? "" : trimFloat(room.perimeter_m_override)),
        plinth_m_override: draftRoom?.plinth_m_override ?? (room.plinth_m_override === null ? "" : trimFloat(room.plinth_m_override)),
        note: draftRoom?.note ?? (room.note ?? ""),
      };
    }),
  };
}

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
      title: "Устройство водяного теплого пола",
      unit: "м²",
      quantity: summary.total_area_m2,
      amount: summary.floor_work_total,
    });
  }
  if (summary.total_pipe_m > 0) {
    specification.push({
      code: "pipe_material",
      kind: "material",
      title: "Труба для водяного теплого пола",
      unit: "м.п.",
      quantity: summary.total_pipe_m,
      amount: summary.pipe_material_total,
    });
  }
  if (summary.manifold_needed) {
    specification.push({
      code: "manifold_work",
      kind: "work",
      title: "Монтаж распределительной гребёнки теплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.manifold_work_total,
    });
    specification.push({
      code: "manifold_material",
      kind: "material",
      title: "Комплект распределительной гребёнки теплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.manifold_material_total,
    });
  }
  if (summary.pump_needed) {
    specification.push({
      code: "pump_work",
      kind: "work",
      title: "Монтаж насосно-смесительного узла теплого пола",
      unit: "компл.",
      quantity: 1,
      amount: summary.pump_work_total,
    });
    specification.push({
      code: "pump_material",
      kind: "material",
      title: "Комплект насосно-смесительного узла теплого пола",
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

export function buildFlooringPreview(
  detail: CalculatorFlooringDetail,
  state: FlooringEditState,
): CalculatorFlooringDetail {
  const config: CalculatorFlooringConfig = {
    project_id: detail.config.project_id,
    include_underlay: state.include_underlay,
    include_plinth: state.include_plinth,
    include_demolition: state.include_demolition,
    include_preparation: state.include_preparation,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? detail.config.demolition_price_per_m2),
    underlay_price_per_m2: Math.max(0, toNumber(state.underlay_price_per_m2) ?? detail.config.underlay_price_per_m2),
    plinth_material_price_per_m: Math.max(0, toNumber(state.plinth_material_price_per_m) ?? detail.config.plinth_material_price_per_m),
    plinth_install_price_per_m: Math.max(0, toNumber(state.plinth_install_price_per_m) ?? detail.config.plinth_install_price_per_m),
    threshold_profile_count: Math.max(0, toInteger(state.threshold_profile_count) ?? detail.config.threshold_profile_count),
    threshold_profile_price: Math.max(0, toNumber(state.threshold_profile_price) ?? detail.config.threshold_profile_price),
  };

  const stateRooms = new Map(state.rooms.map((room) => [room.room_id, room]));
  const coveringsById = new Map(detail.coverings.map((item) => [item.id, item]));
  const preparationsById = new Map(detail.preparations.map((item) => [item.id, item]));
  const layoutsById = new Map(detail.layouts.map((item) => [item.id, item]));

  const summary: CalculatorFlooringSummary = {
    rooms_count: 0,
    total_area_m2: 0,
    total_purchase_area_m2: 0,
    total_material_cost: 0,
    total_installation_cost: 0,
    total_preparation_work_cost: 0,
    total_preparation_material_cost: 0,
    total_preparation_cost: 0,
    total_underlay_qty: 0,
    underlay_unit: "м²",
    total_underlay_cost: 0,
    total_glue_qty: 0,
    glue_unit: "кг",
    total_glue_cost: 0,
    total_primer_qty: 0,
    primer_unit: "л",
    total_primer_cost: 0,
    total_svp_qty: 0,
    svp_unit: "шт",
    total_svp_cost: 0,
    total_grout_qty: 0,
    grout_unit: "кг",
    total_grout_cost: 0,
    total_plinth_m: 0,
    total_plinth_material_cost: 0,
    total_plinth_install_cost: 0,
    total_demolition_cost: 0,
    threshold_profile_count: config.threshold_profile_count,
    threshold_profile_cost: 0,
    total_instrument_cost: 0,
    work_total: 0,
    material_total: 0,
    grand_total: 0,
    price_per_m2: null,
  };

  const specMap = new Map<string, CalculatorFlooringSpecItem>();
  const addSpec = (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => {
    if (quantity <= 0 || amount <= 0) {
      return;
    }
    const key = `${kind}|${title}|${unit}`;
    const current = specMap.get(key);
    if (current) {
      current.quantity += quantity;
      current.amount += amount;
      return;
    }
    specMap.set(key, { kind, title, unit, quantity, amount });
  };

  const rooms = detail.rooms.map((room) => {
    const edit = stateRooms.get(room.room_id);
    const selected = edit?.selected ?? room.selected;
    const coveringId = edit ? toInteger(edit.covering_id) : room.covering_id;
    const preparationId = edit ? toInteger(edit.preparation_id) : room.preparation_id;
    const layoutId = edit ? toInteger(edit.layout_id) : room.layout_id;
    const covering = coveringId === null ? null : coveringsById.get(coveringId) ?? null;
    const preparation = preparationId === null ? null : preparationsById.get(preparationId) ?? null;
    const layout = layoutId === null ? null : layoutsById.get(layoutId) ?? null;

    const areaOverride = edit ? toNumber(edit.area_m2_override) : room.area_m2_override;
    const perimeterOverride = edit ? toNumber(edit.perimeter_m_override) : room.perimeter_m_override;
    const plinthOverride = edit ? toNumber(edit.plinth_m_override) : room.plinth_m_override;

    const effectiveArea = selected ? Math.max(0, areaOverride ?? room.base_area_m2) : 0;
    const effectivePerimeter = selected ? Math.max(0, perimeterOverride ?? room.base_perimeter_m) : 0;
    const plinthBase = selected ? Math.max(0, plinthOverride ?? effectivePerimeter) : 0;

    const baseWastePercent = covering?.base_waste_percent ?? 0;
    const extraWastePercent = layout?.extra_waste_percent ?? 0;
    const totalWastePercent = baseWastePercent + extraWastePercent;
    const purchaseArea = selected ? effectiveArea * (1 + totalWastePercent / 100) : 0;

    const materialPricePerM2 = covering?.material_price_per_m2 ?? 0;
    const baseLaborPricePerM2 = covering?.labor_price_per_m2 ?? 0;
    const layoutMultiplier = layout?.labor_multiplier ?? 1;
    const laborPricePerM2 = selected ? baseLaborPricePerM2 * layoutMultiplier : 0;

    const materialCost = purchaseArea * materialPricePerM2;
    const installationCost = effectiveArea * laborPricePerM2;

    let preparationWorkCost = 0;
    let preparationMaterialCost = 0;
    let preparationPrimerQty = 0;
    let preparationPrimerCost = 0;
    if (selected && preparation && Boolean(config.include_preparation)) {
      preparationWorkCost = effectiveArea * preparation.labor_price_per_m2;
      preparationMaterialCost = effectiveArea * preparation.material_price_per_m2;
      preparationPrimerQty = effectiveArea * preparation.primer_consumption_per_m2;
      preparationPrimerCost = preparationPrimerQty * preparation.primer_price_per_unit;
    }
    const preparationTotalCost = preparationWorkCost + preparationMaterialCost;

    let underlayQty = 0;
    let underlayCost = 0;
    if (selected && covering && Boolean(config.include_underlay) && covering.underlay_mode !== "none") {
      underlayQty = effectiveArea * (covering.underlay_consumption_per_m2 || 1);
      underlayCost = underlayQty * config.underlay_price_per_m2;
    }

    const glueQty = selected && covering ? purchaseArea * covering.glue_consumption_per_m2 : 0;
    const glueCost = selected && covering ? glueQty * covering.glue_price_per_unit : 0;
    const coveringPrimerQty = selected && covering ? purchaseArea * covering.primer_consumption_per_m2 : 0;
    const coveringPrimerCost = selected && covering ? coveringPrimerQty * covering.primer_price_per_unit : 0;
    const primerQty = preparationPrimerQty + coveringPrimerQty;
    const primerCost = preparationPrimerCost + coveringPrimerCost;
    const svpQty = selected && covering ? purchaseArea * covering.svp_consumption_per_m2 : 0;
    const svpCost = selected && covering ? svpQty * covering.svp_price_per_unit : 0;
    const groutQty = selected && covering ? purchaseArea * covering.grout_consumption_per_m2 : 0;
    const groutCost = selected && covering ? groutQty * covering.grout_price_per_unit : 0;

    let plinthM = 0;
    let plinthMaterialCost = 0;
    let plinthInstallCost = 0;
    if (selected && covering && Boolean(config.include_plinth) && Boolean(covering.needs_plinth)) {
      plinthM = plinthBase;
      plinthMaterialCost = plinthM * config.plinth_material_price_per_m;
      plinthInstallCost = plinthM * config.plinth_install_price_per_m;
    }

    const demolitionCost = selected && Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
    const instrumentCost = selected && covering ? effectiveArea * covering.instrument_price_per_m2 : 0;
    const totalCost =
      materialCost +
      installationCost +
      preparationTotalCost +
      underlayCost +
      glueCost +
      primerCost +
      svpCost +
      groutCost +
      plinthMaterialCost +
      plinthInstallCost +
      demolitionCost +
      instrumentCost;

    if (selected) {
      summary.rooms_count += 1;
      summary.total_area_m2 += effectiveArea;
      summary.total_purchase_area_m2 += purchaseArea;
      summary.total_material_cost += materialCost;
      summary.total_installation_cost += installationCost;
      summary.total_preparation_work_cost += preparationWorkCost;
      summary.total_preparation_material_cost += preparationMaterialCost;
      summary.total_preparation_cost += preparationTotalCost;
      summary.total_underlay_qty += underlayQty;
      summary.total_underlay_cost += underlayCost;
      summary.total_glue_qty += glueQty;
      summary.total_glue_cost += glueCost;
      summary.total_primer_qty += primerQty;
      summary.total_primer_cost += primerCost;
      summary.total_svp_qty += svpQty;
      summary.total_svp_cost += svpCost;
      summary.total_grout_qty += groutQty;
      summary.total_grout_cost += groutCost;
      summary.total_plinth_m += plinthM;
      summary.total_plinth_material_cost += plinthMaterialCost;
      summary.total_plinth_install_cost += plinthInstallCost;
      summary.total_demolition_cost += demolitionCost;
      summary.total_instrument_cost += instrumentCost;
      if (covering?.glue_unit) {
        summary.glue_unit = covering.glue_unit;
      }
      if (preparation?.primer_unit) {
        summary.primer_unit = preparation.primer_unit;
      } else if (covering?.primer_unit) {
        summary.primer_unit = covering.primer_unit;
      }
      if (covering?.svp_unit) {
        summary.svp_unit = covering.svp_unit;
      }
      if (covering?.grout_unit) {
        summary.grout_unit = covering.grout_unit;
      }

      const layoutTitle = layout?.title ?? "Прямая";
      const coveringTitle = covering?.title ?? "Покрытие";
      addSpec("work", `Укладка ${coveringTitle}, ${layoutTitle.toLowerCase()}`, "м²", effectiveArea, installationCost);
      addSpec("material", coveringTitle, "м²", purchaseArea, materialCost);
      if (preparation && Boolean(config.include_preparation)) {
        addSpec("work", `Подготовка основания: ${preparation.title}`, "м²", effectiveArea, preparationWorkCost);
        addSpec("material", `Материалы подготовки: ${preparation.title}`, "м²", effectiveArea, preparationMaterialCost);
      }
      addSpec("material", "Подложка", "м²", underlayQty, underlayCost);
      addSpec("material", "Клей", covering?.glue_unit ?? "кг", glueQty, glueCost);
      addSpec("material", "Грунтовка", summary.primer_unit, primerQty, primerCost);
      addSpec("material", "СВП", covering?.svp_unit ?? "шт", svpQty, svpCost);
      addSpec("material", "Затирка", covering?.grout_unit ?? "кг", groutQty, groutCost);
      addSpec("material", "Плинтус", "м.п.", plinthM, plinthMaterialCost);
      addSpec("work", "Монтаж плинтуса", "м.п.", plinthM, plinthInstallCost);
      addSpec("work", "Демонтаж напольного покрытия", "м²", effectiveArea, demolitionCost);
      addSpec("material", "Расход инструмента", "м²", effectiveArea, instrumentCost);
    }

    return {
      ...room,
      selected,
      covering_id: coveringId,
      covering_title: covering?.title ?? null,
      preparation_id: preparationId,
      preparation_title: preparation?.title ?? null,
      layout_id: layoutId,
      layout_title: layout?.title ?? null,
      effective_area_m2: effectiveArea,
      effective_perimeter_m: effectivePerimeter,
      plinth_m: plinthM,
      area_m2_override: areaOverride,
      perimeter_m_override: perimeterOverride,
      plinth_m_override: plinthOverride,
      base_waste_percent: baseWastePercent,
      extra_waste_percent: extraWastePercent,
      total_waste_percent: totalWastePercent,
      purchase_area_m2: purchaseArea,
      material_price_per_m2: materialPricePerM2,
      base_labor_price_per_m2: baseLaborPricePerM2,
      layout_multiplier: layoutMultiplier,
      labor_price_per_m2: laborPricePerM2,
      material_cost: materialCost,
      installation_cost: installationCost,
      preparation_work_cost: preparationWorkCost,
      preparation_material_cost: preparationMaterialCost,
      preparation_total_cost: preparationTotalCost,
      underlay_qty: underlayQty,
      underlay_cost: underlayCost,
      glue_qty: glueQty,
      glue_unit: covering?.glue_unit ?? "кг",
      glue_cost: glueCost,
      primer_qty: primerQty,
      primer_unit: summary.primer_unit,
      primer_cost: primerCost,
      svp_qty: svpQty,
      svp_unit: covering?.svp_unit ?? "шт",
      svp_cost: svpCost,
      grout_qty: groutQty,
      grout_unit: covering?.grout_unit ?? "кг",
      grout_cost: groutCost,
      plinth_material_cost: plinthMaterialCost,
      plinth_install_cost: plinthInstallCost,
      demolition_cost: demolitionCost,
      instrument_cost: instrumentCost,
      total_cost: totalCost,
      note: edit?.note ?? room.note,
    };
  });

  if (summary.rooms_count > 0 && summary.threshold_profile_count > 0) {
    summary.threshold_profile_cost = summary.threshold_profile_count * config.threshold_profile_price;
    addSpec("material", "Порожек / стыковочный профиль", "шт", summary.threshold_profile_count, summary.threshold_profile_cost);
  }

  summary.work_total =
    summary.total_installation_cost +
    summary.total_preparation_work_cost +
    summary.total_plinth_install_cost +
    summary.total_demolition_cost;
  summary.material_total =
    summary.total_material_cost +
    summary.total_preparation_material_cost +
    summary.total_underlay_cost +
    summary.total_glue_cost +
    summary.total_primer_cost +
    summary.total_svp_cost +
    summary.total_grout_cost +
    summary.total_plinth_material_cost +
    summary.threshold_profile_cost +
    summary.total_instrument_cost;
  summary.grand_total = summary.work_total + summary.material_total;
  summary.price_per_m2 = summary.total_area_m2 > 0 ? summary.grand_total / summary.total_area_m2 : null;

  return {
    config,
    coverings: detail.coverings,
    preparations: detail.preparations,
    layouts: detail.layouts,
    rooms,
    summary,
    specification: Array.from(specMap.values()),
  };
}

export function buildWallFinishPreview(
  detail: CalculatorWallFinishDetail,
  state: WallFinishEditState,
): CalculatorWallFinishDetail {
  const config: CalculatorWallFinishConfig = {
    project_id: detail.config.project_id,
    include_preparation: state.include_preparation,
    include_demolition: state.include_demolition,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? detail.config.demolition_price_per_m2),
  };

  const stateRooms = new Map(state.rooms.map((room) => [room.room_id, room]));
  const coveringsById = new Map(detail.coverings.map((item) => [item.id, item]));
  const preparationsById = new Map(detail.preparations.map((item) => [item.id, item]));
  const layoutsById = new Map(detail.layouts.map((item) => [item.id, item]));

  const summary: CalculatorWallFinishSummary = {
    rooms_count: 0,
    total_area_m2: 0,
    total_purchase_area_m2: 0,
    total_material_cost: 0,
    total_installation_cost: 0,
    total_preparation_work_cost: 0,
    total_preparation_material_cost: 0,
    total_preparation_cost: 0,
    total_glue_qty: 0,
    glue_unit: "кг",
    total_glue_cost: 0,
    total_primer_qty: 0,
    primer_unit: "л",
    total_primer_cost: 0,
    total_putty_qty: 0,
    putty_unit: "кг",
    total_putty_cost: 0,
    total_mesh_qty: 0,
    mesh_unit: "м²",
    total_mesh_cost: 0,
    total_demolition_cost: 0,
    total_instrument_cost: 0,
    work_total: 0,
    material_total: 0,
    grand_total: 0,
    price_per_m2: null,
  };

  const specMap = new Map<string, CalculatorWallFinishSpecItem>();
  const addSpec = (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => {
    if (quantity <= 0 || amount <= 0) {
      return;
    }
    const key = `${kind}|${title}|${unit}`;
    const current = specMap.get(key);
    if (current) {
      current.quantity += quantity;
      current.amount += amount;
      return;
    }
    specMap.set(key, { kind, title, unit, quantity, amount });
  };

  const rooms = detail.rooms.map((room) => {
    const edit = stateRooms.get(room.room_id);
    const selected = edit?.selected ?? room.selected;
    const coveringId = edit ? toInteger(edit.covering_id) : room.covering_id;
    const preparationId = edit ? toInteger(edit.preparation_id) : room.preparation_id;
    const layoutId = edit ? toInteger(edit.layout_id) : room.layout_id;
    const covering = coveringId === null ? null : coveringsById.get(coveringId) ?? null;
    const preparation = preparationId === null ? null : preparationsById.get(preparationId) ?? null;
    const layout = layoutId === null ? null : layoutsById.get(layoutId) ?? null;

    const areaOverride = edit ? toNumber(edit.area_m2_override) : room.area_m2_override;
    const effectiveArea = selected ? Math.max(0, areaOverride ?? room.base_area_m2) : 0;

    const baseWastePercent = covering?.base_waste_percent ?? 0;
    const extraWastePercent = layout?.extra_waste_percent ?? 0;
    const totalWastePercent = baseWastePercent + extraWastePercent;
    const purchaseArea = selected ? effectiveArea * (1 + totalWastePercent / 100) : 0;

    const materialPricePerM2 = covering?.material_price_per_m2 ?? 0;
    const baseLaborPricePerM2 = covering?.labor_price_per_m2 ?? 0;
    const layoutMultiplier = layout?.labor_multiplier ?? 1;
    const laborPricePerM2 = selected ? baseLaborPricePerM2 * layoutMultiplier : 0;

    const materialCost = purchaseArea * materialPricePerM2;
    const installationCost = effectiveArea * laborPricePerM2;

    let preparationWorkCost = 0;
    let preparationMaterialCost = 0;
    let preparationPrimerQty = 0;
    let preparationPrimerCost = 0;
    if (selected && preparation && Boolean(config.include_preparation)) {
      preparationWorkCost = effectiveArea * preparation.labor_price_per_m2;
      preparationMaterialCost = effectiveArea * preparation.material_price_per_m2;
      preparationPrimerQty = effectiveArea * preparation.primer_consumption_per_m2;
      preparationPrimerCost = preparationPrimerQty * preparation.primer_price_per_unit;
    }
    const preparationTotalCost = preparationWorkCost + preparationMaterialCost;

    const glueQty = selected && covering ? purchaseArea * covering.glue_consumption_per_m2 : 0;
    const glueCost = selected && covering ? glueQty * covering.glue_price_per_unit : 0;
    const coveringPrimerQty = selected && covering ? purchaseArea * covering.primer_consumption_per_m2 : 0;
    const coveringPrimerCost = selected && covering ? coveringPrimerQty * covering.primer_price_per_unit : 0;
    const primerQty = preparationPrimerQty + coveringPrimerQty;
    const primerCost = preparationPrimerCost + coveringPrimerCost;
    const puttyQty = selected && covering ? purchaseArea * covering.putty_consumption_per_m2 : 0;
    const puttyCost = selected && covering ? puttyQty * covering.putty_price_per_unit : 0;
    const meshQty = selected && covering ? purchaseArea * covering.mesh_consumption_per_m2 : 0;
    const meshCost = selected && covering ? meshQty * covering.mesh_price_per_unit : 0;
    const demolitionCost = selected && Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
    const instrumentCost = selected && covering ? effectiveArea * covering.instrument_price_per_m2 : 0;
    const totalCost =
      materialCost +
      installationCost +
      preparationTotalCost +
      glueCost +
      primerCost +
      puttyCost +
      meshCost +
      demolitionCost +
      instrumentCost;

    if (selected) {
      summary.rooms_count += 1;
      summary.total_area_m2 += effectiveArea;
      summary.total_purchase_area_m2 += purchaseArea;
      summary.total_material_cost += materialCost;
      summary.total_installation_cost += installationCost;
      summary.total_preparation_work_cost += preparationWorkCost;
      summary.total_preparation_material_cost += preparationMaterialCost;
      summary.total_preparation_cost += preparationTotalCost;
      summary.total_glue_qty += glueQty;
      summary.total_glue_cost += glueCost;
      summary.total_primer_qty += primerQty;
      summary.total_primer_cost += primerCost;
      summary.total_putty_qty += puttyQty;
      summary.total_putty_cost += puttyCost;
      summary.total_mesh_qty += meshQty;
      summary.total_mesh_cost += meshCost;
      summary.total_demolition_cost += demolitionCost;
      summary.total_instrument_cost += instrumentCost;
      if (covering?.glue_unit) {
        summary.glue_unit = covering.glue_unit;
      }
      if (preparation?.primer_unit) {
        summary.primer_unit = preparation.primer_unit;
      } else if (covering?.primer_unit) {
        summary.primer_unit = covering.primer_unit;
      }
      if (covering?.putty_unit) {
        summary.putty_unit = covering.putty_unit;
      }
      if (covering?.mesh_unit) {
        summary.mesh_unit = covering.mesh_unit;
      }

      const layoutTitle = layout?.title ?? "Базовая";
      const coveringTitle = covering?.title ?? "Отделка стен";
      addSpec("work", `Отделка стен: ${coveringTitle}, ${layoutTitle.toLowerCase()}`, "м²", effectiveArea, installationCost);
      addSpec("material", coveringTitle, "м²", purchaseArea, materialCost);
      if (preparation && Boolean(config.include_preparation)) {
        addSpec("work", `Подготовка стен: ${preparation.title}`, "м²", effectiveArea, preparationWorkCost);
        addSpec("material", `Материалы подготовки стен: ${preparation.title}`, "м²", effectiveArea, preparationMaterialCost);
      }
      addSpec("material", "Клей", summary.glue_unit, glueQty, glueCost);
      addSpec("material", "Грунтовка", summary.primer_unit, primerQty, primerCost);
      addSpec("material", "Шпаклёвка", summary.putty_unit, puttyQty, puttyCost);
      addSpec("material", "Стеклохолст / сетка", summary.mesh_unit, meshQty, meshCost);
      addSpec("work", "Демонтаж старой отделки стен", "м²", effectiveArea, demolitionCost);
      addSpec("material", "Расход инструмента", "м²", effectiveArea, instrumentCost);
    }

    return {
      ...room,
      selected,
      covering_id: coveringId,
      covering_title: covering?.title ?? null,
      preparation_id: preparationId,
      preparation_title: preparation?.title ?? null,
      layout_id: layoutId,
      layout_title: layout?.title ?? null,
      effective_area_m2: effectiveArea,
      area_m2_override: areaOverride,
      base_waste_percent: baseWastePercent,
      extra_waste_percent: extraWastePercent,
      total_waste_percent: totalWastePercent,
      purchase_area_m2: purchaseArea,
      material_price_per_m2: materialPricePerM2,
      base_labor_price_per_m2: baseLaborPricePerM2,
      layout_multiplier: layoutMultiplier,
      labor_price_per_m2: laborPricePerM2,
      material_cost: materialCost,
      installation_cost: installationCost,
      preparation_work_cost: preparationWorkCost,
      preparation_material_cost: preparationMaterialCost,
      preparation_total_cost: preparationTotalCost,
      glue_qty: glueQty,
      glue_unit: summary.glue_unit,
      glue_cost: glueCost,
      primer_qty: primerQty,
      primer_unit: summary.primer_unit,
      primer_cost: primerCost,
      putty_qty: puttyQty,
      putty_unit: summary.putty_unit,
      putty_cost: puttyCost,
      mesh_qty: meshQty,
      mesh_unit: summary.mesh_unit,
      mesh_cost: meshCost,
      demolition_cost: demolitionCost,
      instrument_cost: instrumentCost,
      total_cost: totalCost,
      note: edit?.note ?? room.note,
    };
  });

  summary.work_total = summary.total_installation_cost + summary.total_preparation_work_cost + summary.total_demolition_cost;
  summary.material_total =
    summary.total_material_cost +
    summary.total_preparation_material_cost +
    summary.total_glue_cost +
    summary.total_primer_cost +
    summary.total_putty_cost +
    summary.total_mesh_cost +
    summary.total_instrument_cost;
  summary.grand_total = summary.work_total + summary.material_total;
  summary.price_per_m2 = summary.total_area_m2 > 0 ? summary.grand_total / summary.total_area_m2 : null;

  return {
    config,
    coverings: detail.coverings,
    preparations: detail.preparations,
    layouts: detail.layouts,
    rooms,
    summary,
    specification: Array.from(specMap.values()),
  };
}
