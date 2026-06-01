// Локальный прототип «сборки покрытия»: агрегация строк work/material/consumable/tool
// в плоские ₽/м² поля covering draft. Без backend и без public snapshot.

import { normalizeNum } from "./api/flooring-mappers";
import type { FlooringCoveringDraft } from "./api/flooring-types";

export type CoveringAssemblyRowKind = "work" | "material" | "consumable" | "tool";

export type FlooringAssemblyFormula =
  | "flat_per_m2" // price already ₽/m²
  | "unit_consumption" // price per unit × consumptionPerM2
  | "package_consumption" // (price / packageSize) × consumptionPerM2
  | "layer_consumption" // (price / packageSize) × consumptionPerM2 per 1mm × layerMm
  | "piece_consumption"; // (price / packageSize if set else price) × consumptionPerM2

export type CoveringAssemblyRow = {
  id: string;
  title: string;
  kind: CoveringAssemblyRowKind;
  formula: FlooringAssemblyFormula;
  unit: string;
  /** Цена за ед. (consumable) или ₽/m² (work, material, tool). */
  price: number;
  consumptionPerM2: number;
  packageSize?: number;
  layerMm?: number;
  enabled: boolean;
};

/** Плоские ₽/m² поля, совместимые с public flooring snapshot covering rates. */
export type CoveringAssemblyFlatFields = {
  materialPricePerM2: number;
  laborPricePerM2: number;
  adhesivePricePerM2: number;
  primerPricePerM2: number;
  svpPricePerM2: number;
  groutPricePerM2: number;
  toolConsumablesPerM2: number;
};

export type CoveringAssemblyAggregates = {
  worksPerM2: number;
  materialPerM2: number;
  consumablesPerM2: number;
  toolPerM2: number;
  recommendedFlatFields: CoveringAssemblyFlatFields;
};

export type CoveringAssemblyRecommendedField = {
  label: string;
  valuePerM2: number;
};

export type FormulaFieldVisibility = {
  consumption: boolean;
  packageSize: boolean;
  layerMm: boolean;
};

const ASSEMBLY_KIND_LABELS: Record<CoveringAssemblyRowKind, string> = {
  work: "Работа",
  material: "Материал",
  consumable: "Расходник",
  tool: "Инструмент",
};

const FORMULA_LABELS: Record<FlooringAssemblyFormula, string> = {
  flat_per_m2: "₽/м² напрямую",
  unit_consumption: "Цена × расход",
  package_consumption: "Фасовка × расход",
  layer_consumption: "Слой × фасовка × расход",
  piece_consumption: "Штуки × расход",
};

const FORMULA_COMPACT_LABELS: Record<FlooringAssemblyFormula, string> = {
  flat_per_m2: "₽/м²",
  unit_consumption: "Цена × расход",
  package_consumption: "Фас. × расход",
  layer_consumption: "Слой × расход",
  piece_consumption: "Шт. × расход",
};

export const FLOORING_ASSEMBLY_FORMULAS: FlooringAssemblyFormula[] = [
  "flat_per_m2",
  "unit_consumption",
  "package_consumption",
  "layer_consumption",
  "piece_consumption",
];

const RECOMMENDED_FLAT_FIELD_LABELS: {
  key: keyof CoveringAssemblyFlatFields;
  label: string;
}[] = [
  { key: "materialPricePerM2", label: "Материал покрытия" },
  { key: "laborPricePerM2", label: "Работа" },
  { key: "adhesivePricePerM2", label: "Клей" },
  { key: "primerPricePerM2", label: "Грунт" },
  { key: "svpPricePerM2", label: "СВП" },
  { key: "groutPricePerM2", label: "Затирка" },
  { key: "toolConsumablesPerM2", label: "Инструмент" },
];

function formatMoneyRu(value: number): string {
  return normalizeNum(value).toLocaleString("ru-RU");
}

