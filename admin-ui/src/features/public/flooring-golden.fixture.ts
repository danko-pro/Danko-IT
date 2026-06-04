import type {
  FlooringSnapshot,
  FlooringSnapshotCatalog,
  FlooringSnapshotRates,
} from "./public-flooring-snapshot";
import packageSeed from "../../../scripts/flooring-v2-package-seed.json";

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
export const FLOORING_GOLDEN_SNAPSHOT = packageSeed as FlooringSnapshot;

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
