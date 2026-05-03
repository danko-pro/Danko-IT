import { toInteger, toNumber } from "../shared";
import type {
  CalculatorWallFinishConfig,
  CalculatorWallFinishCovering,
  CalculatorWallFinishCoveringConsumable,
  CalculatorWallFinishDetail,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishRoom,
  CalculatorWallFinishSummary,
  WallFinishEditState,
} from "./model";
import {
  appendRoomSpec,
  applySummaryUnits,
  type WallFinishConsumables,
  type WallFinishPreparationCosts,
  updateSummary,
} from "./preview-room-effects";
import type { WallFinishSpecCollector } from "./preview-summary";

type BuildWallFinishPreviewRoomsArgs = {
  detail: CalculatorWallFinishDetail;
  state: WallFinishEditState;
  config: CalculatorWallFinishConfig;
  summary: CalculatorWallFinishSummary;
  specCollector: WallFinishSpecCollector;
};

export function buildWallFinishPreviewRooms(args: BuildWallFinishPreviewRoomsArgs): CalculatorWallFinishRoom[] {
  const { detail, state, config, summary, specCollector } = args;
  const stateRooms = new Map(state.rooms.map((room) => [room.room_id, room]));
  const coveringsById = new Map(detail.coverings.map((item) => [item.id, item]));
  const preparationsById = new Map(detail.preparations.map((item) => [item.id, item]));
  const layoutsById = new Map(detail.layouts.map((item) => [item.id, item]));

  return detail.rooms.map((room) => {
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
    const preparationCosts = calculatePreparationCosts(selected, effectiveArea, preparation, config);
    const consumables = calculateConsumables(selected, purchaseArea, covering, preparationCosts.primerQty, preparationCosts.primerCost);
    const demolitionCost = selected && Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
    const instrumentCost = selected && covering ? effectiveArea * covering.instrument_price_per_m2 : 0;
    const totalCost =
      materialCost +
      installationCost +
      preparationCosts.totalCost +
      consumables.glueCost +
      consumables.primerCost +
      consumables.puttyCost +
      consumables.meshCost +
      consumables.customCost +
      demolitionCost +
      instrumentCost;

    if (selected) {
      const effects = {
        config,
        summary,
        covering,
        preparation,
        layout,
        effectiveArea,
        purchaseArea,
        materialCost,
        installationCost,
        demolitionCost,
        instrumentCost,
        preparationCosts,
        consumables,
      };
      updateSummary(summary, effects);
      applySummaryUnits(summary, covering, preparation);
      appendRoomSpec(specCollector, effects);
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
      preparation_work_cost: preparationCosts.workCost,
      preparation_material_cost: preparationCosts.materialCost,
      preparation_total_cost: preparationCosts.totalCost,
      glue_qty: consumables.glueQty,
      glue_unit: summary.glue_unit,
      glue_cost: consumables.glueCost,
      primer_qty: consumables.primerQty,
      primer_unit: summary.primer_unit,
      primer_cost: consumables.primerCost,
      putty_qty: consumables.puttyQty,
      putty_unit: summary.putty_unit,
      putty_cost: consumables.puttyCost,
      mesh_qty: consumables.meshQty,
      mesh_unit: summary.mesh_unit,
      mesh_cost: consumables.meshCost,
      custom_consumables_cost: consumables.customCost,
      demolition_cost: demolitionCost,
      instrument_cost: instrumentCost,
      total_cost: totalCost,
      note: edit?.note ?? room.note,
    };
  });
}

function calculatePreparationCosts(
  selected: boolean,
  effectiveArea: number,
  preparation: CalculatorWallFinishPreparation | null,
  config: CalculatorWallFinishConfig,
): WallFinishPreparationCosts {
  if (!selected || !preparation || !Boolean(config.include_preparation)) {
    return { workCost: 0, materialCost: 0, primerQty: 0, primerCost: 0, totalCost: 0 };
  }

  const workCost = effectiveArea * preparation.labor_price_per_m2;
  const materialCost = effectiveArea * preparation.material_price_per_m2;
  const primerQty = effectiveArea * preparation.primer_consumption_per_m2;
  const primerCost = primerQty * preparation.primer_price_per_unit;
  return { workCost, materialCost, primerQty, primerCost, totalCost: workCost + materialCost };
}

function calculateConsumables(
  selected: boolean,
  purchaseArea: number,
  covering: CalculatorWallFinishCovering | null,
  preparationPrimerQty: number,
  preparationPrimerCost: number,
): WallFinishConsumables {
  const glueQty = selected && covering ? purchaseArea * covering.glue_consumption_per_m2 : 0;
  const glueCost = selected && covering ? glueQty * covering.glue_price_per_unit : 0;
  const coveringPrimerQty = selected && covering ? purchaseArea * covering.primer_consumption_per_m2 : 0;
  const coveringPrimerCost = selected && covering ? coveringPrimerQty * covering.primer_price_per_unit : 0;
  const puttyQty = selected && covering ? purchaseArea * covering.putty_consumption_per_m2 : 0;
  const puttyCost = selected && covering ? puttyQty * covering.putty_price_per_unit : 0;
  const meshQty = selected && covering ? purchaseArea * covering.mesh_consumption_per_m2 : 0;
  const meshCost = selected && covering ? meshQty * covering.mesh_price_per_unit : 0;
  const customItems = selected && covering ? calculateCustomConsumables(purchaseArea, covering) : [];

  return {
    glueQty,
    glueCost,
    primerQty: preparationPrimerQty + coveringPrimerQty,
    primerCost: preparationPrimerCost + coveringPrimerCost,
    puttyQty,
    puttyCost,
    meshQty,
    meshCost,
    customItems,
    customCost: customItems.reduce((sum, item) => sum + item.cost, 0),
  };
}

function calculateCustomConsumables(purchaseArea: number, covering: CalculatorWallFinishCovering) {
  return parseCustomConsumables(covering.custom_consumables_json).map((item) => {
    const quantity = purchaseArea * item.consumption_per_m2;
    return { title: item.title, unit: item.unit, quantity, cost: quantity * item.price_per_unit };
  });
}

function parseCustomConsumables(raw: string): CalculatorWallFinishCoveringConsumable[] {
  try {
    const items = JSON.parse(raw || "[]") as CalculatorWallFinishCoveringConsumable[];
    return items.filter((item) => item.title?.trim());
  } catch {
    return [];
  }
}
