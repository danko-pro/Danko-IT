import { getDoorMaterialSpecTitle, getDoorWorkSpecTitle } from "./calculator-shared";
import type { CalculatorDoorSpecItem, CalculatorDoorsSummary, CalculatorProjectDetail, CalculatorProjectDoor } from "./calculator-types";

// Derived helpers дверного stage калькулятора.
// Здесь живут summary и спецификация по проектным дверям и комплектующим.

export function buildDoorsStageSummary(projectDetail: CalculatorProjectDetail | null): CalculatorDoorsSummary {
  const doors = projectDetail?.doors ?? [];
  const summary = projectDetail?.summary;
  const purchaseTotal = summary?.door_purchase_total ?? 0;
  const saleTotal = summary?.door_sale_total ?? 0;
  const installTotal = summary?.door_install_total ?? 0;
  return {
    total_items: doors.length,
    door_units: doors.filter((door) => door.opening_kind === "door").length,
    opening_units: doors.filter((door) => door.opening_kind === "opening").length,
    trim_only_units: doors.filter((door) => door.opening_kind === "trim_only").length,
    purchase_total: purchaseTotal,
    sale_total: saleTotal,
    install_total: installTotal,
    grand_total: saleTotal + installTotal,
    margin_total: saleTotal - purchaseTotal,
    components_purchase_total: summary?.door_components_purchase_total ?? 0,
    components_sale_total: summary?.door_components_sale_total ?? 0,
  };
}

export function buildDoorsStageSpecification(doors: CalculatorProjectDoor[] | null | undefined): CalculatorDoorSpecItem[] {
  if (!doors?.length) {
    return [];
  }
  const specMap = new Map<string, CalculatorDoorSpecItem>();
  const addSpec = (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => {
    if (quantity <= 0 || amount <= 0) {
      return;
    }
    const key = `${kind}:${title}:${unit}`;
    const current = specMap.get(key);
    if (current) {
      current.quantity += quantity;
      current.amount += amount;
      return;
    }
    specMap.set(key, { kind, title, unit, quantity, amount });
  };
  for (const door of doors) {
    addSpec("material", getDoorMaterialSpecTitle(door), "шт", 1, Math.max(0, door.effective_sale_price ?? 0));
    addSpec("work", getDoorWorkSpecTitle(door), "шт", 1, Math.max(0, door.effective_install_price ?? 0));
  }
  return Array.from(specMap.values());
}
