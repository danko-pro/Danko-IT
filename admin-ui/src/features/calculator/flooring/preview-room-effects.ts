import type {
  CalculatorFlooringConfig,
  CalculatorFlooringCovering,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  CalculatorFlooringSummary,
} from "./model";
import type { FlooringSpecCollector } from "./preview-summary";

export type FlooringPreparationCosts = {
  workCost: number;
  materialCost: number;
  primerQty: number;
  primerCost: number;
  totalCost: number;
};

export type FlooringUnderlay = {
  quantity: number;
  cost: number;
};

export type FlooringConsumables = {
  glueQty: number;
  glueCost: number;
  primerQty: number;
  primerCost: number;
  svpQty: number;
  svpCost: number;
  groutQty: number;
  groutCost: number;
};

export type FlooringPlinth = {
  meters: number;
  materialCost: number;
  installCost: number;
};

type FlooringSelectedRoomEffects = {
  config: CalculatorFlooringConfig;
  summary: CalculatorFlooringSummary;
  covering: CalculatorFlooringCovering | null;
  preparation: CalculatorFlooringPreparation | null;
  layout: CalculatorFlooringLayout | null;
  effectiveArea: number;
  purchaseArea: number;
  materialCost: number;
  installationCost: number;
  demolitionCost: number;
  instrumentCost: number;
  preparationCosts: FlooringPreparationCosts;
  underlay: FlooringUnderlay;
  consumables: FlooringConsumables;
  plinth: FlooringPlinth;
};

export function updateSummary(summary: CalculatorFlooringSummary, values: FlooringSelectedRoomEffects) {
  summary.rooms_count += 1;
  summary.total_area_m2 += values.effectiveArea;
  summary.total_purchase_area_m2 += values.purchaseArea;
  summary.total_material_cost += values.materialCost;
  summary.total_installation_cost += values.installationCost;
  summary.total_preparation_work_cost += values.preparationCosts.workCost;
  summary.total_preparation_material_cost += values.preparationCosts.materialCost;
  summary.total_preparation_cost += values.preparationCosts.totalCost;
  summary.total_underlay_qty += values.underlay.quantity;
  summary.total_underlay_cost += values.underlay.cost;
  summary.total_glue_qty += values.consumables.glueQty;
  summary.total_glue_cost += values.consumables.glueCost;
  summary.total_primer_qty += values.consumables.primerQty;
  summary.total_primer_cost += values.consumables.primerCost;
  summary.total_svp_qty += values.consumables.svpQty;
  summary.total_svp_cost += values.consumables.svpCost;
  summary.total_grout_qty += values.consumables.groutQty;
  summary.total_grout_cost += values.consumables.groutCost;
  summary.total_plinth_m += values.plinth.meters;
  summary.total_plinth_material_cost += values.plinth.materialCost;
  summary.total_plinth_install_cost += values.plinth.installCost;
  summary.total_demolition_cost += values.demolitionCost;
  summary.total_instrument_cost += values.instrumentCost;
}

export function applySummaryUnits(
  summary: CalculatorFlooringSummary,
  covering: CalculatorFlooringCovering | null,
  preparation: CalculatorFlooringPreparation | null,
) {
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
}

export function appendRoomSpec(specCollector: FlooringSpecCollector, values: FlooringSelectedRoomEffects) {
  const layoutTitle = values.layout?.title ?? "Прямая";
  const coveringTitle = values.covering?.title ?? "Покрытие";
  specCollector.addSpec("work", `Укладка ${coveringTitle}, ${layoutTitle.toLowerCase()}`, "м²", values.effectiveArea, values.installationCost);
  specCollector.addSpec("material", coveringTitle, "м²", values.purchaseArea, values.materialCost);

  if (values.preparation && Boolean(values.config.include_preparation)) {
    specCollector.addSpec("work", `Подготовка основания: ${values.preparation.title}`, "м²", values.effectiveArea, values.preparationCosts.workCost);
    specCollector.addSpec(
      "material",
      `Материалы подготовки: ${values.preparation.title}`,
      "м²",
      values.effectiveArea,
      values.preparationCosts.materialCost,
    );
  }

  specCollector.addSpec("material", "Подложка", "м²", values.underlay.quantity, values.underlay.cost);
  specCollector.addSpec("material", "Клей", values.covering?.glue_unit ?? "кг", values.consumables.glueQty, values.consumables.glueCost);
  specCollector.addSpec("material", "Грунтовка", values.summary.primer_unit, values.consumables.primerQty, values.consumables.primerCost);
  specCollector.addSpec("material", "СВП", values.covering?.svp_unit ?? "шт", values.consumables.svpQty, values.consumables.svpCost);
  specCollector.addSpec("material", "Затирка", values.covering?.grout_unit ?? "кг", values.consumables.groutQty, values.consumables.groutCost);
  specCollector.addSpec("material", "Плинтус", "м.п.", values.plinth.meters, values.plinth.materialCost);
  specCollector.addSpec("work", "Монтаж плинтуса", "м.п.", values.plinth.meters, values.plinth.installCost);
  specCollector.addSpec("work", "Демонтаж напольного покрытия", "м²", values.effectiveArea, values.demolitionCost);
  specCollector.addSpec("material", "Расход инструмента", "м²", values.effectiveArea, values.instrumentCost);
}