export function getAssemblyKindLabel(kind: CoveringAssemblyRowKind): string {
  return ASSEMBLY_KIND_LABELS[kind];
}

export function getAssemblyFormulaLabel(formula: FlooringAssemblyFormula): string {
  return FORMULA_LABELS[formula];
}

export function getAssemblyFormulaCompactLabel(formula: FlooringAssemblyFormula): string {
  return FORMULA_COMPACT_LABELS[formula];
}

export function inferDefaultFormula(
  kind: CoveringAssemblyRowKind,
  partial?: Partial<CoveringAssemblyRow>,
): FlooringAssemblyFormula {
  if (partial?.formula) {
    return partial.formula;
  }
  if (kind === "work" || kind === "material" || kind === "tool") {
    return "flat_per_m2";
  }
  const title = (partial?.title ?? "").trim().toLowerCase();
  if (title.includes("клей") || title.includes("адгез") || title.includes("glue")) {
    return "layer_consumption";
  }
  if (title.includes("грунт") || title.includes("primer")) {
    return "package_consumption";
  }
  if (title.includes("свп") || title.includes("крест") || title.includes("spacer")) {
    return "piece_consumption";
  }
  if (title.includes("затир") || title.includes("grout")) {
    return "package_consumption";
  }
  return "unit_consumption";
}

export function getFormulaFieldVisibility(formula: FlooringAssemblyFormula): FormulaFieldVisibility {
  switch (formula) {
    case "flat_per_m2":
      return { consumption: false, packageSize: false, layerMm: false };
    case "unit_consumption":
      return { consumption: true, packageSize: false, layerMm: false };
    case "package_consumption":
      return { consumption: true, packageSize: true, layerMm: false };
    case "layer_consumption":
      return { consumption: true, packageSize: true, layerMm: true };
    case "piece_consumption":
      return { consumption: true, packageSize: true, layerMm: false };
  }
}

function getFlatPerM2Coefficient(row: CoveringAssemblyRow): number {
  if (row.kind !== "material" && row.kind !== "work") {
    return 1;
  }
  const coefficient = normalizeNum(row.consumptionPerM2);
  return coefficient > 0 ? coefficient : 1;
}

/** Итого ₽/m² по строке (без учёта enabled — для отображения в таблице). */
export function calculateAssemblyRowTotal(row: CoveringAssemblyRow): number {
  const price = normalizeNum(row.price);
  const consumption = normalizeNum(row.consumptionPerM2);
  const packageSize = normalizeNum(row.packageSize);
  const layerMm = normalizeNum(row.layerMm);

  switch (row.formula) {
    case "flat_per_m2":
      return price * getFlatPerM2Coefficient(row);
    case "unit_consumption":
      return price * consumption;
    case "package_consumption":
      return packageSize > 0 ? (price / packageSize) * consumption : price * consumption;
    case "layer_consumption":
      if (packageSize > 0 && layerMm > 0) {
        return (price / packageSize) * consumption * layerMm;
      }
      return price * consumption;
    case "piece_consumption":
      return packageSize > 0 ? (price / packageSize) * consumption : price * consumption;
  }
}

export function getRecommendedFlatFieldEntries(
  flat: CoveringAssemblyFlatFields,
): CoveringAssemblyRecommendedField[] {
  return RECOMMENDED_FLAT_FIELD_LABELS.map(({ key, label }) => ({
    label,
    valuePerM2: normalizeNum(flat[key]),
  }));
}

/**
 * Правила агрегации:
 * - disabled-строки игнорируются;
 * - итог по строке считается через formula (calculateAssemblyRowTotal);
 * - consumable маппится в adhesive/primer/svp/grout по ключевым словам title; прочее + tool → toolConsumablesPerM2.
 */
