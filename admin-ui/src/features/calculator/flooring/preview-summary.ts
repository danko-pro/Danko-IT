import type { CalculatorFlooringConfig, CalculatorFlooringSpecItem, CalculatorFlooringSummary } from "./model";

export type FlooringSpecCollector = {
  addSpec: (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => void;
  toArray: () => CalculatorFlooringSpecItem[];
};

export function createFlooringSummary(config: CalculatorFlooringConfig): CalculatorFlooringSummary {
  return {
    rooms_count: 0,
    total_area_m2: 0,
    total_purchase_area_m2: 0,
    total_material_cost: 0,
    total_installation_cost: 0,
    total_preparation_work_cost: 0,
    total_preparation_material_cost: 0,
    total_preparation_cost: 0,
    total_underlay_qty: 0,
    underlay_unit: "м²",
    total_underlay_cost: 0,
    total_glue_qty: 0,
    glue_unit: "кг",
    total_glue_cost: 0,
    total_primer_qty: 0,
    primer_unit: "л",
    total_primer_cost: 0,
    total_svp_qty: 0,
    svp_unit: "шт",
    total_svp_cost: 0,
    total_grout_qty: 0,
    grout_unit: "кг",
    total_grout_cost: 0,
    total_plinth_m: 0,
    total_plinth_material_cost: 0,
    total_plinth_install_cost: 0,
    total_demolition_cost: 0,
    threshold_profile_count: config.threshold_profile_count,
    threshold_profile_cost: 0,
    total_instrument_cost: 0,
    work_total: 0,
    material_total: 0,
    grand_total: 0,
    price_per_m2: null,
  };
}

export function createFlooringSpecCollector(): FlooringSpecCollector {
  const specMap = new Map<string, CalculatorFlooringSpecItem>();

  return {
    addSpec(kind, title, unit, quantity, amount) {
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
    },
    toArray() {
      return Array.from(specMap.values());
    },
  };
}

export function finalizeFlooringSummary(
  summary: CalculatorFlooringSummary,
  config: CalculatorFlooringConfig,
  specCollector: FlooringSpecCollector,
) {
  if (summary.rooms_count > 0 && summary.threshold_profile_count > 0) {
    summary.threshold_profile_cost = summary.threshold_profile_count * config.threshold_profile_price;
    specCollector.addSpec(
      "material",
      "Порожек / стыковочный профиль",
      "шт",
      summary.threshold_profile_count,
      summary.threshold_profile_cost,
    );
  }

  summary.work_total =
    summary.total_installation_cost +
    summary.total_preparation_work_cost +
    summary.total_plinth_install_cost +
    summary.total_demolition_cost;
  summary.material_total =
    summary.total_material_cost +
    summary.total_preparation_material_cost +
    summary.total_underlay_cost +
    summary.total_glue_cost +
    summary.total_primer_cost +
    summary.total_svp_cost +
    summary.total_grout_cost +
    summary.total_plinth_material_cost +
    summary.threshold_profile_cost +
    summary.total_instrument_cost;
  summary.grand_total = summary.work_total + summary.material_total;
  summary.price_per_m2 = summary.total_area_m2 > 0 ? summary.grand_total / summary.total_area_m2 : null;
}
