import {
  createEstimateSection,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type HomeGoodsPackageLevel = "c" | "b" | "a";

export type HomeGoodsOptions = {
  includeCleaning: boolean;
  includeHomeGoods: boolean;
  packageLevel: HomeGoodsPackageLevel;
};

export type HomeGoodsCalculationInput = {
  floorArea: number;
  options: HomeGoodsOptions;
};

export type HomeGoodsCalculationResult = {
  packageLevel: HomeGoodsPackageLevel;
  packageLabel: string;
  cleaningTotal: number;
  homeGoodsTotal: number;
  total: number;
  worksTotal: number;
  materialsTotal: number;
  section: EstimateSection;
};

export const cleaningRatePerM2 = 500;

export const homeGoodsPackageRates: Record<HomeGoodsPackageLevel, number> = {
  c: 35000,
  b: 65000,
  a: 110000,
};

export const homeGoodsPackageLabels: Record<HomeGoodsPackageLevel, string> = {
  c: "C — базовый",
  b: "B — средний",
  a: "A — повышенный",
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function createLineItem(
  id: string,
  title: string,
  category: EstimateLineItem["category"],
  quantity: number,
  unit: string,
  unitPrice: number,
): EstimateLineItem {
  const normalizedQuantity = safeNumber(quantity);
  const normalizedUnitPrice = safeNumber(unitPrice);

  return {
    id,
    sectionId: "home_goods",
    title,
    category,
    quantity: normalizedQuantity,
    unit,
    unitPrice: normalizedUnitPrice,
    total: normalizedQuantity * normalizedUnitPrice,
    isIncluded: true,
  };
}

export function createDefaultHomeGoodsOptions(): HomeGoodsOptions {
  return {
    includeCleaning: false,
    includeHomeGoods: false,
    packageLevel: "c",
  };
}

export function calculateHomeGoods(input: HomeGoodsCalculationInput): HomeGoodsCalculationResult {
  const { floorArea, options } = input;
  const cleaningArea = safeNumber(floorArea);
  const cleaningTotal = options.includeCleaning ? cleaningArea * cleaningRatePerM2 : 0;
  const homeGoodsTotal = options.includeHomeGoods ? homeGoodsPackageRates[options.packageLevel] : 0;
  const packageLabel = homeGoodsPackageLabels[options.packageLevel];
  const items: EstimateLineItem[] = [];

  if (cleaningTotal > 0) {
    items.push(
      createLineItem(
        "home-goods-cleaning",
        "Финишная уборка",
        "works",
        cleaningArea,
        "м²",
        cleaningRatePerM2,
      ),
    );
  }

  if (homeGoodsTotal > 0) {
    items.push(
      createLineItem(
        "home-goods-package",
        "Товары для дома",
        "materials",
        1,
        "компл.",
        homeGoodsPackageRates[options.packageLevel],
      ),
    );
  }

  const section = createEstimateSection(
    "home_goods",
    "Уборка и товары для дома",
    items,
    "Финишная уборка по площади пола и комплект товаров для дома по пакету C / B / A.",
  );

  return {
    packageLevel: options.packageLevel,
    packageLabel,
    cleaningTotal,
    homeGoodsTotal,
    total: section.totals.total,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    section,
  };
}
