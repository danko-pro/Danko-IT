import { toInteger, toNumber, trimFloat } from "./calculator-shared";
import type {
  CalculatorWallFinishConfig,
  CalculatorWallFinishDetail,
  CalculatorWallFinishSpecItem,
  CalculatorWallFinishSummary,
  WallFinishEditState,
} from "./calculator-types";

// Расчёты и draft-состояние для отделки стен.
// Модуль изолирует wall-finish математику, чтобы контроллеры и экран не знали лишних деталей.

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
