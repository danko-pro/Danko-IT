import {
  formatMoney,
  getDoorComponentCategoryLabel,
  getDoorDisplayTitle,
  getDoorKindLabel,
  trimFloat,
} from "../shared";
import type { CalculatorDoorSpecItem, CalculatorProjectDoor } from "../doors/model";

export function doorTitle(door: CalculatorProjectDoor | null): string {
  return door ? getDoorDisplayTitle(door) : "Дверной блок";
}

export function doorKind(door: CalculatorProjectDoor | null): string {
  return door ? getDoorKindLabel(door.opening_kind) : "позиция";
}

export function doorSize(door: CalculatorProjectDoor | null): string {
  if (!door?.width_mm || !door.height_mm) {
    return "Размер не задан";
  }
  const thickness = door.thickness_mm ? ` x ${trimFloat(door.thickness_mm)}` : "";
  return `${trimFloat(door.width_mm)} x ${trimFloat(door.height_mm)}${thickness} мм`;
}

export function doorRooms(door: CalculatorProjectDoor | null): string {
  if (!door) return "Помещения не выбраны";
  return `${door.room_a_name ?? "Объект"} -> ${door.room_b_name ?? "одна сторона"}`;
}

export function doorArea(door: CalculatorProjectDoor | null): string {
  return door?.area_m2 ? `${trimFloat(door.area_m2)} м²` : "0 м²";
}

export function doorMoneyLine(door: CalculatorProjectDoor | null): string {
  if (!door) return formatMoney(0);
  return formatMoney((door.effective_sale_price ?? 0) + (door.effective_install_price ?? 0));
}

export function doorMarginText(door: CalculatorProjectDoor | null): string {
  if (!door) return formatMoney(0);
  return formatMoney((door.effective_sale_price ?? 0) - (door.effective_purchase_price ?? 0));
}

export function doorMarginPercent(door: CalculatorProjectDoor | null): string {
  const sale = door?.effective_sale_price ?? 0;
  if (sale <= 0) return "0%";
  const margin = sale - (door?.effective_purchase_price ?? 0);
  return `${trimFloat((margin / sale) * 100)}%`;
}

export function componentLabel(categoryCode: string): string {
  return getDoorComponentCategoryLabel(categoryCode);
}

export function specificationTotal(items: CalculatorDoorSpecItem[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}
