import { describe, expect, it } from "vitest";

import type { CoveringAssemblyRow } from "./flooring-assembly";
import {
  aggregateCoveringAssembly,
  getKeramogranit120x60Preset,
} from "./flooring-assembly";
import { emptyCoveringDraft, emptyLayoutDraft, emptyPreparationDraft } from "./flooring-catalog-model";
import {
  buildFlooringPackageFlatProjection,
  prepareCoveringDraftForCatalogSave,
  prepareLayoutDraftForCatalogSave,
  preparePreparationDraftForCatalogSave,
  validateAssemblyRowsForTarget,
} from "./flooring-package-projection";
import { coveringDraftToPayload } from "./api/flooring-mappers";

function makeRow(overrides: Partial<CoveringAssemblyRow> = {}): CoveringAssemblyRow {
  return {
    id: "row-1",
    title: "Строка",
    kind: "material",
    formula: "flat_per_m2",
    unit: "m2",
    price: 100,
    consumptionPerM2: 1,
    enabled: true,
    ...overrides,
  };
}

describe("buildFlooringPackageFlatProjection", () => {
  it("covering: keramogranit preset совпадает с aggregateCoveringAssembly", () => {
    const rows = getKeramogranit120x60Preset();
    const aggregates = aggregateCoveringAssembly(rows);
    const flat = buildFlooringPackageFlatProjection("covering", rows);

    expect(flat).not.toBeNull();
    expect(flat?.materialPricePerM2).toBe(aggregates.recommendedFlatFields.materialPricePerM2);
    expect(flat?.adhesivePricePerM2).toBe(aggregates.recommendedFlatFields.adhesivePricePerM2);
    expect(flat?.primerPricePerM2).toBe(aggregates.recommendedFlatFields.primerPricePerM2);
    expect(flat?.svpPricePerM2).toBe(aggregates.recommendedFlatFields.svpPricePerM2);
    expect(flat?.groutPricePerM2).toBe(aggregates.recommendedFlatFields.groutPricePerM2);
    expect(flat?.toolConsumablesPerM2).toBe(aggregates.recommendedFlatFields.toolConsumablesPerM2);
  });

  it("preparation/layout: только work", () => {
    const work = makeRow({
      kind: "work",
      formula: "flat_per_m2",
      price: 900,
      consumptionPerM2: 1.2,
    });
    expect(buildFlooringPackageFlatProjection("preparation", [work])).toEqual({
      laborPricePerM2: 1080,
      materialPricePerM2: 0,
    });
    expect(buildFlooringPackageFlatProjection("layout", [work])).toEqual({
      laborPricePerM2: 1080,
    });
  });

  it("пустой или disabled-only состав → null", () => {
    expect(buildFlooringPackageFlatProjection("covering", [])).toBeNull();
    expect(
      buildFlooringPackageFlatProjection("covering", [makeRow({ enabled: false })]),
    ).toBeNull();
  });

  it("covering отклоняет work", () => {
    expect(() =>
      validateAssemblyRowsForTarget("covering", [
        makeRow({ kind: "work", title: "Укладка" }),
      ]),
    ).toThrow(/covering/i);
  });

  it("preparation отклоняет material", () => {
    expect(() =>
      validateAssemblyRowsForTarget("preparation", [makeRow({ kind: "material" })]),
    ).toThrow(/preparation/i);
  });
});

describe("prepareCoveringDraftForCatalogSave", () => {
  it("create covering: material/consumables/tool попадают в flat payload", () => {
    const rows = getKeramogranit120x60Preset();
    const prepared = prepareCoveringDraftForCatalogSave(
      { ...emptyCoveringDraft(), title: "Керамогранит" },
      rows,
    );
    expect(prepared.status).toBe("projected");
    if (prepared.status !== "projected") return;

    const payload = coveringDraftToPayload(prepared.draft);
    expect(payload.material_price_per_m2).toBe(2900);
    expect(payload.glue_price_per_unit).toBe(180);
    expect(payload.primer_price_per_unit).toBe(25);
    expect(payload.svp_price_per_unit).toBe(120);
    expect(payload.grout_price_per_unit).toBe(18);
    expect(payload.instrument_price_per_m2).toBe(40);
    expect(payload.labor_price_per_m2).toBe(0);
  });

  it("edit covering: flat form игнорируется при непустом составе", () => {
    const prepared = prepareCoveringDraftForCatalogSave(
      {
        ...emptyCoveringDraft(),
        title: "Тест",
        materialPricePerM2: 1,
        gluePricePerUnit: 2,
      },
      [makeRow({ price: 500, consumptionPerM2: 1 })],
    );
    expect(prepared.status).toBe("projected");
    if (prepared.status !== "projected") return;
    expect(prepared.draft.materialPricePerM2).toBe(500);
    expect(prepared.draft.gluePricePerUnit).toBe(2);
  });

  it("пустой состав → unchanged", () => {
    const draft = { ...emptyCoveringDraft(), title: "Flat only", materialPricePerM2: 777 };
    expect(prepareCoveringDraftForCatalogSave(draft, [])).toEqual({ status: "unchanged", draft });
  });

  it("невалидный kind блокирует save", () => {
    const result = prepareCoveringDraftForCatalogSave(emptyCoveringDraft(), [
      makeRow({ kind: "work", title: "Работа" }),
    ]);
    expect(result).toEqual({
      status: "error",
      message: "Invalid flooring package row kind for covering",
    });
  });
});

describe("preparePreparationDraftForCatalogSave", () => {
  it("work из assembly → laborPricePerM2", () => {
    const prepared = preparePreparationDraftForCatalogSave(emptyPreparationDraft(), [
      makeRow({ kind: "work", price: 500, consumptionPerM2: 2 }),
    ]);
    expect(prepared.status).toBe("projected");
    if (prepared.status !== "projected") return;
    expect(prepared.draft.laborPricePerM2).toBe(1000);
    expect(prepared.draft.materialPricePerM2).toBe(0);
  });
});

describe("prepareLayoutDraftForCatalogSave", () => {
  it("work из assembly → laborPricePerM2 и laborFactor", () => {
    const prepared = prepareLayoutDraftForCatalogSave(emptyLayoutDraft(), [
      makeRow({ kind: "work", price: 2000, consumptionPerM2: 1.25 }),
    ]);
    expect(prepared.status).toBe("projected");
    if (prepared.status !== "projected") return;
    expect(prepared.draft.laborPricePerM2).toBe(2500);
    expect(prepared.draft.laborFactor).toBe(1.25);
  });
});
