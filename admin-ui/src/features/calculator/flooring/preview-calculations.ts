import type {
  CalculatorFlooringConfig,
  CalculatorFlooringCovering,
  CalculatorFlooringCoveringConsumable,
  CalculatorFlooringPreparation,
} from "./model";
import type { FlooringConsumables, FlooringPlinth, FlooringPreparationCosts, FlooringUnderlay } from "./preview-room-effects";

export function calculatePreparationCosts(
  selected: boolean,
  effectiveArea: number,
  preparation: CalculatorFlooringPreparation | null,
  config: CalculatorFlooringConfig,
): FlooringPreparationCosts {
  if (!selected || !preparation || !Boolean(config.include_preparation)) {
    return { workCost: 0, materialCost: 0, primerQty: 0, primerCost: 0, totalCost: 0 };
  }
  const workCost = effectiveArea * preparation.labor_price_per_m2;
  const materialCost = effectiveArea * preparation.material_price_per_m2;
  const primerQty = effectiveArea * preparation.primer_consumption_per_m2;
  const primerCost = primerQty * preparation.primer_price_per_unit;
  return { workCost, materialCost, primerQty, primerCost, totalCost: workCost + materialCost };
}

export function calculateUnderlay(
  selected: boolean,
  effectiveArea: number,
  covering: CalculatorFlooringCovering | null,
  config: CalculatorFlooringConfig,
): FlooringUnderlay {
  if (!selected || !covering || !Boolean(config.include_underlay) || covering.underlay_mode === "none") {
    return { quantity: 0, cost: 0 };
  }
  const quantity = effectiveArea * (covering.underlay_consumption_per_m2 || 1);
  return { quantity, cost: quantity * config.underlay_price_per_m2 };
}

export function calculateConsumables(
  selected: boolean,
  purchaseArea: number,
  covering: CalculatorFlooringCovering | null,
  preparationPrimerQty: number,
  preparationPrimerCost: number,
): FlooringConsumables {
  const glueQty = selected && covering ? purchaseArea * covering.glue_consumption_per_m2 : 0;
  const coveringPrimerQty = selected && covering ? purchaseArea * covering.primer_consumption_per_m2 : 0;
  const svpQty = selected && covering ? purchaseArea * covering.svp_consumption_per_m2 : 0;
  const groutQty = selected && covering ? purchaseArea * covering.grout_consumption_per_m2 : 0;
  const customItems = selected && covering ? calculateCustomConsumables(purchaseArea, covering) : [];
  return {
    glueQty,
    glueCost: selected && covering ? glueQty * covering.glue_price_per_unit : 0,
    primerQty: preparationPrimerQty + coveringPrimerQty,
    primerCost: preparationPrimerCost + (selected && covering ? coveringPrimerQty * covering.primer_price_per_unit : 0),
    svpQty,
    svpCost: selected && covering ? svpQty * covering.svp_price_per_unit : 0,
    groutQty,
    groutCost: selected && covering ? groutQty * covering.grout_price_per_unit : 0,
    customItems,
    customCost: customItems.reduce((sum, item) => sum + item.cost, 0),
  };
}

function calculateCustomConsumables(purchaseArea: number, covering: CalculatorFlooringCovering) {
  return parseCustomConsumables(covering.custom_consumables_json).map((item) => {
    const quantity = purchaseArea * item.consumption_per_m2;
    return { title: item.title, unit: item.unit, quantity, cost: quantity * item.price_per_unit };
  });
}

function parseCustomConsumables(raw: string): CalculatorFlooringCoveringConsumable[] {
  try {
    const items = JSON.parse(raw || "[]") as CalculatorFlooringCoveringConsumable[];
    return items.filter((item) => item.title?.trim());
  } catch {
    return [];
  }
}

export function calculatePlinth(
  selected: boolean,
  plinthBase: number,
  covering: CalculatorFlooringCovering | null,
  config: CalculatorFlooringConfig,
): FlooringPlinth {
  const coveringAllowsPlinth = covering ? Boolean(covering.needs_plinth) : false;
  if (!selected || !Boolean(config.include_plinth) || !coveringAllowsPlinth) {
    return { meters: 0, materialCost: 0, installCost: 0 };
  }
  return {
    meters: plinthBase,
    materialCost: plinthBase * config.plinth_material_price_per_m,
    installCost: plinthBase * config.plinth_install_price_per_m,
  };
}