export function aggregateCoveringAssembly(rows: CoveringAssemblyRow[]): CoveringAssemblyAggregates {
  const enabled = rows.filter((row) => row.enabled);

  let worksPerM2 = 0;
  let materialPerM2 = 0;
  let consumablesPerM2 = 0;
  let toolPerM2 = 0;

  const flat: CoveringAssemblyFlatFields = {
    materialPricePerM2: 0,
    laborPricePerM2: 0,
    adhesivePricePerM2: 0,
    primerPricePerM2: 0,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 0,
  };

  for (const row of enabled) {
    const value = calculateAssemblyRowTotal(row);
    if (row.kind === "work") {
      worksPerM2 += value;
      flat.laborPricePerM2 += value;
      continue;
    }
    if (row.kind === "material") {
      materialPerM2 += value;
      flat.materialPricePerM2 += value;
      continue;
    }
    if (row.kind === "tool") {
      toolPerM2 += value;
      flat.toolConsumablesPerM2 += value;
      continue;
    }
    if (row.kind === "consumable") {
      consumablesPerM2 += value;
      const bucket = classifyConsumableTitle(row.title);
      if (bucket === "adhesive") flat.adhesivePricePerM2 += value;
      else if (bucket === "primer") flat.primerPricePerM2 += value;
      else if (bucket === "svp") flat.svpPricePerM2 += value;
      else if (bucket === "grout") flat.groutPricePerM2 += value;
      else flat.toolConsumablesPerM2 += value;
    }
  }

  return {
    worksPerM2,
    materialPerM2,
    consumablesPerM2,
    toolPerM2,
    recommendedFlatFields: flat,
  };
}

type ConsumableBucket = "adhesive" | "primer" | "svp" | "grout" | "other";

function classifyConsumableTitle(title: string): ConsumableBucket {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("клей") || normalized.includes("адгез") || normalized.includes("glue")) {
    return "adhesive";
  }
  if (normalized.includes("грунт") || normalized.includes("primer")) {
    return "primer";
  }
  if (normalized.includes("свп") || normalized.includes("крест") || normalized.includes("spacer")) {
    return "svp";
  }
  if (normalized.includes("затир") || normalized.includes("grout")) {
    return "grout";
  }
  return "other";
}

/** Пример сборки «Керамогранит 120×60» для локального черновика. */
export function getKeramogranit120x60Preset(): CoveringAssemblyRow[] {
  return [
    {
      id: "preset-material",
      title: "Керамогранит 120×60",
      kind: "material",
      formula: "flat_per_m2",
      unit: "m2",
      price: 2900,
      consumptionPerM2: 1,
      enabled: true,
    },
    {
      id: "preset-work-lay",
      title: "Укладка крупноформатной плитки",
      kind: "work",
      formula: "flat_per_m2",
      unit: "m2",
      price: 2000,
      consumptionPerM2: 1,
      enabled: true,
    },
    {
      id: "preset-glue",
      title: "Клей плиточный",
      kind: "consumable",
      formula: "layer_consumption",
      unit: "kg",
      price: 600,
      packageSize: 25,
      consumptionPerM2: 1.5,
      layerMm: 5,
      enabled: true,
    },
    {
      id: "preset-primer",
      title: "Грунтовка глубокого проникновения",
      kind: "consumable",
      formula: "package_consumption",
      unit: "l",
      price: 1250,
      packageSize: 10,
      consumptionPerM2: 0.2,
      enabled: true,
    },
    {
      id: "preset-svp",
      title: "СВП 2 мм",
      kind: "consumable",
      formula: "piece_consumption",
      unit: "pcs",
      price: 30,
      consumptionPerM2: 4,
      enabled: true,
    },
    {
      id: "preset-grout",
      title: "Затирка эпоксидная",
      kind: "consumable",
      formula: "package_consumption",
      unit: "kg",
      price: 180,
      packageSize: 5,
      consumptionPerM2: 0.5,
      enabled: true,
    },
    {
      id: "preset-tool",
      title: "Инструмент и расходники",
      kind: "tool",
      formula: "flat_per_m2",
      unit: "m2",
      price: 40,
      consumptionPerM2: 1,
      enabled: true,
    },
  ];
}

