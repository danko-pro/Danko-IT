import { toInteger, toNumber } from "../shared";
import type {
  CalculatorFlooringConfig,
  CalculatorFlooringCovering,
  CalculatorFlooringDetail,
  CalculatorFlooringRoom,
  CalculatorFlooringSummary,
  FlooringEditState,
} from "./model";
import { appendRoomSpec, applySummaryUnits } from "./preview-room-effects";
import type { FlooringSpecCollector } from "./preview-summary";
import { calculateConsumables, calculatePlinth, calculatePreparationCosts, calculateUnderlay } from "./preview-calculations";

type ZonePreviewArgs = {
  room: CalculatorFlooringRoom;
  edit: FlooringEditState["rooms"][number];
  zones: NonNullable<FlooringEditState["rooms"][number]["zones"]>;
  detail: CalculatorFlooringDetail;
  config: CalculatorFlooringConfig;
  summary: CalculatorFlooringSummary;
  specCollector: FlooringSpecCollector;
  selected: boolean;
  effectiveArea: number;
  effectivePerimeter: number;
  plinthBase: number;
  areaOverride: number | null;
  perimeterOverride: number | null;
  plinthOverride: number | null;
};

export function buildFlooringZonePreviewRoom(args: ZonePreviewArgs): CalculatorFlooringRoom {
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
    const preparationCosts = calculatePreparationCosts(selected, area, preparation, config);
    const underlay = calculateUnderlay(selected, area, covering, config);
    const consumables = calculateConsumables(selected, purchaseArea, covering, preparationCosts.primerQty, preparationCosts.primerCost);
    const instrumentCost = covering ? area * covering.instrument_price_per_m2 : 0;
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
      instrumentCost;
    const effects = {
      config,
      summary,
      covering,
      preparation,
      layout,
      effectiveArea: area,
      effectivePerimeter: 0,
      purchaseArea,
      materialCost,
      installationCost,
      demolitionCost: 0,
      instrumentCost,
      preparationCosts,
      underlay,
      consumables,
      plinth: { meters: 0, materialCost: 0, installCost: 0 },
    };
    summary.rooms_count += 1;
    summary.total_area_m2 += area;
    summary.total_purchase_area_m2 += purchaseArea;
    summary.total_material_cost += materialCost;
    summary.total_installation_cost += installationCost;
    summary.total_preparation_work_cost += preparationCosts.workCost;
    summary.total_preparation_material_cost += preparationCosts.materialCost;
    summary.total_preparation_cost += preparationCosts.totalCost;
    summary.total_underlay_qty += underlay.quantity;
    summary.total_underlay_cost += underlay.cost;
    summary.total_glue_qty += consumables.glueQty;
    summary.total_glue_cost += consumables.glueCost;
    summary.total_primer_qty += consumables.primerQty;
    summary.total_primer_cost += consumables.primerCost;
    summary.total_svp_qty += consumables.svpQty;
    summary.total_svp_cost += consumables.svpCost;
    summary.total_grout_qty += consumables.groutQty;
    summary.total_grout_cost += consumables.groutCost;
    summary.total_custom_consumables_cost += consumables.customCost;
    summary.total_instrument_cost += instrumentCost;
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
      underlay,
      consumables,
      instrumentCost,
    };
  });
  if (zonePreviews.length > 1) summary.rooms_count -= zonePreviews.length - 1;
  const covering = findPlinthCovering(zonePreviews, coveringsById);
  const plinth = calculatePlinth(selected, args.plinthBase, covering, config);
  const demolitionCost = Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
  summary.total_plinth_m += plinth.meters;
  summary.total_plinth_material_cost += plinth.materialCost;
  summary.total_plinth_install_cost += plinth.installCost;
  summary.total_demolition_cost += demolitionCost;
  summary.total_perimeter_m += args.effectivePerimeter;
  specCollector.addSpec("material", "Плинтус", "м.п.", plinth.meters, plinth.materialCost);
  specCollector.addSpec("work", "Монтаж плинтуса", "м.п.", plinth.meters, plinth.installCost);
  specCollector.addSpec("work", "Демонтаж напольного покрытия", "м²", effectiveArea, demolitionCost);
  const sum = (pick: (zone: (typeof zonePreviews)[number]) => number) => zonePreviews.reduce((total, zone) => total + pick(zone), 0);
  const first = zonePreviews[0];
  const totals = {
    material: sum((zone) => zone.materialCost),
    installation: sum((zone) => zone.installationCost),
    prepWork: sum((zone) => zone.preparationCosts.workCost),
    prepMaterial: sum((zone) => zone.preparationCosts.materialCost),
    prepTotal: sum((zone) => zone.preparationCosts.totalCost),
    underlayQty: sum((zone) => zone.underlay.quantity),
    underlayCost: sum((zone) => zone.underlay.cost),
    glueQty: sum((zone) => zone.consumables.glueQty),
    glueCost: sum((zone) => zone.consumables.glueCost),
    primerQty: sum((zone) => zone.consumables.primerQty),
    primerCost: sum((zone) => zone.consumables.primerCost),
    svpQty: sum((zone) => zone.consumables.svpQty),
    svpCost: sum((zone) => zone.consumables.svpCost),
    groutQty: sum((zone) => zone.consumables.groutQty),
    groutCost: sum((zone) => zone.consumables.groutCost),
    customCost: sum((zone) => zone.consumables.customCost),
    instrument: sum((zone) => zone.instrumentCost),
    purchaseArea: sum((zone) => zone.purchase_area_m2),
  };
  const totalCost =
    totals.material +
    totals.installation +
    totals.prepTotal +
    totals.underlayCost +
    totals.glueCost +
    totals.primerCost +
    totals.svpCost +
    totals.groutCost +
    totals.customCost +
    plinth.materialCost +
    plinth.installCost +
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
    effective_perimeter_m: args.effectivePerimeter,
    plinth_m: plinth.meters,
    area_m2_override: args.areaOverride,
    perimeter_m_override: args.perimeterOverride,
    plinth_m_override: args.plinthOverride,
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
    underlay_qty: totals.underlayQty,
    underlay_cost: totals.underlayCost,
    glue_qty: totals.glueQty,
    glue_unit: summary.glue_unit,
    glue_cost: totals.glueCost,
    primer_qty: totals.primerQty,
    primer_unit: summary.primer_unit,
    primer_cost: totals.primerCost,
    svp_qty: totals.svpQty,
    svp_unit: summary.svp_unit,
    svp_cost: totals.svpCost,
    grout_qty: totals.groutQty,
    grout_unit: summary.grout_unit,
    grout_cost: totals.groutCost,
    custom_consumables_cost: totals.customCost,
    plinth_material_cost: plinth.materialCost,
    plinth_install_cost: plinth.installCost,
    demolition_cost: demolitionCost,
    instrument_cost: totals.instrument,
    total_cost: totalCost,
    note: edit.note ?? room.note,
    zones: zonePreviews.map(({ materialCost, installationCost, preparationCosts, underlay, consumables, instrumentCost, ...zone }) => zone),
  };
}

function findPlinthCovering(
  zones: Array<{ covering_id: number | null }>,
  coveringsById: Map<number, CalculatorFlooringCovering>,
): CalculatorFlooringCovering | null {
  return (
    zones
      .map((zone) => (zone.covering_id === null ? null : coveringsById.get(zone.covering_id) ?? null))
      .find((covering) => Boolean(covering?.needs_plinth)) ?? null
  );
}
