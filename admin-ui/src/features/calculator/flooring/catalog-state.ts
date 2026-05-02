import type {
  CalculatorFlooringCovering,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  FlooringCoveringCreateState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
} from "./";

export function coveringToState(item: CalculatorFlooringCovering): FlooringCoveringCreateState {
  return {
    title: item.title,
    material_price_per_m2: String(item.material_price_per_m2),
    labor_price_per_m2: String(item.labor_price_per_m2),
    base_waste_percent: String(item.base_waste_percent),
    underlay_mode: item.underlay_mode,
    underlay_consumption_per_m2: String(item.underlay_consumption_per_m2),
    glue_consumption_per_m2: String(item.glue_consumption_per_m2),
    glue_unit: item.glue_unit,
    glue_price_per_unit: String(item.glue_price_per_unit),
    primer_consumption_per_m2: String(item.primer_consumption_per_m2),
    primer_unit: item.primer_unit,
    primer_price_per_unit: String(item.primer_price_per_unit),
    svp_consumption_per_m2: String(item.svp_consumption_per_m2),
    svp_unit: item.svp_unit,
    svp_price_per_unit: String(item.svp_price_per_unit),
    grout_consumption_per_m2: String(item.grout_consumption_per_m2),
    grout_unit: item.grout_unit,
    grout_price_per_unit: String(item.grout_price_per_unit),
    custom_consumables: parseCoveringConsumables(item.custom_consumables_json),
    needs_plinth: Boolean(item.needs_plinth),
    instrument_price_per_m2: String(item.instrument_price_per_m2),
    note: item.note ?? "",
  };
}

function parseCoveringConsumables(raw: string) {
  try {
    const items = JSON.parse(raw || "[]") as Array<{
      title?: string;
      consumption_per_m2?: number;
      unit?: string;
      price_per_unit?: number;
    }>;
    return items.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      title: item.title ?? "",
      consumption_per_m2: String(item.consumption_per_m2 || ""),
      unit: item.unit || "шт",
      price_per_unit: String(item.price_per_unit || ""),
    }));
  } catch {
    return [];
  }
}

export function preparationToState(item: CalculatorFlooringPreparation): FlooringPreparationCreateState {
  return {
    title: item.title,
    labor_price_per_m2: String(item.labor_price_per_m2),
    material_price_per_m2: String(item.material_price_per_m2),
    primer_consumption_per_m2: String(item.primer_consumption_per_m2),
    primer_unit: item.primer_unit,
    primer_price_per_unit: String(item.primer_price_per_unit),
    note: item.note ?? "",
  };
}

export function layoutToState(item: CalculatorFlooringLayout): FlooringLayoutCreateState {
  return {
    title: item.title,
    labor_multiplier: String(item.labor_multiplier),
    extra_waste_percent: String(item.extra_waste_percent),
    note: item.note ?? "",
  };
}
