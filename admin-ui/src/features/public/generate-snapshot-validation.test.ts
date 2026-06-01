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

  it("accepts legacy flooring v1 payloads", () => {
    const legacyPayload = {
      ...FLOORING_V2_SEED,
      version: "flooring-v1",
      coverings: FLOORING_V2_SEED.coverings.map((item) => ({ ...item, laborPricePerM2: 1000 })),
      layouts: FLOORING_V2_SEED.layouts.map(({ laborPricePerM2: _legacy, ...item }) => item),
    };

    expect(validateFlooringSnapshotPayload(legacyPayload)).toEqual({ ok: true });
  });

  it("rejects flooring payloads missing required catalog codes", () => {
    expect(
      validateFlooringSnapshotPayload({
        ...FLOORING_V2_SEED,
        coverings: FLOORING_V2_SEED.coverings.filter((item) => item.code !== "porcelain"),
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
});
