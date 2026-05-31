import { describe, expect, it } from "vitest";

import {
  flooringCoveringRates,
  flooringExtraRates,
  flooringLayoutRates,
  flooringPlinthRates,
  flooringPreparationRates,
} from "./public-estimate-flooring";
import {
  getFlooringSnapshotRates,
  loadFlooringSnapshot,
  validateFlooringSnapshot,
} from "./public-flooring-snapshot";
import flooringSnapshotData from "./generated/flooring.snapshot.json";

const EXPECTED_COVERING_CODES = ["porcelain", "quartz_vinyl", "laminate", "carpet", "engineered_wood"];
const EXPECTED_PREPARATION_CODES = ["none", "primer", "self_leveling", "waterproofing"];
const EXPECTED_LAYOUT_CODES = ["straight", "large_format_straight", "glue", "floating"];
const EXPECTED_PLINTH_CODES = ["none", "duropolymer", "painted_mdf"];

function expectCodesPresent(items: Array<{ code: string }>, expectedCodes: string[]) {
  const presentCodes = items.map((item) => item.code).sort();
  expect(presentCodes).toEqual([...expectedCodes].sort());
}

describe("flooring snapshot", () => {
  it("loads and validates the generated v1 snapshot", () => {
    const snapshot = loadFlooringSnapshot();
    expect(snapshot.version).toBe("flooring-v1");
    expect(snapshot.coverings.find((item) => item.code === "laminate")?.materialPricePerM2).toBe(930);
    expect(snapshot.globalAddons.thresholdPrice).toBe(900);
  });

  it("contains all expected catalog codes", () => {
    const snapshot = loadFlooringSnapshot();
    expectCodesPresent(snapshot.coverings, EXPECTED_COVERING_CODES);
    expectCodesPresent(snapshot.preparations, EXPECTED_PREPARATION_CODES);
    expectCodesPresent(snapshot.layouts, EXPECTED_LAYOUT_CODES);
    expectCodesPresent(snapshot.plinthTypes, EXPECTED_PLINTH_CODES);
  });

  it("has no forbidden internal keys in the seed snapshot", () => {
    expect(validateFlooringSnapshot(flooringSnapshotData)).toEqual({ ok: true });
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
      reason: "coverings missing required code: porcelain",
    });

    expect(
      validateFlooringSnapshot({
        ...flooringSnapshotData,
        globalAddons: {
          ...flooringSnapshotData.globalAddons,
          note: "internal",
        },
      }),
    ).toEqual({
      ok: false,
      reason: "forbidden internal keys: note",
    });
  });

  it("matches exported hardcoded rate tables from public-estimate-flooring", () => {
    const rates = getFlooringSnapshotRates();

    expect(rates.flooringCoveringRates).toEqual(flooringCoveringRates);
    expect(rates.flooringPreparationRates).toEqual(flooringPreparationRates);
    expect(rates.flooringLayoutRates).toEqual(flooringLayoutRates);
    expect(rates.flooringPlinthRates).toEqual(flooringPlinthRates);
    expect(rates.flooringExtraRates).toEqual(flooringExtraRates);
  });
});
