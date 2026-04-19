import type { CalculatorProjectDoor } from "./calculator-types";
import { formatDateTimeRu } from "../../shared/formatters/date";
import { formatMoneySuffix } from "../../shared/formatters/money";
import { trimFloatFixed } from "../../shared/formatters/number";

// Общие helpers калькулятора.
// В этом модуле остаются только калькуляторные форматтеры, опции и локальные виджеты.
// Базовые текстовые/select поля переиспользуются из общего shared UI,
// чтобы не держать две одинаковые реализации контролов.

export { Field as TextField, SelectField } from "../../shared/ui";

export type SelectOption = {
  value: string;
  label: string;
};

export const openingTypeOptions: SelectOption[] = [
  { value: "window", label: "Окно" },
  { value: "balcony", label: "Балконный проем" },
  { value: "niche", label: "Ниша" },
  { value: "opening", label: "Проем" },
  { value: "manual_area", label: "Площадь вручную" },
];

export const doorComponentCategoryOptions: SelectOption[] = [
  { value: "leaf", label: "Полотно" },
  { value: "frame", label: "Короб" },
  { value: "architrave", label: "Наличник" },
  { value: "extension", label: "Добор" },
  { value: "handle", label: "Ручка" },
  { value: "hinge", label: "Петли" },
  { value: "lock", label: "Замок" },
  { value: "latch", label: "Защелка" },
  { value: "plate", label: "Накладка" },
  { value: "misc", label: "Прочее" },
];

export const underlayModeOptions: SelectOption[] = [
  { value: "none", label: "Без подложки" },
  { value: "required", label: "Нужна" },
  { value: "optional", label: "Опционально" },
];

export function MetricChip(props: { label: string; value: string }) {
  return (
    <div className="subpanel p-3 metric-chip">
      <div className="row-kicker metric-chip-label">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100 metric-chip-value">{props.value}</div>
    </div>
  );
}

export function getUnderlayModeLabel(value: string) {
  if (value === "required") {
    return "обязательна";
  }
  if (value === "optional") {
    return "опционально";
  }
  return "не нужна";
}

export function formatPerSquareRate(value: number, unit: string) {
  return value > 0 ? `${trimFloat(value)} ${unit}/м²` : "—";
}

export function formatArea(value: number) {
  return `${trimFloat(value)} м²`;
}

export function formatMeters(value: number) {
  return `${trimFloat(value)} м.п.`;
}

export function formatMoney(value: number) {
  return formatMoneySuffix(value);
}

export function formatContourWord(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;
  if (remainder10 === 1 && remainder100 !== 11) {
    return "контур";
  }
  if ([2, 3, 4].includes(remainder10) && ![12, 13, 14].includes(remainder100)) {
    return "контура";
  }
  return "контуров";
}

export function formatDateTime(value: string) {
  return formatDateTimeRu(value);
}

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

export function trimFloat(value: number) {
  return trimFloatFixed(value);
}

export function toNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toInteger(value: string) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}
