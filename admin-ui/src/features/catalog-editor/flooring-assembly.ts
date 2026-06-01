// Локальный прототип «сборки покрытия»: агрегация строк work/material/consumable/tool
// в плоские ₽/м² поля covering draft. Без backend и без public snapshot.

import { normalizeNum } from "./api/flooring-mappers";
import type { FlooringCoveringDraft } from "./api/flooring-types";

export type CoveringAssemblyRowKind = "work" | "material" | "consumable" | "tool";

export type CoveringAssemblyRow = {
  id: string;
  title: string;
  kind: CoveringAssemblyRowKind;
  unit: string;
  /** Цена за ед. (consumable) или ₽/м² (work, material, tool). */
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

const ASSEMBLY_KIND_LABELS: Record<CoveringAssemblyRowKind, string> = {
  work: "Работа",
  material: "Материал",
  consumable: "Расходник",
  tool: "Инструмент",
};

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

export function getAssemblyKindLabel(kind: CoveringAssemblyRowKind): string {
  return ASSEMBLY_KIND_LABELS[kind];
}

/** Итого ₽/m² по строке (без учёта enabled — для отображения в таблице). */
export function calculateAssemblyRowTotal(row: CoveringAssemblyRow): number {
  const price = normalizeNum(row.price);
  if (row.kind === "work" || row.kind === "material" || row.kind === "tool") {
    return price;
  }
  if (row.kind === "consumable") {
    const consumption = normalizeNum(row.consumptionPerM2);
    const packageSize = normalizeNum(row.packageSize);
    if (packageSize > 0) {
      return (price / packageSize) * consumption;
    }
    return price * consumption;
  }
  return 0;
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
 * - work: сумма price (уже ₽/m²);
 * - material: сумма price (₽/m²);
 * - consumable: price × consumptionPerM2; если задан packageSize — (price / packageSize) × consumptionPerM2;
 * - tool: сумма price (₽/m²);
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
      unit: "m2",
      price: 2900,
      consumptionPerM2: 1,
      enabled: true,
    },
    {
      id: "preset-work-lay",
      title: "Укладка крупноформатной плитки",
      kind: "work",
      unit: "m2",
      price: 2000,
      consumptionPerM2: 1,
      enabled: true,
    },
    {
      id: "preset-glue",
      title: "Клей плиточный",
      kind: "consumable",
      unit: "kg",
      price: 300,
      consumptionPerM2: 1.5,
      enabled: true,
    },
    {
      id: "preset-primer",
      title: "Грунтовка глубокого проникновения",
      kind: "consumable",
      unit: "l",
      price: 125,
      consumptionPerM2: 0.2,
      enabled: true,
    },
    {
      id: "preset-svp",
      title: "СВП 2 мм",
      kind: "consumable",
      unit: "pcs",
      price: 30,
      consumptionPerM2: 4,
      enabled: true,
    },
    {
      id: "preset-grout",
      title: "Затирка эпоксидная",
      kind: "consumable",
      unit: "kg",
      price: 180,
      consumptionPerM2: 0.5,
      enabled: true,
    },
    {
      id: "preset-tool",
      title: "Инструмент и расходники",
      kind: "tool",
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
  return {
    id: partial?.id ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: partial?.title ?? "",
    kind: partial?.kind ?? "consumable",
    unit: partial?.unit ?? "pcs",
    price: partial?.price ?? 0,
    consumptionPerM2: partial?.consumptionPerM2 ?? 0,
    packageSize: partial?.packageSize,
    layerMm: partial?.layerMm,
    enabled: partial?.enabled ?? true,
  };
}
