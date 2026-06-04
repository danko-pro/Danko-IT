import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CoveringAssemblyRow } from "./flooring-assembly";
import { getKeramogranit120x60Preset } from "./flooring-assembly";
import { createFlooringCatalogRowFromAssembly } from "./flooring-catalog-assembly-create-row";

vi.mock("./api/flooring-client", () => ({
  createFlooringCoveringFromAssembly: vi.fn(),
  createFlooringLayoutFromAssembly: vi.fn(),
  createFlooringPreparationFromAssembly: vi.fn(),
  fetchFlooringSnapshot: vi.fn(),
  listFlooringCoverings: vi.fn(),
  listFlooringLayouts: vi.fn(),
  listFlooringPreparations: vi.fn(),
}));

vi.mock("./flooring-catalog-assembly-save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./flooring-catalog-assembly-save")>();
  return {
    ...actual,
    finalizeAssemblyTargetRowCreate: vi.fn().mockResolvedValue(true),
  };
});

import {
  createFlooringCoveringFromAssembly,
  fetchFlooringSnapshot,
  listFlooringCoverings,
} from "./api/flooring-client";

function makeRow(overrides: Partial<CoveringAssemblyRow> = {}): CoveringAssemblyRow {
  return {
    id: "row-1",
    title: "Строка",
    kind: "work",
    formula: "flat_per_m2",
    unit: "m2",
    price: 100,
    consumptionPerM2: 1,
    enabled: true,
    ...overrides,
  };
}

function emptyAggregates() {
  return {
    worksPerM2: 0,
    materialPerM2: 0,
    consumablesPerM2: 0,
    toolPerM2: 0,
    recommendedFlatFields: {
      materialPricePerM2: 0,
      laborPricePerM2: 0,
      adhesivePricePerM2: 0,
      primerPricePerM2: 0,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 0,
    },
  };
}

describe("createFlooringCatalogRowFromAssembly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("covering: flat create payload из projection, не из aggregates UI", async () => {
    vi.mocked(createFlooringCoveringFromAssembly).mockResolvedValue({ id: 42 });
    vi.mocked(fetchFlooringSnapshot).mockResolvedValue({ coverings: [], preparations: [], layouts: [], plinthTypes: [], globalAddons: { thresholdPrice: 0, demolitionPricePerM2: 0 } });
    vi.mocked(listFlooringCoverings).mockResolvedValue([{ id: 42, title: "Керамогранит" } as never]);

    const deps = {
      setSnapshot: vi.fn(),
      setCoveringCatalog: vi.fn(),
      setPreparationCatalog: vi.fn(),
      setLayoutCatalog: vi.fn(),
      setError: vi.fn(),
      setStatusMessage: vi.fn(),
      setWarningMessage: vi.fn(),
    };

    await createFlooringCatalogRowFromAssembly(
      deps,
      "covering",
      "Керамогранит",
      { ...emptyAggregates(), worksPerM2: 999, recommendedFlatFields: { ...emptyAggregates().recommendedFlatFields, materialPricePerM2: 1 } },
      getKeramogranit120x60Preset(),
    );

    expect(createFlooringCoveringFromAssembly).toHaveBeenCalledTimes(1);
    const callPayload = vi.mocked(createFlooringCoveringFromAssembly).mock.calls[0][0];
    expect(callPayload.catalog.material_price_per_m2).toBe(2900);
    expect(callPayload.catalog.glue_price_per_unit).toBe(180);
    expect(callPayload.catalog.instrument_price_per_m2).toBe(40);
    expect(callPayload.assembly.rows.length).toBeGreaterThan(0);
  });

  it("невалидный kind для covering → error без create", async () => {
    const setError = vi.fn();

    const ok = await createFlooringCatalogRowFromAssembly(
      {
        setSnapshot: vi.fn(),
        setCoveringCatalog: vi.fn(),
        setPreparationCatalog: vi.fn(),
        setLayoutCatalog: vi.fn(),
        setError,
        setStatusMessage: vi.fn(),
        setWarningMessage: vi.fn(),
      },
      "covering",
      "Тест",
      emptyAggregates(),
      [makeRow({ kind: "work", title: "Работа" })],
    );

    expect(ok).toBe(false);
    expect(createFlooringCoveringFromAssembly).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith("Invalid flooring package row kind for covering");
  });
});
