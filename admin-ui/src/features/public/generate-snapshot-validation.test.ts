import { describe, expect, it } from "vitest";

import {
  buildFlooringSnapshotUrl,
  buildSnapshotUrl,
  buildWarmFloorSnapshotUrl,
  findForbiddenKeys,
  FLOORING_V2_SEED,
  resolveRemoteBaseUrl,
  validateFlooringSnapshotPayload,
  validateSnapshotPayload,
  validateWarmFloorSnapshotPayload,
  WARM_FLOOR_V1_SEED,
} from "../../../scripts/generate-snapshot.js";

describe("generate-snapshot validation", () => {
  it("resolves remote base URL in priority order", () => {
    const prevPublic = process.env.PUBLIC_SNAPSHOT_BASE_URL;
    const prevVite = process.env.VITE_API_BASE_URL;
    try {
      delete process.env.PUBLIC_SNAPSHOT_BASE_URL;
      delete process.env.VITE_API_BASE_URL;
      expect(resolveRemoteBaseUrl()).toBeNull();

      process.env.VITE_API_BASE_URL = "https://api.example.com/";
      expect(resolveRemoteBaseUrl()).toBe("https://api.example.com/");

      process.env.PUBLIC_SNAPSHOT_BASE_URL = "https://snapshot.example.com";
      expect(resolveRemoteBaseUrl()).toBe("https://snapshot.example.com");
    } finally {
      if (prevPublic === undefined) {
        delete process.env.PUBLIC_SNAPSHOT_BASE_URL;
      } else {
        process.env.PUBLIC_SNAPSHOT_BASE_URL = prevPublic;
      }
      if (prevVite === undefined) {
        delete process.env.VITE_API_BASE_URL;
      } else {
        process.env.VITE_API_BASE_URL = prevVite;
      }
    }
  });

  it("builds snapshot URL without duplicate slashes", () => {
    expect(buildSnapshotUrl("https://api.example.com")).toBe(
      "https://api.example.com/api/public/catalog/plumbing/snapshot",
    );
    expect(buildSnapshotUrl("https://api.example.com/")).toBe(
      "https://api.example.com/api/public/catalog/plumbing/snapshot",
    );
    expect(buildWarmFloorSnapshotUrl("https://api.example.com/")).toBe(
      "https://api.example.com/api/public/catalog/warm-floor/snapshot",
    );
    expect(buildFlooringSnapshotUrl("https://api.example.com/")).toBe(
      "https://api.example.com/api/public/catalog/flooring/snapshot",
    );
  });

  it("accepts a minimal valid public payload", () => {
    const result = validateSnapshotPayload({
      version: "snapshot-abc",
      items: [],
      zones: [{ code: "zone-kitchen-sink" }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects empty zones and forbidden internal keys", () => {
    expect(validateSnapshotPayload({ version: "v1", items: [], zones: [] })).toEqual({
      ok: false,
      reason: "zones must be a non-empty array",
    });

    const leaked = findForbiddenKeys({
      zones: [{ packages: [{ work_price: 1 }] }],
    });
    expect(leaked.has("work_price")).toBe(true);

    expect(
      validateSnapshotPayload({
        version: "v1",
        items: [],
        zones: [{ riskPercent: 6.4 }],
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden internal keys: riskPercent",
    });
  });

  it("accepts the warm-floor v1 seed payload", () => {
    expect(validateWarmFloorSnapshotPayload(WARM_FLOOR_V1_SEED)).toEqual({ ok: true });
  });

  it("rejects warm-floor payloads without water/electric sections", () => {
    expect(validateWarmFloorSnapshotPayload({ version: "warm-floor-v1" })).toEqual({
      ok: false,
      reason: "water must be an object",
    });
  });

  it("accepts the flooring v2 seed payload", () => {
    expect(validateFlooringSnapshotPayload(FLOORING_V2_SEED)).toEqual({ ok: true });
  });

  it("accepts legacy flooring v1 payloads without specLines", () => {
    const legacyPayload = {
      ...FLOORING_V2_SEED,
      version: "flooring-v1",
      coverings: FLOORING_V2_SEED.coverings.map(({ specLines: _specLines, ...item }) => ({
        ...item,
        laborPricePerM2: 1000,
      })),
      layouts: FLOORING_V2_SEED.layouts.map(({ specLines: _specLines, laborPricePerM2: _legacy, ...item }) => item),
      preparations: FLOORING_V2_SEED.preparations.map(({ specLines: _specLines, ...item }) => item),
    };

    expect(validateFlooringSnapshotPayload(legacyPayload)).toEqual({ ok: true });
  });

  it("accepts flooring-v2 payloads without legacy seed codes", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        coverings: FLOORING_V2_SEED.coverings.filter((item) => item.code !== "porcelain"),
      }),
    ).toEqual({ ok: true });
  });

  it("rejects flooring-v2 payloads with empty package sections", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        coverings: [],
      }),
    ).toEqual({
      ok: false,
      reason: "coverings must contain at least one item",
    });
  });

  it("keeps required seed codes for legacy flooring-v1 payloads", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        version: "flooring-v1",
        coverings: FLOORING_V2_SEED.coverings
          .filter((item) => item.code !== "porcelain")
          .map(({ specLines: _specLines, ...item }) => ({
            ...item,
            laborPricePerM2: 1000,
          })),
        layouts: FLOORING_V2_SEED.layouts.map(({ specLines: _specLines, laborPricePerM2: _legacy, ...item }) => item),
        preparations: FLOORING_V2_SEED.preparations.map(({ specLines: _specLines, ...item }) => item),
      }),
    ).toEqual({
      ok: false,
      reason: "coverings missing required code: porcelain",
    });
  });

  it("rejects flooring payloads with forbidden internal keys", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        globalAddons: {
          ...FLOORING_V2_SEED.globalAddons,
          note: "internal",
        },
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden internal keys: note",
    });
  });

  it("accepts valid flooring-v2 procurement specLines on catalog items", () => {
    const payload = {
      ...FLOORING_V2_SEED,
      coverings: FLOORING_V2_SEED.coverings.map((item) =>
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

    expect(validateFlooringSnapshotPayload(payload)).toEqual({ ok: true });
  });

  it("accepts valid flooring-v2 specLines on catalog items", () => {
    const payload = {
      ...FLOORING_V2_SEED,
      coverings: FLOORING_V2_SEED.coverings.map((item) =>
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
                  packageSize: 2.5,
                  packageUnit: "m2",
                },
              ],
            }
          : item,
      ),
    };

    expect(validateFlooringSnapshotPayload(payload)).toEqual({ ok: true });
  });

  it("rejects flooring-v2 catalog rows without specLines", () => {
    const payload = {
      ...FLOORING_V2_SEED,
      coverings: FLOORING_V2_SEED.coverings.map(({ specLines: _specLines, ...item }) => item),
    };

    expect(validateFlooringSnapshotPayload(payload)).toEqual({
      ok: false,
      reason: "coverings[porcelain] missing required specLines",
    });
  });

  it("rejects invalid specLines category, basis, and numeric fields", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        preparations: FLOORING_V2_SEED.preparations.map((item) =>
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
      }),
    ).toEqual({
      ok: false,
      reason: "preparations[primer].specLines[0].category is invalid",
    });

    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        layouts: FLOORING_V2_SEED.layouts.map((item) =>
          item.code === "straight"
            ? {
                ...item,
                specLines: [
                  {
                    code: "line",
                    title: "Work",
                    category: "works",
                    basis: "length",
                    unit: "m2",
                    quantityPerBasis: 1,
                    unitPrice: 10,
                  },
                ],
              }
            : item,
        ),
      }),
    ).toEqual({
      ok: false,
      reason: "layouts[straight].specLines[0].basis must be area",
    });

    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        coverings: FLOORING_V2_SEED.coverings.map((item) =>
          item.code === "carpet"
            ? {
                ...item,
                specLines: [
                  {
                    code: "line",
                    title: "Work",
                    category: "works",
                    basis: "area",
                    unit: "m2",
                    quantityPerBasis: Number.NaN,
                    unitPrice: 10,
                  },
                ],
              }
            : item,
        ),
      }),
    ).toEqual({
      ok: false,
      reason: "coverings[carpet].specLines[0].quantityPerBasis must be a finite number",
    });
  });

  it("rejects numeric-looking flooring specLine units", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        coverings: FLOORING_V2_SEED.coverings.map((item) =>
          item.code === "laminate"
            ? {
                ...item,
                specLines: item.specLines.map((line, index) =>
                  index === 0 ? { ...line, unit: "0,08" } : line,
                ),
              }
            : item,
        ),
      }),
    ).toEqual({
      ok: false,
      reason: "coverings[laminate].specLines[0].unit must be a measurement unit",
    });
  });

  it("rejects forbidden keys inside specLines", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        coverings: FLOORING_V2_SEED.coverings.map((item) =>
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
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden internal keys: note",
    });
  });
});
