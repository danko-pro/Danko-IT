import type { CalculatorProjectCeilingItem } from "./model";
import type { ProjectCeilingItemPayload } from "./payload";

export type CeilingItemFormState = {
  title: string;
  category: string;
  unit: string;
  quantity: string;
  quantitySource: string;
  roomId: string;
  workPrice: string;
  materialPrice: string;
  equipmentPrice: string;
  consumablesPrice: string;
  priceFactor: string;
  note: string;
  isEnabled: boolean;
};

export const quantitySourceOptions = [
  { value: "manual", label: "Вручную" },
  { value: "room_area", label: "По площади" },
  { value: "room_perimeter", label: "По периметру" },
  { value: "pieces", label: "Штуки" },
];

export function buildInitialCeilingItemFormState(item?: CalculatorProjectCeilingItem): CeilingItemFormState {
  return {
    title: item?.title_snapshot ?? "",
    category: item?.category_snapshot ?? "Потолки",
    unit: item?.unit_snapshot ?? "м²",
    quantity: item ? String(item.quantity) : "1",
    quantitySource: item?.quantity_source ?? "manual",
    roomId: item?.room_id ? String(item.room_id) : "",
    workPrice: item ? String(item.work_price_snapshot) : "0",
    materialPrice: item ? String(item.material_price_snapshot) : "0",
    equipmentPrice: item ? String(item.equipment_price_snapshot) : "0",
    consumablesPrice: item ? String(item.consumables_price_snapshot) : "0",
    priceFactor: item ? String(item.price_factor_snapshot) : "1",
    note: item?.note_snapshot ?? "",
    isEnabled: item?.is_enabled ?? true,
  };
}

export function buildProjectCeilingItemPayload(
  projectId: number,
  state: CeilingItemFormState,
): ProjectCeilingItemPayload {
  const totals = calculateCeilingTotals(state);

  return {
    project_id: projectId,
    room_id: state.roomId ? Number.parseInt(state.roomId, 10) : null,
    source_catalog_item_id: null,
    source_code_snapshot: null,
    title_snapshot: state.title.trim(),
    category_snapshot: state.category.trim() || null,
    unit_snapshot: state.unit.trim(),
    quantity: toNonNegativeNumber(state.quantity),
    quantity_source: state.quantitySource || "manual",
    quantity_formula_snapshot: null,
    work_price_snapshot: toNonNegativeNumber(state.workPrice),
    material_price_snapshot: toNonNegativeNumber(state.materialPrice),
    equipment_price_snapshot: toNonNegativeNumber(state.equipmentPrice),
    consumables_price_snapshot: toNonNegativeNumber(state.consumablesPrice),
    price_factor_snapshot: toNonNegativeNumber(state.priceFactor, 1),
    work_total: totals.work_total,
    material_total: totals.material_total,
    equipment_total: totals.equipment_total,
    consumables_total: totals.consumables_total,
    total: totals.total,
    note_snapshot: state.note.trim() || null,
    is_enabled: state.isEnabled,
    sort_order: 100,
  };
}

export function calculateCeilingTotals(state: CeilingItemFormState) {
  const quantity = toNonNegativeNumber(state.quantity);
  const factor = toNonNegativeNumber(state.priceFactor, 1);
  const work_total = quantity * toNonNegativeNumber(state.workPrice) * factor;
  const material_total = quantity * toNonNegativeNumber(state.materialPrice) * factor;
  const equipment_total = quantity * toNonNegativeNumber(state.equipmentPrice) * factor;
  const consumables_total = quantity * toNonNegativeNumber(state.consumablesPrice) * factor;

  return {
    work_total,
    material_total,
    equipment_total,
    consumables_total,
    total: work_total + material_total + equipment_total + consumables_total,
  };
}

export function toNonNegativeNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}
