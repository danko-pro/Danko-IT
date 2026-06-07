import type {
  FlooringSnapshot,
  FlooringSnapshotCatalog,
  FlooringSnapshotRates,
} from "./public-flooring-snapshot";

/**
 * FP7c frozen flooring snapshot for `public-estimate-flooring` golden tests.
 *
 * Golden room: 16 m², perimeter 16.8 m, plinth 15.9 m; laminate / none / straight;
 * duropolymer plinth enabled. Independent of `generated/flooring.snapshot.json` drift.
 *
 * Breakdown (rounded): works 17600+4800+7155, materials 17112+1600+7155,
 * consumables 4048+400+640 → total 60510.
 * Purchase area: 16 × (1 + (10% base + 5% layout waste)) = 18.4 m².
 */
export const FLOORING_GOLDEN_SNAPSHOT: FlooringSnapshot = {
  version: "flooring-v2",
  coverings: [
    {
      code: "porcelain",
      title: "Керамогранит",
      materialPricePerM2: 2900,
      baseWastePercent: 10,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 450,
      primerPricePerM2: 25,
      svpPricePerM2: 120,
      groutPricePerM2: 90,
      toolConsumablesPerM2: 40,
    },
    {
      code: "quartz_vinyl",
      title: "Кварцвинил",
      materialPricePerM2: 1700,
      baseWastePercent: 5,
      underlayPricePerM2: 220,
      adhesivePricePerM2: 0,
      primerPricePerM2: 25,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 80,
    },
    {
      code: "laminate",
      title: "Ламинат",
      materialPricePerM2: 930,
      baseWastePercent: 10,
      underlayPricePerM2: 220,
      adhesivePricePerM2: 0,
      primerPricePerM2: 25,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 40,
    },
    {
      code: "carpet",
      title: "Ковролин",
      materialPricePerM2: 1500,
      baseWastePercent: 7,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 250,
      primerPricePerM2: 25,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 40,
    },
    {
      code: "engineered_wood",
      title: "Инженерная доска",
      materialPricePerM2: 6000,
      baseWastePercent: 10,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 900,
      primerPricePerM2: 120,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 120,
    },
  ],
  preparations: [
    { code: "none", title: "Без подготовки", laborPricePerM2: 300, materialPricePerM2: 100 },
    { code: "primer", title: "Грунтование", laborPricePerM2: 250, materialPricePerM2: 120 },
    { code: "self_leveling", title: "Наливной пол", laborPricePerM2: 650, materialPricePerM2: 120 },
    { code: "waterproofing", title: "Гидроизоляция", laborPricePerM2: 300, materialPricePerM2: 80 },
  ],
  layouts: [
    {
      code: "straight",
      title: "Прямая",
      laborPricePerM2: 1000,
      laborFactor: 1.1,
      additionalWastePercent: 5,
    },
    {
      code: "large_format_straight",
      title: "Крупный формат",
      laborPricePerM2: 2000,
      laborFactor: 1.2,
      additionalWastePercent: 10,
    },
    {
      code: "glue",
      title: "Клеевая",
      laborPricePerM2: 800,
      laborFactor: 1.25,
      additionalWastePercent: 5,
    },
    {
      code: "floating",
      title: "Плавающая",
      laborPricePerM2: 1000,
      laborFactor: 1,
      additionalWastePercent: 3,
    },
  ],
  plinthTypes: [
    { code: "none", title: "Без плинтуса", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 },
    {
      code: "duropolymer",
      title: "Дюрополимерный",
      materialPricePerMeter: 450,
      laborPricePerMeter: 450,
      factor: 1,
    },
    {
      code: "painted_mdf",
      title: "МДФ окрашенный",
      materialPricePerMeter: 650,
      laborPricePerMeter: 500,
      factor: 1,
    },
  ],
  globalAddons: {
    thresholdPrice: 900,
    demolitionPricePerM2: 150,
  },
};

/** Golden room area (m²) used in `public-estimate-flooring.test.ts`. */
export const FLOORING_GOLDEN_ROOM_AREA = 16;

/** Laminate purchase multiplier: base 10% + straight layout 5% waste. */
export const FLOORING_GOLDEN_LAMINATE_PURCHASE_FACTOR = 1.15;

export const FLOORING_GOLDEN_LAMINATE_PURCHASE_AREA =
  FLOORING_GOLDEN_ROOM_AREA * FLOORING_GOLDEN_LAMINATE_PURCHASE_FACTOR;

export const FLOORING_GOLDEN_TOTAL = 60510;

function catalogItemsByCode<T extends { code: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.code, item]));
}

function pickRates<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  keys: readonly K[],
): Pick<T, K> {
  const rates = {} as Pick<T, K>;
  for (const key of keys) {
    rates[key] = item[key];
  }
  return rates;
}

export function getFlooringGoldenSnapshotCatalog(): FlooringSnapshotCatalog {
  const snapshot = FLOORING_GOLDEN_SNAPSHOT;

  return {
    coverings: catalogItemsByCode(snapshot.coverings),
    preparations: catalogItemsByCode(snapshot.preparations),
    layouts: catalogItemsByCode(snapshot.layouts),
  };
}

export function getFlooringGoldenSnapshotRates(): FlooringSnapshotRates {
  const snapshot = FLOORING_GOLDEN_SNAPSHOT;

  return {
    flooringCoveringRates: Object.fromEntries(
      snapshot.coverings.map((item) => [
        item.code,
        pickRates(item, [
          "materialPricePerM2",
          "baseWastePercent",
          "underlayPricePerM2",
          "adhesivePricePerM2",
          "primerPricePerM2",
          "svpPricePerM2",
          "groutPricePerM2",
          "toolConsumablesPerM2",
        ]),
      ]),
    ),
    flooringPreparationRates: Object.fromEntries(
      snapshot.preparations.map((item) => [
        item.code,
        pickRates(item, ["laborPricePerM2", "materialPricePerM2"]),
      ]),
    ),
    flooringLayoutRates: Object.fromEntries(
      snapshot.layouts.map((item) => [
        item.code,
        pickRates(item, ["laborPricePerM2", "laborFactor", "additionalWastePercent"]),
      ]),
    ),
    flooringPlinthRates: Object.fromEntries(
      snapshot.plinthTypes.map((item) => [
        item.code,
        pickRates(item, ["materialPricePerMeter", "laborPricePerMeter", "factor"]),
      ]),
    ),
    flooringExtraRates: { ...snapshot.globalAddons },
  };
}
