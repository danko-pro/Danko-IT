import { toInteger, toNumber } from "../shared";
import type {
  CalculatorWallFinishDetail,
  CalculatorWallFinishRoom,
  CalculatorWallFinishSummary,
  WallFinishEditState,
} from "./model";
import { calculateWallFinishConsumables, calculateWallFinishPreparationCosts } from "./preview-calculations";
import { appendRoomSpec, applySummaryUnits, updateSummary } from "./preview-room-effects";
import type { WallFinishSpecCollector } from "./preview-summary";

type ZonePreviewArgs = {
  room: CalculatorWallFinishRoom;
  edit: WallFinishEditState["rooms"][number];
  zones: NonNullable<WallFinishEditState["rooms"][number]["zones"]>;
  detail: CalculatorWallFinishDetail;
  config: CalculatorWallFinishDetail["config"];
  summary: CalculatorWallFinishSummary;
  specCollector: WallFinishSpecCollector;
  selected: boolean;
  effectiveArea: number;
  areaOverride: number | null;
};

export function buildWallFinishZonePreviewRoom(args: ZonePreviewArgs): CalculatorWallFinishRoom {
  const { room, edit, zones, detail, config, summary, specCollector, selected, effectiveArea } = args;
  const coveringsById = new Map(detail.coverings.map((item) => [item.id, item]));
  const preparationsById = new Map(detail.preparations.map((item) => [item.id, item]));
  const layoutsById = new Map(detail.layouts.map((item) => [item.id, item]));
  let availableArea = effectiveArea;
  const zonePreviews = zones.map((zone, index) => {
    const coveringId = toInteger(zone.covering_id);
    const preparationId = toInteger(zone.preparation_id);
    const layoutId = toInteger(zone.layout_id);
    const covering = coveringId === null ? null : coveringsById.get(coveringId) ?? null;
    const preparation = preparationId === null ? null : preparationsById.get(preparationId) ?? null;
    const layout = layoutId === null ? null : layoutsById.get(layoutId) ?? null;
    const areaInput = toNumber(zone.area_m2);
    const requestedArea = zones.length === 1 && areaInput === null ? effectiveArea : Math.max(0, areaInput ?? 0);
    const area = Math.min(requestedArea, Math.max(0, availableArea));
    availableArea -= area;
    const waste = (covering?.base_waste_percent ?? 0) + (layout?.extra_waste_percent ?? 0);
    const purchaseArea = area * (1 + waste / 100);
    const materialCost = purchaseArea * (covering?.material_price_per_m2 ?? 0);
    const laborPrice = (covering?.labor_price_per_m2 ?? 0) * (layout?.labor_multiplier ?? 1);
    const installationCost = area * laborPrice;
    const preparationCosts = calculateWallFinishPreparationCosts(selected, area, preparation, config);
    const consumables = calculateWallFinishConsumables(selected, purchaseArea, covering, preparationCosts.primerQty, preparationCosts.primerCost);
    const instrumentCost = covering ? area * covering.instrument_price_per_m2 : 0;
    const totalCost =
      materialCost +
      installationCost +
      preparationCosts.totalCost +
      consumables.glueCost +
      consumables.primerCost +
      consumables.puttyCost +
      consumables.meshCost +
      consumables.customCost +
      instrumentCost;
    const effects = {
      config,
      summary,
      covering,
      preparation,
      layout,
      effectiveArea: area,
      purchaseArea,
      materialCost,
      installationCost,
      demolitionCost: 0,
      instrumentCost,
      preparationCosts,
      consumables,
    };
    updateSummary(summary, effects);
    applySummaryUnits(summary, covering, preparation);
    appendRoomSpec(specCollector, effects);
    return {
      id: Number(zone.id) || index + 1,
      covering_id: coveringId,
      covering_title: covering?.title ?? null,
      preparation_id: preparationId,
      preparation_title: preparation?.title ?? null,
      layout_id: layoutId,
      layout_title: layout?.title ?? null,
      area_m2: areaInput,
      effective_area_m2: area,
      purchase_area_m2: purchaseArea,
      total_cost: totalCost,
      note: zone.note || null,
      materialCost,
      installationCost,
      preparationCosts,
      consumables,
      instrumentCost,
    };
  });
  if (zonePreviews.length > 1) summary.rooms_count -= zonePreviews.length - 1;
  const demolitionCost = Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
  summary.total_demolition_cost += demolitionCost;
  specCollector.addSpec("work", "Демонтаж старой отделки стен", "м²", effectiveArea, demolitionCost);

  const sum = (pick: (zone: (typeof zonePreviews)[number]) => number) =>
    zonePreviews.reduce((total, zone) => total + pick(zone), 0);
  const first = zonePreviews[0];
  const totals = {
    material: sum((zone) => zone.materialCost),
    installation: sum((zone) => zone.installationCost),
    prepWork: sum((zone) => zone.preparationCosts.workCost),
    prepMaterial: sum((zone) => zone.preparationCosts.materialCost),
    prepTotal: sum((zone) => zone.preparationCosts.totalCost),
    glueQty: sum((zone) => zone.consumables.glueQty),
    glueCost: sum((zone) => zone.consumables.glueCost),
    primerQty: sum((zone) => zone.consumables.primerQty),
    primerCost: sum((zone) => zone.consumables.primerCost),
    puttyQty: sum((zone) => zone.consumables.puttyQty),
    puttyCost: sum((zone) => zone.consumables.puttyCost),
    meshQty: sum((zone) => zone.consumables.meshQty),
    meshCost: sum((zone) => zone.consumables.meshCost),
    customCost: sum((zone) => zone.consumables.customCost),
    instrument: sum((zone) => zone.instrumentCost),
    purchaseArea: sum((zone) => zone.purchase_area_m2),
  };
  const totalCost =
    totals.material +
    totals.installation +
    totals.prepTotal +
    totals.glueCost +
    totals.primerCost +
    totals.puttyCost +
    totals.meshCost +
    totals.customCost +
    demolitionCost +
    totals.instrument;
  return {
    ...room,
    selected,
    covering_id: first?.covering_id ?? null,
    covering_title: first?.covering_title ?? null,
    preparation_id: first?.preparation_id ?? null,
    preparation_title: first?.preparation_title ?? null,
    layout_id: first?.layout_id ?? null,
    layout_title: first?.layout_title ?? null,
    effective_area_m2: effectiveArea,
    area_m2_override: args.areaOverride,
    base_waste_percent: 0,
    extra_waste_percent: 0,
    total_waste_percent: 0,
    purchase_area_m2: totals.purchaseArea,
    material_price_per_m2: 0,
    base_labor_price_per_m2: 0,
    layout_multiplier: 1,
    labor_price_per_m2: 0,
    material_cost: totals.material,
    installation_cost: totals.installation,
    preparation_work_cost: totals.prepWork,
    preparation_material_cost: totals.prepMaterial,
    preparation_total_cost: totals.prepTotal,
    glue_qty: totals.glueQty,
    glue_unit: summary.glue_unit,
    glue_cost: totals.glueCost,
    primer_qty: totals.primerQty,
    primer_unit: summary.primer_unit,
    primer_cost: totals.primerCost,
    putty_qty: totals.puttyQty,
    putty_unit: summary.putty_unit,
    putty_cost: totals.puttyCost,
    mesh_qty: totals.meshQty,
    mesh_unit: summary.mesh_unit,
    mesh_cost: totals.meshCost,
    custom_consumables_cost: totals.customCost,
    demolition_cost: demolitionCost,
    instrument_cost: totals.instrument,
    total_cost: totalCost,
    note: edit.note ?? room.note,
    zones: zonePreviews.map(({ materialCost, installationCost, preparationCosts, consumables, instrumentCost, ...zone }) => zone),
  };
}
