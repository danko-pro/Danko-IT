import { toInteger, toNumber } from "../shared";
import type {
  CalculatorFlooringConfig,
  CalculatorFlooringDetail,
  CalculatorFlooringRoom,
  CalculatorFlooringSummary,
  FlooringEditState,
} from "./model";
import { calculateConsumables, calculatePlinth, calculatePreparationCosts, calculateUnderlay } from "./preview-calculations";
import {
  appendRoomSpec,
  applySummaryUnits,
  updateSummary,
} from "./preview-room-effects";
import { buildFlooringZonePreviewRoom } from "./preview-zones";
import type { FlooringSpecCollector } from "./preview-summary";

type BuildFlooringPreviewRoomsArgs = {
  detail: CalculatorFlooringDetail;
  state: FlooringEditState;
  config: CalculatorFlooringConfig;
  summary: CalculatorFlooringSummary;
  specCollector: FlooringSpecCollector;
};

export function buildFlooringPreviewRooms(args: BuildFlooringPreviewRoomsArgs): CalculatorFlooringRoom[] {
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
    const perimeterOverride = edit ? toNumber(edit.perimeter_m_override) : room.perimeter_m_override;
    const plinthOverride = edit ? toNumber(edit.plinth_m_override) : room.plinth_m_override;
    const effectiveArea = selected ? Math.max(0, areaOverride ?? room.base_area_m2) : 0;
    const effectivePerimeter = selected ? Math.max(0, perimeterOverride ?? room.base_perimeter_m) : 0;
    const plinthBase = selected ? Math.max(0, plinthOverride ?? effectivePerimeter) : 0;
    const zones = edit?.zones ?? [];
    if (selected && zones.length > 0) {
      return buildFlooringZonePreviewRoom({
        room,
        edit: edit!,
        zones,
        detail,
        config,
        summary,
        specCollector,
        selected,
        effectiveArea,
        effectivePerimeter,
        plinthBase,
        areaOverride,
        perimeterOverride,
        plinthOverride,
      });
    }
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
    const underlay = calculateUnderlay(selected, effectiveArea, covering, config);
    const consumables = calculateConsumables(selected, purchaseArea, covering, preparationCosts.primerQty, preparationCosts.primerCost);
    const plinth = calculatePlinth(selected, plinthBase, covering, config);
    const demolitionCost = selected && Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
    const instrumentCost = selected && covering ? effectiveArea * covering.instrument_price_per_m2 : 0;
    const totalCost =
      materialCost +
      installationCost +
      preparationCosts.totalCost +
      underlay.cost +
      consumables.glueCost +
      consumables.primerCost +
      consumables.svpCost +
      consumables.groutCost +
      consumables.customCost +
      plinth.materialCost +
      plinth.installCost +
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
        effectivePerimeter,
        purchaseArea,
        materialCost,
        installationCost,
        demolitionCost,
        instrumentCost,
        preparationCosts,
        underlay,
        consumables,
        plinth,
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
      effective_perimeter_m: effectivePerimeter,
      plinth_m: plinth.meters,
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
      preparation_work_cost: preparationCosts.workCost,
      preparation_material_cost: preparationCosts.materialCost,
      preparation_total_cost: preparationCosts.totalCost,
      underlay_qty: underlay.quantity,
      underlay_cost: underlay.cost,
      glue_qty: consumables.glueQty,
      glue_unit: covering?.glue_unit ?? "кг",
      glue_cost: consumables.glueCost,
      primer_qty: consumables.primerQty,
      primer_unit: summary.primer_unit,
      primer_cost: consumables.primerCost,
      svp_qty: consumables.svpQty,
      svp_unit: covering?.svp_unit ?? "шт",
      svp_cost: consumables.svpCost,
      grout_qty: consumables.groutQty,
      grout_unit: covering?.grout_unit ?? "кг",
      grout_cost: consumables.groutCost,
      custom_consumables_cost: consumables.customCost,
      plinth_material_cost: plinth.materialCost,
      plinth_install_cost: plinth.installCost,
      demolition_cost: demolitionCost,
      instrument_cost: instrumentCost,
      total_cost: totalCost,
      note: edit?.note ?? room.note,
      zones: [
        {
          id: 1,
          covering_id: coveringId,
          covering_title: covering?.title ?? null,
          preparation_id: preparationId,
          preparation_title: preparation?.title ?? null,
          layout_id: layoutId,
          layout_title: layout?.title ?? null,
          area_m2: null,
          effective_area_m2: effectiveArea,
          purchase_area_m2: purchaseArea,
          total_cost: totalCost,
          note: edit?.note ?? room.note,
        },
      ],
    };
  });
}
