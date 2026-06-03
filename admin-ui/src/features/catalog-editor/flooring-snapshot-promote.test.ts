import { describe, expect, it, vi } from "vitest";

import { snapshotCoveringRowToCreatePayload } from "./api/flooring-mappers";
import type { FlooringSnapshotDisplayRow } from "./api/flooring-types";
import { promoteSnapshotRowToCatalog } from "./flooring-snapshot-promote";

const COVERING_ROW: FlooringSnapshotDisplayRow = {
  section: "coverings",
  code: "carpet",
  title: "Ковролин",
  rates: {
    materialPricePerM2: 1200,
    baseWastePercent: 8,
    underlayPricePerM2: 0,
    adhesivePricePerM2: 50,
    primerPricePerM2: 0,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 10,
  },
};

const PREPARATION_ROW: FlooringSnapshotDisplayRow = {
  section: "preparations",
  code: "prime",
  title: "Грунтование",
  rates: { laborPricePerM2: 200, materialPricePerM2: 80 },
};

const LAYOUT_ROW: FlooringSnapshotDisplayRow = {
  section: "layouts",
  code: "diag",
  title: "Диагональ",
  rates: { laborPricePerM2: 450, laborFactor: 1.2, additionalWastePercent: 5 },
};

function makeDeps(overrides: Partial<Parameters<typeof promoteSnapshotRowToCatalog>[1]> = {}) {
  return {
    createCovering: vi.fn().mockResolvedValue({ id: 99, title: "Ковролин" }),
    createPreparation: vi.fn().mockResolvedValue({ id: 88, title: "Грунтование" }),
    createLayout: vi.fn().mockResolvedValue({ id: 77, title: "Диагональ" }),
    reloadCatalog: vi.fn().mockResolvedValue({
      coverings: [{ id: 99, title: "Ковролин" }],
      preparations: [{ id: 88, title: "Грунтование" }],
      layouts: [{ id: 77, title: "Диагональ" }],
    }),
    ...overrides,
  };
}

describe("promoteSnapshotRowToCatalog", () => {
  it("covering without catalogId: create payload and resolve created id", async () => {
    const deps = makeDeps();
    const result = await promoteSnapshotRowToCatalog(COVERING_ROW, deps);

    expect(result).toEqual({
      action: "created",
      id: 99,
      section: "coverings",
      title: "Ковролин",
    });
    expect(deps.createCovering).toHaveBeenCalledWith(snapshotCoveringRowToCreatePayload(COVERING_ROW));
    expect(deps.createPreparation).not.toHaveBeenCalled();
    expect(deps.createLayout).not.toHaveBeenCalled();
    expect(deps.reloadCatalog).toHaveBeenCalled();
  });

  it("row with catalogId: no duplicate create", async () => {
    const deps = makeDeps();
    const row = { ...COVERING_ROW, catalogId: 42 };
    const result = await promoteSnapshotRowToCatalog(row, deps);

    expect(result).toEqual({
      action: "edit_existing",
      catalogId: 42,
      section: "coverings",
      title: "Ковролин",
    });
    expect(deps.createCovering).not.toHaveBeenCalled();
    expect(deps.reloadCatalog).not.toHaveBeenCalled();
  });

  it("preparation route: POST preparation payload", async () => {
    const deps = makeDeps();
    const result = await promoteSnapshotRowToCatalog(PREPARATION_ROW, deps);

    expect(result).toEqual({
      action: "created",
      id: 88,
      section: "preparations",
      title: "Грунтование",
    });
    expect(deps.createPreparation).toHaveBeenCalled();
    expect(deps.createCovering).not.toHaveBeenCalled();
  });

  it("layout route: POST layout payload", async () => {
    const deps = makeDeps();
    const result = await promoteSnapshotRowToCatalog(LAYOUT_ROW, deps);

    expect(result).toEqual({
      action: "created",
      id: 77,
      section: "layouts",
      title: "Диагональ",
    });
    expect(deps.createLayout).toHaveBeenCalled();
    expect(deps.createCovering).not.toHaveBeenCalled();
  });

  it("unsupported section returns error", async () => {
    const deps = makeDeps();
    const row: FlooringSnapshotDisplayRow = {
      section: "plinthTypes",
      code: "p1",
      title: "Плинтус",
      rates: { materialPricePerMeter: 100, laborPricePerMeter: 50, factor: 1 },
    };
    const result = await promoteSnapshotRowToCatalog(row, deps);

    expect(result.action).toBe("error");
    if (result.action === "error") {
      expect(result.message).toContain("покрытий");
    }
    expect(deps.createCovering).not.toHaveBeenCalled();
  });

  it("resolves id by title when create DTO omits id", async () => {
    const deps = makeDeps({
      createCovering: vi.fn().mockResolvedValue({ title: "Ковролин" }),
      reloadCatalog: vi.fn().mockResolvedValue({
        coverings: [{ id: 55, title: "Ковролин" }],
        preparations: [],
        layouts: [],
      }),
    });
    const result = await promoteSnapshotRowToCatalog(COVERING_ROW, deps);
    expect(result).toEqual({
      action: "created",
      id: 55,
      section: "coverings",
      title: "Ковролин",
    });
  });
});
