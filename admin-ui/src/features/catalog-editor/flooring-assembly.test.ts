import { describe, expect, it } from "vitest";

import {
  aggregateCoveringAssembly,
  applyAggregatesToCoveringDraft,
  getKeramogranit120x60Preset,
  type CoveringAssemblyRow,
} from "./flooring-assembly";
import type { FlooringCoveringDraft } from "./api/flooring-types";

function makeRow(overrides: Partial<CoveringAssemblyRow> & Pick<CoveringAssemblyRow, "id">): CoveringAssemblyRow {
  return {
    title: "Строка",
    kind: "work",
    unit: "m2",
    price: 0,
    consumptionPerM2: 1,
    enabled: true,
    ...overrides,
  };
}

function emptyDraft(): FlooringCoveringDraft {
  return {
    id: 0,
    title: "",
    materialPricePerM2: 0,
    laborPricePerM2: 0,
    baseWastePercent: 0,
    underlayMode: "none",
    underlayConsumptionPerM2: 0,
    glueConsumptionPerM2: 0,
    glueUnit: "kg",
    gluePricePerUnit: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    svpConsumptionPerM2: 0,
    svpUnit: "pcs",
    svpPricePerUnit: 0,
    groutConsumptionPerM2: 0,
    groutUnit: "kg",
    groutPricePerUnit: 0,
    customConsumables: [],
    needsPlinth: true,
    instrumentPricePerM2: 0,
    note: "",
  };
}

describe("aggregateCoveringAssembly", () => {
  it("игнорирует disabled-строки", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({ id: "w1", kind: "work", price: 1000, enabled: true }),
      makeRow({ id: "w2", kind: "work", price: 500, enabled: false }),
    ]);
    expect(aggregates.worksPerM2).toBe(1000);
    expect(aggregates.recommendedFlatFields.laborPricePerM2).toBe(1000);
  });

  it("суммирует work и material", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({ id: "w", kind: "work", price: 2000 }),
      makeRow({ id: "m1", kind: "material", price: 2900 }),
      makeRow({ id: "m2", kind: "material", price: 100 }),
    ]);
    expect(aggregates.worksPerM2).toBe(2000);
    expect(aggregates.materialPerM2).toBe(3000);
    expect(aggregates.recommendedFlatFields.laborPricePerM2).toBe(2000);
    expect(aggregates.recommendedFlatFields.materialPricePerM2).toBe(3000);
  });

  it("считает consumable как price × consumptionPerM2", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({
        id: "glue",
        kind: "consumable",
        title: "Клей плиточный",
        price: 300,
        consumptionPerM2: 1.5,
      }),
      makeRow({
        id: "primer",
        kind: "consumable",
        title: "Грунтовка",
        price: 125,
        consumptionPerM2: 0.2,
      }),
    ]);
    expect(aggregates.consumablesPerM2).toBe(450 + 25);
    expect(aggregates.recommendedFlatFields.adhesivePricePerM2).toBe(450);
    expect(aggregates.recommendedFlatFields.primerPricePerM2).toBe(25);
  });

  it("учитывает packageSize для consumable", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({
        id: "pack",
        kind: "consumable",
        title: "Клей",
        price: 600,
        packageSize: 25,
        consumptionPerM2: 1.5,
      }),
    ]);
    expect(aggregates.recommendedFlatFields.adhesivePricePerM2).toBe((600 / 25) * 1.5);
  });

  it("суммирует tool в toolPerM2", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({ id: "t1", kind: "tool", price: 40 }),
      makeRow({ id: "t2", kind: "tool", price: 10 }),
    ]);
    expect(aggregates.toolPerM2).toBe(50);
    expect(aggregates.recommendedFlatFields.toolConsumablesPerM2).toBe(50);
  });
});

describe("getKeramogranit120x60Preset", () => {
  it("возвращает непустой набор строк", () => {
    const preset = getKeramogranit120x60Preset();
    expect(preset.length).toBeGreaterThan(0);
    expect(preset.some((row) => row.kind === "material")).toBe(true);
    expect(preset.some((row) => row.kind === "work")).toBe(true);
    expect(preset.some((row) => row.kind === "consumable")).toBe(true);
  });
});

describe("applyAggregatesToCoveringDraft", () => {
  it("маппит агрегаты в плоские поля draft", () => {
    const aggregates = aggregateCoveringAssembly(getKeramogranit120x60Preset());
    const draft = applyAggregatesToCoveringDraft(aggregates, emptyDraft());

    expect(draft.materialPricePerM2).toBe(aggregates.recommendedFlatFields.materialPricePerM2);
    expect(draft.laborPricePerM2).toBe(aggregates.recommendedFlatFields.laborPricePerM2);
    expect(draft.instrumentPricePerM2).toBe(aggregates.toolPerM2);
    expect(draft.gluePricePerUnit).toBe(aggregates.recommendedFlatFields.adhesivePricePerM2);
    expect(draft.glueConsumptionPerM2).toBe(1);
    expect(draft.primerPricePerUnit).toBe(aggregates.recommendedFlatFields.primerPricePerM2);
    expect(draft.svpPricePerUnit).toBe(aggregates.recommendedFlatFields.svpPricePerM2);
    expect(draft.groutPricePerUnit).toBe(aggregates.recommendedFlatFields.groutPricePerM2);
  });
});
