import {
  createEstimateSection,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type LooseFurniturePackageLevel = "c" | "b" | "a";

export type LooseFurnitureGroup = "dining" | "living" | "bedroom" | "loggia" | "work" | "storage" | "hall";

export type LooseFurnitureItemKey =
  | "dining_table"
  | "dining_chair"
  | "sofa_straight"
  | "sofa_corner"
  | "tv_console"
  | "double_bed"
  | "double_mattress"
  | "bedside_table"
  | "loggia_chair"
  | "loggia_table"
  | "computer_desk"
  | "armchair"
  | "sleeper_chair"
  | "cabinet"
  | "shelving"
  | "bench";

export type LooseFurnitureOptions = {
  packageLevel: LooseFurniturePackageLevel;
  items: Record<LooseFurnitureItemKey, { isIncluded: boolean; quantity: number }>;
};

export type LooseFurnitureCalculationResult = {
  packageLevel: LooseFurniturePackageLevel;
  packageLabel: string;
  packageMultiplier: number;
  includedItemCount: number;
  diningTotal: number;
  livingTotal: number;
  bedroomTotal: number;
  loggiaTotal: number;
  workTotal: number;
  storageTotal: number;
  hallTotal: number;
  total: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  section: EstimateSection;
};

export const looseFurniturePackageMultipliers: Record<LooseFurniturePackageLevel, number> = {
  c: 1,
  b: 1.35,
  a: 1.85,
};

export const looseFurniturePackageLabels: Record<LooseFurniturePackageLevel, string> = {
  c: "C — базовый",
  b: "B — средний",
  a: "A — повышенный",
};

export const looseFurnitureGroupLabels: Record<LooseFurnitureGroup, string> = {
  dining: "Столовая",
  living: "Гостиная",
  bedroom: "Спальня",
  loggia: "Лоджия",
  work: "Рабочая зона",
  storage: "Хранение",
  hall: "Прихожая",
};

const diningKeys: LooseFurnitureItemKey[] = ["dining_table", "dining_chair"];
const livingKeys: LooseFurnitureItemKey[] = ["sofa_straight", "sofa_corner", "tv_console", "armchair", "sleeper_chair"];
const bedroomKeys: LooseFurnitureItemKey[] = ["double_bed", "double_mattress", "bedside_table"];
const loggiaKeys: LooseFurnitureItemKey[] = ["loggia_chair", "loggia_table"];
const workKeys: LooseFurnitureItemKey[] = ["computer_desk"];
const storageKeys: LooseFurnitureItemKey[] = ["cabinet", "shelving"];
const hallKeys: LooseFurnitureItemKey[] = ["bench"];

export const looseFurnitureItemCatalog: Array<{
  key: LooseFurnitureItemKey;
  title: string;
  basePublicPrice: number;
  defaultQuantity: number;
  group: LooseFurnitureGroup;
}> = [
  { key: "dining_table", title: "Обеденный стол", basePublicPrice: 20000, defaultQuantity: 1, group: "dining" },
  { key: "dining_chair", title: "Стулья обеденные", basePublicPrice: 7000, defaultQuantity: 5, group: "dining" },
  { key: "sofa_straight", title: "Диван прямой", basePublicPrice: 45000, defaultQuantity: 1, group: "living" },
  { key: "sofa_corner", title: "Диван угловой", basePublicPrice: 65000, defaultQuantity: 1, group: "living" },
  { key: "tv_console", title: "ТВ-тумба", basePublicPrice: 7000, defaultQuantity: 1, group: "living" },
  { key: "double_bed", title: "Двуспальная кровать", basePublicPrice: 43000, defaultQuantity: 1, group: "bedroom" },
  { key: "double_mattress", title: "Матрас двуспальный", basePublicPrice: 32000, defaultQuantity: 1, group: "bedroom" },
  { key: "bedside_table", title: "Прикроватная тумба", basePublicPrice: 8000, defaultQuantity: 2, group: "bedroom" },
  { key: "loggia_chair", title: "Кресло (лоджия)", basePublicPrice: 5000, defaultQuantity: 2, group: "loggia" },
  { key: "loggia_table", title: "Стол (лоджия)", basePublicPrice: 3000, defaultQuantity: 1, group: "loggia" },
  { key: "computer_desk", title: "Письменный стол", basePublicPrice: 7000, defaultQuantity: 1, group: "work" },
  { key: "armchair", title: "Кресло", basePublicPrice: 12000, defaultQuantity: 1, group: "living" },
  { key: "sleeper_chair", title: "Кресло-кровать", basePublicPrice: 30000, defaultQuantity: 1, group: "living" },
  { key: "cabinet", title: "Шкаф", basePublicPrice: 40000, defaultQuantity: 1, group: "storage" },
  { key: "shelving", title: "Стеллаж", basePublicPrice: 35000, defaultQuantity: 1, group: "storage" },
  { key: "bench", title: "Банкетка", basePublicPrice: 10000, defaultQuantity: 1, group: "hall" },
];

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function safeQuantity(value: number) {
  return Math.max(1, Math.floor(safeNumber(value)));
}

export function createDefaultLooseFurnitureOptions(): LooseFurnitureOptions {
  const items = {} as LooseFurnitureOptions["items"];

  for (const item of looseFurnitureItemCatalog) {
    items[item.key] = { isIncluded: false, quantity: item.defaultQuantity };
  }

  return {
    packageLevel: "c",
    items,
  };
}

export function getLooseFurnitureUnitPrice(
  key: LooseFurnitureItemKey,
  options: Pick<LooseFurnitureOptions, "packageLevel">,
) {
  const catalogItem = looseFurnitureItemCatalog.find((item) => item.key === key);

  if (!catalogItem) {
    return 0;
  }

  const packageMultiplier = looseFurniturePackageMultipliers[options.packageLevel];

  return catalogItem.basePublicPrice * packageMultiplier;
}

function createLineItem(id: string, title: string, quantity: number, unitPrice: number): EstimateLineItem {
  const normalizedQuantity = safeQuantity(quantity);
  const normalizedUnitPrice = safeNumber(unitPrice);

  return {
    id,
    sectionId: "loose_furniture",
    title,
    category: "materials",
    quantity: normalizedQuantity,
    unit: "шт.",
    unitPrice: normalizedUnitPrice,
    total: normalizedQuantity * normalizedUnitPrice,
    isIncluded: true,
  };
}

function sumKeysTotal(
  keys: LooseFurnitureItemKey[],
  lineTotals: Partial<Record<LooseFurnitureItemKey, number>>,
) {
  return keys.reduce((sum, key) => sum + (lineTotals[key] ?? 0), 0);
}

export function calculateLooseFurniture(options: LooseFurnitureOptions): LooseFurnitureCalculationResult {
  const packageMultiplier = looseFurniturePackageMultipliers[options.packageLevel];
  const packageLabel = looseFurniturePackageLabels[options.packageLevel];
  const items: EstimateLineItem[] = [];
  const lineTotals: Partial<Record<LooseFurnitureItemKey, number>> = {};
  let includedItemCount = 0;

  for (const catalogItem of looseFurnitureItemCatalog) {
    const itemDraft = options.items[catalogItem.key];
    const quantity = safeQuantity(itemDraft?.quantity ?? catalogItem.defaultQuantity);

    if (!itemDraft?.isIncluded) {
      continue;
    }

    const unitPrice = catalogItem.basePublicPrice * packageMultiplier;
    const lineTotal = unitPrice * quantity;

    if (lineTotal <= 0) {
      continue;
    }

    includedItemCount += 1;
    lineTotals[catalogItem.key] = lineTotal;

    items.push(
      createLineItem(`loose-furniture-${catalogItem.key}`, catalogItem.title, quantity, unitPrice),
    );
  }

  const diningTotal = sumKeysTotal(diningKeys, lineTotals);
  const livingTotal = sumKeysTotal(livingKeys, lineTotals);
  const bedroomTotal = sumKeysTotal(bedroomKeys, lineTotals);
  const loggiaTotal = sumKeysTotal(loggiaKeys, lineTotals);
  const workTotal = sumKeysTotal(workKeys, lineTotals);
  const storageTotal = sumKeysTotal(storageKeys, lineTotals);
  const hallTotal = sumKeysTotal(hallKeys, lineTotals);
  const section = createEstimateSection(
    "loose_furniture",
    "Свободная мебель",
    items,
    "Позиционный расчёт свободной мебели по выбранному пакету C / B / A.",
  );

  return {
    packageLevel: options.packageLevel,
    packageLabel,
    packageMultiplier,
    includedItemCount,
    diningTotal,
    livingTotal,
    bedroomTotal,
    loggiaTotal,
    workTotal,
    storageTotal,
    hallTotal,
    total: section.totals.total,
    worksTotal: 0,
    materialsTotal: section.totals.materials,
    equipmentTotal: 0,
    consumablesTotal: 0,
    section,
  };
}
