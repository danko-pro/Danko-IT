import type {
  CalculatorWallFinishConfig,
  CalculatorWallFinishCovering,
  CalculatorWallFinishCoveringConsumable,
  CalculatorWallFinishPreparation,
} from "./model";
import type { WallFinishConsumables, WallFinishPreparationCosts } from "./preview-room-effects";

export function calculateWallFinishPreparationCosts(
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

export function calculateWallFinishConsumables(
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
