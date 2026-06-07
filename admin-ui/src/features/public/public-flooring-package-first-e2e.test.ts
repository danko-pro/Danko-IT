import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getFlooringCoveringOptions } from "./estimate/flooring-snapshot-options";
import { expandFlooringSectionForSpec } from "./public-estimate-flooring-spec";
import { calculateFlooring } from "./public-estimate-flooring";
import {
  getFlooringSnapshotSource,
  loadFlooringSnapshot,
  refreshFlooringSnapshotOnce,
  resetFlooringSnapshotRuntimeForTests,
} from "./public-flooring-snapshot";
import { buildSpecExportCsv } from "./estimate/spec-export";
import packageSeed from "../../../scripts/flooring-v2-package-seed.json";

const REMOTE_ONLY_CODE = "pf8_remote_only_covering";
const REMOTE_SPEC_TITLE = "PF8 remote spec material";

function parseCsvRows(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else if (char === "\r") {
      continue;
    } else {
      current += char;
    }
  }
  row.push(current);
  if (row.some((cell) => cell.length > 0) || rows.length > 0) {
    rows.push(row);
  }
  return rows;
}

function remoteSnapshotWithCustomCovering(materialPricePerM2: number) {
  return {
    ...packageSeed,
    coverings: [
      ...packageSeed.coverings,
      {
        code: REMOTE_ONLY_CODE,
        title: "PF8 только remote",
        materialPricePerM2,
        baseWastePercent: 0,
        underlayPricePerM2: 0,
        adhesivePricePerM2: 0,
        primerPricePerM2: 0,
        svpPricePerM2: 0,
        groutPricePerM2: 0,
        toolConsumablesPerM2: 0,
        specLines: [
          {
            code: "pf8-remote-material",
            title: REMOTE_SPEC_TITLE,
            category: "materials",
            basis: "area",
            unit: "m2",
            quantityPerBasis: 1,
            unitPrice: materialPricePerM2,
          },
        ],
      },
    ],
  };
}

const roomInput = {
  roomId: "pf8-room",
  roomName: "PF8 комната",
  area: 10,
  perimeter: 20,
  coveringType: REMOTE_ONLY_CODE,
  preparationType: "none",
  layoutType: "floating",
  isIncluded: true,
};

const calcOptions = {
  includePlinth: false,
  plinthType: "none" as const,
  includeThresholds: false,
  thresholdCount: 0,
  includeDemolition: false,
};

describe("PF8 package-first E2E chain (frontend)", () => {
  let bundledSnapshot: ReturnType<typeof loadFlooringSnapshot>;

  beforeEach(() => {
    resetFlooringSnapshotRuntimeForTests();
    bundledSnapshot = loadFlooringSnapshot();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetFlooringSnapshotRuntimeForTests();
    vi.unstubAllGlobals();
  });

  it("bundled snapshot has no remote-only custom row before refresh", () => {
    expect(getFlooringSnapshotSource()).toBe("bundled");
    expect(getFlooringCoveringOptions().map((option) => option.value)).not.toContain(REMOTE_ONLY_CODE);
    expect(loadFlooringSnapshot().coverings.some((item) => item.code === REMOTE_ONLY_CODE)).toBe(false);
  });

  it("refresh → dropdown → calculateFlooring → specLines → CSV use remote package data", async () => {
    const remotePrice = 42424;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => remoteSnapshotWithCustomCovering(remotePrice),
      }),
    );

    await refreshFlooringSnapshotOnce();

    expect(getFlooringSnapshotSource()).toBe("remote");
    expect(getFlooringCoveringOptions().map((option) => option.value)).toContain(REMOTE_ONLY_CODE);

    const result = calculateFlooring([roomInput], calcOptions);
    const roomResult = result.roomResults[0]!;
    expect(roomResult.materialCost).toBeCloseTo(roomResult.purchaseArea * remotePrice, 0);
    expect(result.specificationLines.some((line) => line.title.includes(REMOTE_SPEC_TITLE))).toBe(true);
    const remoteSpecLine = result.specificationLines.find((line) => line.title.includes(REMOTE_SPEC_TITLE));
    expect(remoteSpecLine?.unitPrice).toBe(remotePrice);

    const expanded = expandFlooringSectionForSpec(result.section, result.specificationSection);
    const csvRows = parseCsvRows(buildSpecExportCsv([expanded]));
    const dataRow = csvRows.find((row) => row[1]?.includes(REMOTE_SPEC_TITLE));
    expect(dataRow).toBeDefined();
    expect(Number(dataRow?.[5])).toBe(remotePrice);
  });

  it("successful remote refresh replaces bundled rates (not fallback-on-success)", async () => {
    const bundledLaminate = bundledSnapshot.coverings.find((item) => item.code === "laminate")?.materialPricePerM2;
    const remoteLaminatePrice = 88888;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...packageSeed,
          coverings: packageSeed.coverings.map((item) =>
            item.code === "laminate" ? { ...item, materialPricePerM2: remoteLaminatePrice } : item,
          ),
        }),
      }),
    );

    await refreshFlooringSnapshotOnce();

    expect(loadFlooringSnapshot().coverings.find((item) => item.code === "laminate")?.materialPricePerM2).toBe(
      remoteLaminatePrice,
    );
    expect(loadFlooringSnapshot().coverings.find((item) => item.code === "laminate")?.materialPricePerM2).not.toBe(
      bundledLaminate,
    );
  });
});

describe("PF8 regression: no fake fallback", () => {
  beforeEach(() => {
    resetFlooringSnapshotRuntimeForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetFlooringSnapshotRuntimeForTests();
    vi.unstubAllGlobals();
  });

  it("remote row without specLines is excluded from dropdown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...packageSeed,
          coverings: [
            ...packageSeed.coverings,
            {
              code: "pf8_flat_only_remote",
              title: "PF8 flat only",
              materialPricePerM2: 1,
              baseWastePercent: 0,
              underlayPricePerM2: 0,
              adhesivePricePerM2: 0,
              primerPricePerM2: 0,
              svpPricePerM2: 0,
              groutPricePerM2: 0,
              toolConsumablesPerM2: 0,
              specLines: [],
            },
          ],
        }),
      }),
    );

    await refreshFlooringSnapshotOnce();

    expect(getFlooringCoveringOptions().map((option) => option.value)).not.toContain("pf8_flat_only_remote");
  });

  it("selected covering absent from snapshot does not remap to default rates", () => {
    const result = calculateFlooring(
      [{ ...roomInput, coveringType: "pf8_missing_covering_code" }],
      calcOptions,
    );

    const coveringMaterial = result.section.items.find((item) => item.id.startsWith("flooring-material-"));
    expect(coveringMaterial?.total ?? 0).toBe(0);
    expect(result.roomResults[0]?.materialCost).toBe(0);
    expect(
      result.specificationLines.some(
        (line) => line.category === "materials" && line.sourceLabel.includes("Покрытие"),
      ),
    ).toBe(false);
  });

  it("bundled snapshot kept when remote fetch fails", async () => {
    const bundled = loadFlooringSnapshot();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await refreshFlooringSnapshotOnce();

    expect(getFlooringSnapshotSource()).toBe("bundled");
    expect(loadFlooringSnapshot()).toEqual(bundled);
  });
});