/**
 * Переносит агрегированные ₽/m² в draft покрытия.
 * Для расходников выставляет consumptionPerM2=1 и pricePerUnit=₽/m² (упрощённая плоская модель).
 * instrumentPricePerM2 ← toolPerM2; остальное toolConsumablesPerM2 не разбивается на custom.
 */
export function applyAggregatesToCoveringDraft(
  aggregates: CoveringAssemblyAggregates,
  draft: FlooringCoveringDraft,
): FlooringCoveringDraft {
  const flat = aggregates.recommendedFlatFields;

  return {
    ...draft,
    materialPricePerM2: flat.materialPricePerM2,
    laborPricePerM2: flat.laborPricePerM2,
    instrumentPricePerM2: aggregates.toolPerM2,
    glueConsumptionPerM2: flat.adhesivePricePerM2 > 0 ? 1 : draft.glueConsumptionPerM2,
    gluePricePerUnit: flat.adhesivePricePerM2 > 0 ? flat.adhesivePricePerM2 : draft.gluePricePerUnit,
    primerConsumptionPerM2: flat.primerPricePerM2 > 0 ? 1 : draft.primerConsumptionPerM2,
    primerPricePerUnit: flat.primerPricePerM2 > 0 ? flat.primerPricePerM2 : draft.primerPricePerUnit,
    svpConsumptionPerM2: flat.svpPricePerM2 > 0 ? 1 : draft.svpConsumptionPerM2,
    svpPricePerUnit: flat.svpPricePerM2 > 0 ? flat.svpPricePerM2 : draft.svpPricePerUnit,
    groutConsumptionPerM2: flat.groutPricePerM2 > 0 ? 1 : draft.groutConsumptionPerM2,
    groutPricePerUnit: flat.groutPricePerM2 > 0 ? flat.groutPricePerM2 : draft.groutPricePerUnit,
  };
}

export function createEmptyAssemblyRow(partial?: Partial<CoveringAssemblyRow>): CoveringAssemblyRow {
  const kind = partial?.kind ?? "consumable";
  return {
    id: partial?.id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: partial?.title ?? "",
    kind,
    formula: partial?.formula ?? inferDefaultFormula(kind, partial),
    unit: partial?.unit ?? "pcs",
    price: partial?.price ?? 0,
    consumptionPerM2: partial?.consumptionPerM2 ?? 0,
    packageSize: partial?.packageSize,
    layerMm: partial?.layerMm,
    enabled: partial?.enabled ?? true,
  };
}

/** Человекочитаемый итог сохранения покрытия в БД (без строк «Состав покрытия»). */
export function formatCoveringSaveFeedback(
  title: string,
  draft: FlooringCoveringDraft,
  mode: "create" | "update",
  options?: { assemblyRowsRemain?: boolean },
): string {
  const verb = mode === "create" ? "создано" : "сохранено";
  const rateParts: string[] = [];

  if (normalizeNum(draft.materialPricePerM2) > 0) {
    rateParts.push(`материал ${formatMoneyRu(draft.materialPricePerM2)} ₽/м²`);
  }
  if (normalizeNum(draft.laborPricePerM2) > 0) {
    rateParts.push(`работа ${formatMoneyRu(draft.laborPricePerM2)} ₽/м²`);
  }
  if (normalizeNum(draft.instrumentPricePerM2) > 0) {
    rateParts.push(`инструмент ${formatMoneyRu(draft.instrumentPricePerM2)} ₽/м²`);
  }

  const rates =
    rateParts.length > 0 ? `: ${rateParts.join(", ")}` : "";
  let message = `Покрытие «${title}» ${verb} в БД${rates}. Строки «Состав покрытия» не сохраняются — только поля формы.`;

  if (options?.assemblyRowsRemain) {
    message += " Черновик состава в форме не изменён.";
  }

  return message;
}
