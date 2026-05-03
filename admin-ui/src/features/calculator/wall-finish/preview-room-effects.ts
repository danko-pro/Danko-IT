import type {
  CalculatorWallFinishConfig,
  CalculatorWallFinishCovering,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishSummary,
} from "./model";
import type { WallFinishSpecCollector } from "./preview-summary";

export type WallFinishPreparationCosts = {
  workCost: number;
  materialCost: number;
  primerQty: number;
  primerCost: number;
  totalCost: number;
};

export type WallFinishConsumables = {
  glueQty: number;
  glueCost: number;
  primerQty: number;
  primerCost: number;
  puttyQty: number;
  puttyCost: number;
  meshQty: number;
  meshCost: number;
  customItems: Array<{ title: string; unit: string; quantity: number; cost: number }>;
  customCost: number;
};

type WallFinishSelectedRoomEffects = {
  config: CalculatorWallFinishConfig;
  summary: CalculatorWallFinishSummary;
  covering: CalculatorWallFinishCovering | null;
  preparation: CalculatorWallFinishPreparation | null;
  layout: CalculatorWallFinishLayout | null;
  effectiveArea: number;
  purchaseArea: number;
  materialCost: number;
  installationCost: number;
  demolitionCost: number;
  instrumentCost: number;
  preparationCosts: WallFinishPreparationCosts;
  consumables: WallFinishConsumables;
};

export function updateSummary(summary: CalculatorWallFinishSummary, values: WallFinishSelectedRoomEffects) {
  summary.rooms_count += 1;
  summary.total_area_m2 += values.effectiveArea;
  summary.total_purchase_area_m2 += values.purchaseArea;
  summary.total_material_cost += values.materialCost;
  summary.total_installation_cost += values.installationCost;
  summary.total_preparation_work_cost += values.preparationCosts.workCost;
  summary.total_preparation_material_cost += values.preparationCosts.materialCost;
  summary.total_preparation_cost += values.preparationCosts.totalCost;
  summary.total_glue_qty += values.consumables.glueQty;
  summary.total_glue_cost += values.consumables.glueCost;
  summary.total_primer_qty += values.consumables.primerQty;
  summary.total_primer_cost += values.consumables.primerCost;
  summary.total_putty_qty += values.consumables.puttyQty;
  summary.total_putty_cost += values.consumables.puttyCost;
  summary.total_mesh_qty += values.consumables.meshQty;
  summary.total_mesh_cost += values.consumables.meshCost;
  summary.total_custom_consumables_cost += values.consumables.customCost;
  summary.total_demolition_cost += values.demolitionCost;
  summary.total_instrument_cost += values.instrumentCost;
}

export function applySummaryUnits(
  summary: CalculatorWallFinishSummary,
  covering: CalculatorWallFinishCovering | null,
  preparation: CalculatorWallFinishPreparation | null,
) {
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
}

export function appendRoomSpec(specCollector: WallFinishSpecCollector, values: WallFinishSelectedRoomEffects) {
  const layoutTitle = values.layout?.title ?? "Базовая";
  const coveringTitle = values.covering?.title ?? "Отделка стен";
  specCollector.addSpec("work", `Отделка стен: ${coveringTitle}, ${layoutTitle.toLowerCase()}`, "м²", values.effectiveArea, values.installationCost);
  specCollector.addSpec("material", coveringTitle, "м²", values.purchaseArea, values.materialCost);

  if (values.preparation && Boolean(values.config.include_preparation)) {
    specCollector.addSpec("work", `Подготовка стен: ${values.preparation.title}`, "м²", values.effectiveArea, values.preparationCosts.workCost);
    specCollector.addSpec(
      "material",
      `Материалы подготовки стен: ${values.preparation.title}`,
      "м²",
      values.effectiveArea,
      values.preparationCosts.materialCost,
    );
  }

  specCollector.addSpec("material", "Клей", values.summary.glue_unit, values.consumables.glueQty, values.consumables.glueCost);
  specCollector.addSpec("material", "Грунтовка", values.summary.primer_unit, values.consumables.primerQty, values.consumables.primerCost);
  specCollector.addSpec("material", "Шпаклёвка", values.summary.putty_unit, values.consumables.puttyQty, values.consumables.puttyCost);
  specCollector.addSpec("material", "Стеклохолст / сетка", values.summary.mesh_unit, values.consumables.meshQty, values.consumables.meshCost);
  values.consumables.customItems.forEach((item) => {
    specCollector.addSpec("material", item.title, item.unit, item.quantity, item.cost);
  });
  specCollector.addSpec("work", "Демонтаж старой отделки стен", "м²", values.effectiveArea, values.demolitionCost);
  specCollector.addSpec("material", "Расход инструмента", "м²", values.effectiveArea, values.instrumentCost);
}
