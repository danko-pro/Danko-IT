import { describe, expect, it } from "vitest";

import {
  flooringCoveringRates,
  flooringExtraRates,
  flooringLayoutRates,
  flooringPlinthRates,
  flooringPreparationRates,
} from "./public-estimate-flooring";
import {
  getFlooringSnapshotCatalog,
  getFlooringSnapshotRates,
  getPackageBackedFlooringRows,
  isPackageBackedFlooringCatalogRow,
  loadFlooringSnapshot,
  validateFlooringSnapshot,
} from "./public-flooring-snapshot";
import packageSeed from "../../../scripts/flooring-v2-package-seed.json";

const EXPECTED_PLINTH_CODES = ["none", "duropolymer", "painted_mdf"];

function expectCodesPresent(items: Array<{ code: string }>, expectedCodes: string[]) {
  const presentCodes = new Set(items.map((item) => item.code));

  for (const code of expectedCodes) {
    expect(presentCodes.has(code)).toBe(true);
  }
}

describe("flooring snapshot", () => {
  it("loads and validates the package-first v2 seed", () => {
    expect(validateFlooringSnapshot(packageSeed)).toEqual({ ok: true });
    expect(packageSeed.version).toBe("flooring-v2");
    expect(packageSeed.coverings.find((item) => item.code === "laminate")?.materialPricePerM2).toBe(930);
    expect(packageSeed.layouts.find((item) => item.code === "straight")?.laborPricePerM2).toBe(1000);
    expect(packageSeed.globalAddons.thresholdPrice).toBe(900);
    expect(packageSeed.coverings.every((item) => Array.isArray(item.specLines) && item.specLines.length > 0)).toBe(
      true,
    );
  });

  it("loads generated snapshot after package-first prebuild", () => {
    const snapshot = loadFlooringSnapshot();
    expect(snapshot.version).toBe("flooring-v2");
    expect(snapshot.coverings.every((item) => Array.isArray(item.specLines) && item.specLines.length > 0)).toBe(true);
  });

  it("contains non-empty package-backed catalog sections", () => {
    const snapshot = loadFlooringSnapshot();
    expect(snapshot.coverings.length).toBeGreaterThan(0);
    expect(snapshot.preparations.length).toBeGreaterThan(0);
    expect(snapshot.layouts.length).toBeGreaterThan(0);
    expect(snapshot.coverings.every((item) => item.specLines.length > 0)).toBe(true);
    expect(snapshot.preparations.every((item) => item.specLines.length > 0)).toBe(true);
    expect(snapshot.layouts.every((item) => item.specLines.length > 0)).toBe(true);
    expectCodesPresent(snapshot.plinthTypes, EXPECTED_PLINTH_CODES);
  });

  it("rejects flooring-v2 catalog rows without specLines", () => {
    const payload = {
      ...packageSeed,
      coverings: packageSeed.coverings.map(({ specLines: _specLines, ...item }) => item),
    };

    expect(validateFlooringSnapshot(payload)).toEqual({
      ok: false,
      reason: "coverings[porcelain] missing required specLines",
    });
  });

  it("accepts optional procurement fields on specLines", () => {
    const payload = {
      ...packageSeed,
      coverings: packageSeed.coverings.map((item) =>
        item.code === "laminate"
          ? {
              ...item,
              specLines: [
                {
                  code: "flooring-line-laminate-consumables",
                  title: "Клей плиточный",
                  category: "consumables",
                  basis: "area",
                  unit: "kg",
                  quantityPerBasis: 7.5,
                  unitPrice: 24,
                  packageSize: 25,
                  packageUnit: "kg",
                  packagePrice: 600,
                  purchaseMode: "package",
                  purchaseAggregation: "project",
                  aggregationKey: "flooring-line-laminate-consumables",
                  calculationNote: "1.5 kg/m²/mm × 5 mm",
                },
              ],
            }
          : item,
      ),
    };

    expect(validateFlooringSnapshot(payload)).toEqual({ ok: true });
  });

  it("rejects forbidden keys inside specLines", () => {
    const payload = {
      ...packageSeed,
      coverings: packageSeed.coverings.map((item) =>
        item.code === "laminate"
          ? {
              ...item,
              specLines: [
                {
                  code: "flooring-line-laminate-materials",
                  title: "Ламинат доска",
                  category: "materials",
                  basis: "area",
                  unit: "m2",
                  quantityPerBasis: 1,
                  unitPrice: 930,
                  note: "internal",
                },
              ],
            }
          : item,
      ),
    };

    expect(validateFlooringSnapshot(payload)).toEqual({
      ok: false,
      reason: "forbidden internal keys: note",
    });
  });

  it("rejects invalid specLines shape", () => {
    const payload = {
      ...packageSeed,
      preparations: packageSeed.preparations.map((item) =>
        item.code === "primer"
          ? {
              ...item,
              specLines: [
                {
                  code: "line",
                  title: "Work",
                  category: "invalid",
                  basis: "area",
                  unit: "m2",
                  quantityPerBasis: 1,
                  unitPrice: 10,
                },
              ],
            }
          : item,
      ),
    };

    expect(validateFlooringSnapshot(payload)).toEqual({
      ok: false,
      reason: "preparations[primer].specLines[0].category is invalid",
    });
  });

  it("rejects numeric-looking specLine units", () => {
    const payload = {
      ...packageSeed,
      coverings: packageSeed.coverings.map((item) =>
        item.code === "laminate"
          ? {
              ...item,
              specLines: item.specLines.map((line, index) => (index === 0 ? { ...line, unit: "0,08" } : line)),
            }
          : item,
      ),
    };

    expect(validateFlooringSnapshot(payload)).toEqual({
      ok: false,
      reason: "coverings[laminate].specLines[0].unit must be a measurement unit",
    });
  });

  it("has no forbidden internal keys in the package seed", () => {
    expect(validateFlooringSnapshot(packageSeed)).toEqual({ ok: true });
  });

  it("rejects invalid snapshot payloads", () => {
    expect(validateFlooringSnapshot(null)).toEqual({
      ok: false,
      reason: "payload must be a non-null object",
    });

    expect(
      validateFlooringSnapshot({
        version: "flooring-v1",
        coverings: [],
        preparations: [],
        layouts: [],
        plinthTypes: [],
        globalAddons: { thresholdPrice: 1, demolitionPricePerM2: 1 },
      }),
    ).toEqual({
      ok: false,
      reason: "coverings must contain at least one item",
    });

    expect(
      validateFlooringSnapshot({
        ...packageSeed,
        globalAddons: {
          ...packageSeed.globalAddons,
          note: "internal",
        },
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden internal keys: note",
    });
  });

  it("accepts flooring-v2 payloads without legacy seed codes when rows are package-backed", () => {
    expect(
      validateFlooringSnapshot({
        ...packageSeed,
        layouts: packageSeed.layouts.filter((item) => item.code !== "large_format_straight"),
      }),
    ).toEqual({ ok: true });
  });

  it("keeps required seed codes for legacy flooring-v1 payloads", () => {
    expect(
      validateFlooringSnapshot({
        version: "flooring-v1",
        coverings: packageSeed.coverings
          .filter((item) => item.code !== "porcelain")
          .map(({ specLines: _specLines, ...item }) => ({
            ...item,
            laborPricePerM2: 1000,
          })),
        preparations: packageSeed.preparations.map(({ specLines: _specLines, ...item }) => item),
        layouts: packageSeed.layouts.map(({ specLines: _specLines, laborPricePerM2: _legacy, ...item }) => item),
        plinthTypes: packageSeed.plinthTypes,
        globalAddons: packageSeed.globalAddons,
      }),
    ).toEqual({
      ok: false,
      reason: "coverings missing required code: porcelain",
    });
  });

  it("keeps flooring-v1 payloads valid for legacy fallback", () => {
    const legacyPayload = {
      version: "flooring-v1",
      coverings: packageSeed.coverings.map(({ specLines: _specLines, ...item }) => ({
        ...item,
        laborPricePerM2: item.code === "laminate" ? 1000 : 0,
      })),
      preparations: packageSeed.preparations.map(({ specLines: _specLines, ...item }) => item),
      layouts: packageSeed.layouts.map(({ specLines: _specLines, laborPricePerM2: _legacy, ...item }) => item),
      plinthTypes: packageSeed.plinthTypes,
      globalAddons: packageSeed.globalAddons,
    };

    expect(validateFlooringSnapshot(legacyPayload)).toEqual({ ok: true });
  });

  it("matches exported hardcoded rate tables from public-estimate-flooring", () => {
    const rates = getFlooringSnapshotRates();

    expect(rates.flooringCoveringRates).toEqual(flooringCoveringRates);
    expect(rates.flooringPreparationRates).toEqual(flooringPreparationRates);
    expect(rates.flooringLayoutRates).toEqual(flooringLayoutRates);
    expect(rates.flooringPlinthRates).toEqual(flooringPlinthRates);
    expect(rates.flooringExtraRates).toEqual(flooringExtraRates);
  });

  it("getPackageBackedFlooringRows excludes v2 rows without specLines", () => {
    const payload = {
      ...packageSeed,
      coverings: [
        packageSeed.coverings[0]!,
        {
          ...packageSeed.coverings[0]!,
          code: "flat_only",
          title: "Flat only",
          specLines: [],
        },
      ],
    };

    expect(isPackageBackedFlooringCatalogRow(packageSeed.coverings[0]!)).toBe(true);
    expect(isPackageBackedFlooringCatalogRow({ ...packageSeed.coverings[0]!, specLines: [] })).toBe(false);

    const backed = getPackageBackedFlooringRows(payload);
    expect(backed.coverings.map((item) => item.code)).not.toContain("flat_only");
    expect(backed.coverings.length).toBe(1);
  });

  it("getFlooringSnapshotCatalog returns full catalog items by code", () => {
    const snapshot = loadFlooringSnapshot();
    const catalog = getFlooringSnapshotCatalog();
    const covering = snapshot.coverings[0];
    const preparation = snapshot.preparations[0];
    const layout = snapshot.layouts[0];

    expect(catalog.coverings[covering.code]).toEqual(covering);
    expect(catalog.preparations[preparation.code]).toEqual(preparation);
    expect(catalog.layouts[layout.code]).toEqual(layout);
    expect(catalog.coverings[covering.code].specLines.length).toBeGreaterThan(0);
  });

  it("getFlooringSnapshotCatalog exposes custom active snapshot codes with specLines", () => {
    const payload = {
      ...packageSeed,
      coverings: [
        ...packageSeed.coverings,
        {
          code: "custom_covering",
          title: "Кастомное покрытие",
          materialPricePerM2: 0,
          baseWastePercent: 0,
          underlayPricePerM2: 0,
          adhesivePricePerM2: 0,
          primerPricePerM2: 0,
          svpPricePerM2: 0,
          groutPricePerM2: 0,
          toolConsumablesPerM2: 0,
          specLines: [
            {
              code: "custom-covering-material",
              title: "Кастомное покрытие",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 0,
            },
          ],
        },
      ],
    };

    expect(validateFlooringSnapshot(payload).ok).toBe(true);

    const catalog = {
      coverings: Object.fromEntries(payload.coverings.map((item) => [item.code, item])),
      preparations: Object.fromEntries(payload.preparations.map((item) => [item.code, item])),
      layouts: Object.fromEntries(payload.layouts.map((item) => [item.code, item])),
    };

    expect(catalog.coverings.custom_covering.title).toBe("Кастомное покрытие");
    expect(catalog.coverings.custom_covering.code).toBe("custom_covering");
  });
});
