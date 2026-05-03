import type { CalculatorWallFinishSpecItem, CalculatorWallFinishSummary } from "./model";

export type WallFinishSpecCollector = {
  addSpec: (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => void;
  toArray: () => CalculatorWallFinishSpecItem[];
};

export function createWallFinishSummary(): CalculatorWallFinishSummary {
  return {
    rooms_count: 0,
    total_area_m2: 0,
    total_purchase_area_m2: 0,
    total_material_cost: 0,
    total_installation_cost: 0,
    total_preparation_work_cost: 0,
    total_preparation_material_cost: 0,
    total_preparation_cost: 0,
    total_glue_qty: 0,
    glue_unit: "кг",
    total_glue_cost: 0,
    total_primer_qty: 0,
    primer_unit: "л",
    total_primer_cost: 0,
    total_putty_qty: 0,
    putty_unit: "кг",
    total_putty_cost: 0,
    total_mesh_qty: 0,
    mesh_unit: "м²",
    total_mesh_cost: 0,
    total_custom_consumables_cost: 0,
    total_demolition_cost: 0,
    total_instrument_cost: 0,
    work_total: 0,
    material_total: 0,
    grand_total: 0,
    price_per_m2: null,
  };
}

export function createWallFinishSpecCollector(): WallFinishSpecCollector {
  const specMap = new Map<string, CalculatorWallFinishSpecItem>();

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

export function finalizeWallFinishSummary(summary: CalculatorWallFinishSummary) {
  summary.work_total = summary.total_installation_cost + summary.total_preparation_work_cost + summary.total_demolition_cost;
  summary.material_total =
    summary.total_material_cost +
    summary.total_preparation_material_cost +
    summary.total_glue_cost +
    summary.total_primer_cost +
    summary.total_putty_cost +
    summary.total_mesh_cost +
    summary.total_custom_consumables_cost +
    summary.total_instrument_cost;
  summary.grand_total = summary.work_total + summary.material_total;
  summary.price_per_m2 = summary.total_area_m2 > 0 ? summary.grand_total / summary.total_area_m2 : null;
}
