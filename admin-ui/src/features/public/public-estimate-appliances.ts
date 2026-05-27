import {
  createEstimateSection,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type AppliancePackageLevel = "c" | "b" | "a";

export type FridgeVariant = "freestanding" | "built_in_standard" | "built_in_185";

export type ApplianceItemKey =
  | "fridge"
  | "oven"
  | "microwave"
  | "dishwasher"
  | "hob"
  | "hood"
  | "washing_machine"
  | "tv"
  | "tv_bracket";

export type AppliancesOptions = {
  packageLevel: AppliancePackageLevel;
  fridgeVariant: FridgeVariant;
  items: Record<ApplianceItemKey, { isIncluded: boolean; quantity: number }>;
};

export type AppliancesCalculationResult = {
  packageLevel: AppliancePackageLevel;
  packageLabel: string;
  packageMultiplier: number;
  includedItemCount: number;
  kitchenAppliancesTotal: number;
  tvTotal: number;
  laundryTotal: number;
  total: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  section: EstimateSection;
};

export const appliancePackageMultipliers: Record<AppliancePackageLevel, number> = {
  c: 1,
  b: 1.3,
  a: 1.7,
};

export const appliancePackageLabels: Record<AppliancePackageLevel, string> = {
  c: "C — базовый",
  b: "B — средний",
  a: "A — повышенный",
};

export const fridgeBasePublicPrices: Record<FridgeVariant, number> = {
  freestanding: 40000,
  built_in_standard: 45000,
  built_in_185: 58000,
};

export const fridgeVariantLabels: Record<FridgeVariant, string> = {
  freestanding: "Отдельностоящий",
  built_in_standard: "Встроенный стандартный",
  built_in_185: "Встроенный высокий 185 см",
};

const applianceBasePublicPrices: Record<Exclude<ApplianceItemKey, "fridge">, number> = {
  oven: 22000,
  microwave: 18000,
  dishwasher: 27000,
  hob: 18000,
  hood: 8000,
  washing_machine: 26000,
  tv: 24000,
  tv_bracket: 2000,
};

export const applianceItemCatalog: Array<{
  key: ApplianceItemKey;
  title: string;
  note?: string;
}> = [
  { key: "fridge", title: "Холодильник", note: "Мебельный пенал считается в разделе Комплектация." },
  { key: "oven", title: "Духовой шкаф" },
  { key: "microwave", title: "Встроенная СВЧ" },
  { key: "dishwasher", title: "Посудомоечная машина" },
  { key: "hob", title: "Индукционная варочная панель" },
  { key: "hood", title: "Вытяжка" },
  { key: "washing_machine", title: "Стиральная машина" },
  { key: "tv", title: "Телевизор" },
  { key: "tv_bracket", title: "Кронштейн ТВ" },
];

const kitchenApplianceKeys: ApplianceItemKey[] = ["fridge", "oven", "microwave", "dishwasher", "hob", "hood"];
const tvApplianceKeys: ApplianceItemKey[] = ["tv", "tv_bracket"];
const laundryApplianceKeys: ApplianceItemKey[] = ["washing_machine"];

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function safeQuantity(value: number) {
  return Math.max(1, Math.floor(safeNumber(value)));
}

export function createDefaultAppliancesOptions(): AppliancesOptions {
  const items = {} as AppliancesOptions["items"];

  for (const item of applianceItemCatalog) {
    items[item.key] = { isIncluded: false, quantity: 1 };
  }

  return {
    packageLevel: "c",
    fridgeVariant: "built_in_standard",
    items,
  };
}

export function getApplianceBasePublicPrice(key: ApplianceItemKey, fridgeVariant: FridgeVariant) {
  if (key === "fridge") {
    return fridgeBasePublicPrices[fridgeVariant];
  }

  return applianceBasePublicPrices[key];
}

export function getApplianceUnitPrice(
  key: ApplianceItemKey,
  options: Pick<AppliancesOptions, "packageLevel" | "fridgeVariant">,
) {
  const basePublicPrice = getApplianceBasePublicPrice(key, options.fridgeVariant);
  const packageMultiplier = appliancePackageMultipliers[options.packageLevel];

  return basePublicPrice * packageMultiplier;
}

function createLineItem(
  id: string,
  title: string,
  quantity: number,
  unitPrice: number,
  note?: string,
): EstimateLineItem {
  const normalizedQuantity = safeQuantity(quantity);
  const normalizedUnitPrice = safeNumber(unitPrice);

  return {
    id,
    sectionId: "appliances",
    title,
    category: "equipment",
    quantity: normalizedQuantity,
    unit: "шт.",
    unitPrice: normalizedUnitPrice,
    total: normalizedQuantity * normalizedUnitPrice,
    isIncluded: true,
    note,
  };
}

function sumKeysTotal(
  keys: ApplianceItemKey[],
  options: AppliancesOptions,
  lineTotals: Partial<Record<ApplianceItemKey, number>>,
) {
  return keys.reduce((sum, key) => sum + (lineTotals[key] ?? 0), 0);
}

export function calculateAppliances(options: AppliancesOptions): AppliancesCalculationResult {
  const packageMultiplier = appliancePackageMultipliers[options.packageLevel];
  const packageLabel = appliancePackageLabels[options.packageLevel];
  const items: EstimateLineItem[] = [];
  const lineTotals: Partial<Record<ApplianceItemKey, number>> = {};
  let includedItemCount = 0;

  for (const catalogItem of applianceItemCatalog) {
    const itemDraft = options.items[catalogItem.key];
    const quantity = safeQuantity(itemDraft?.quantity ?? 1);

    if (!itemDraft?.isIncluded) {
      continue;
    }

    const basePublicPrice = getApplianceBasePublicPrice(catalogItem.key, options.fridgeVariant);
    const unitPrice = basePublicPrice * packageMultiplier;
    const lineTotal = unitPrice * quantity;

    if (lineTotal <= 0) {
      continue;
    }

    includedItemCount += 1;
    lineTotals[catalogItem.key] = lineTotal;

    items.push(
      createLineItem(
        `appliances-${catalogItem.key}`,
        catalogItem.title,
        quantity,
        unitPrice,
        catalogItem.key === "fridge" ? catalogItem.note : undefined,
      ),
    );
  }

  const kitchenAppliancesTotal = sumKeysTotal(kitchenApplianceKeys, options, lineTotals);
  const tvTotal = sumKeysTotal(tvApplianceKeys, options, lineTotals);
  const laundryTotal = sumKeysTotal(laundryApplianceKeys, options, lineTotals);
  const section = createEstimateSection(
    "appliances",
    "Бытовая техника",
    items,
    "Позиционный расчёт бытовой техники по выбранному пакету C / B / A.",
  );

  return {
    packageLevel: options.packageLevel,
    packageLabel,
    packageMultiplier,
    includedItemCount,
    kitchenAppliancesTotal,
    tvTotal,
    laundryTotal,
    total: section.totals.total,
    worksTotal: 0,
    materialsTotal: 0,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: 0,
    section,
  };
}
