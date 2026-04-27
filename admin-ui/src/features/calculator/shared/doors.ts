import type { CalculatorProjectDoor } from "../model/types";
import { doorComponentCategoryOptions } from "./options";

export function getDoorKindLabel(value: string) {
  if (value === "door") {
    return "дверь";
  }
  if (value === "trim_only") {
    return "проем с доборами";
  }
  return "проем";
}

export function getDoorDisplayTitle(door: CalculatorProjectDoor) {
  return door.title ?? door.catalog_title ?? "Дверной блок";
}

export function getDoorMaterialSpecTitle(door: CalculatorProjectDoor) {
  const title = getDoorDisplayTitle(door);
  if (door.opening_kind === "opening") {
    return `Проём без двери: ${title}`;
  }
  if (door.opening_kind === "trim_only") {
    return `Оформление проёма: ${title}`;
  }
  return `Дверной блок: ${title}`;
}

export function getDoorWorkSpecTitle(door: CalculatorProjectDoor) {
  const title = getDoorDisplayTitle(door);
  if (door.opening_kind === "opening") {
    return `Монтаж оформления проёма: ${title}`;
  }
  if (door.opening_kind === "trim_only") {
    return `Монтаж доборов и наличников: ${title}`;
  }
  return `Монтаж дверного блока: ${title}`;
}

export function getDoorComponentCategoryLabel(value: string) {
  return doorComponentCategoryOptions.find((item) => item.value === value)?.label ?? value;
}
