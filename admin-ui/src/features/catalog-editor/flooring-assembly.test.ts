import { describe, expect, it } from "vitest";

import {
  aggregateCoveringAssembly,
  applyAggregatesToCoveringDraft,
  calculateAssemblyRowTotal,
  createEmptyAssemblyRow,
  formatCoveringSaveFeedback,
  getAssemblyFormulaLabel,
  getAssemblyKindLabel,
  getFormulaFieldVisibility,
  getKeramogranit120x60Preset,
  getRecommendedFlatFieldEntries,
  inferDefaultFormula,
  type CoveringAssemblyRow,
} from "./flooring-assembly";
import type { FlooringCoveringDraft } from "./api/flooring-types";

function makeRow(overrides: Partial<CoveringAssemblyRow> & Pick<CoveringAssemblyRow, "id">): CoveringAssemblyRow {
  const kind = overrides.kind ?? "work";
  return createEmptyAssemblyRow({
    title: "Строка",
    kind,
    unit: "m2",
    price: 0,
    consumptionPerM2: 1,
    enabled: true,
    ...overrides,
  });
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
      makeRow({ id: "w1", kind: "work", formula: "flat_per_m2", price: 1000, enabled: true }),
      makeRow({ id: "w2", kind: "work", formula: "flat_per_m2", price: 500, enabled: false }),
    ]);
    expect(aggregates.worksPerM2).toBe(1000);
    expect(aggregates.recommendedFlatFields.laborPricePerM2).toBe(1000);
  });

  it("суммирует work и material", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({ id: "w", kind: "work", formula: "flat_per_m2", price: 2000 }),
      makeRow({ id: "m1", kind: "material", formula: "flat_per_m2", price: 2900 }),
      makeRow({ id: "m2", kind: "material", formula: "flat_per_m2", price: 100 }),
    ]);
    expect(aggregates.worksPerM2).toBe(2000);
    expect(aggregates.materialPerM2).toBe(3000);
    expect(aggregates.recommendedFlatFields.laborPricePerM2).toBe(2000);
    expect(aggregates.recommendedFlatFields.materialPricePerM2).toBe(3000);
  });

  it("считает consumable через unit_consumption", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({
        id: "glue",
        kind: "consumable",
        formula: "unit_consumption",
        title: "Клей плиточный",
        price: 300,
        consumptionPerM2: 1.5,
      }),
      makeRow({
        id: "primer",
        kind: "consumable",
        formula: "unit_consumption",
        title: "Грунтовка",
        price: 125,
        consumptionPerM2: 0.2,
      }),
    ]);
    expect(aggregates.consumablesPerM2).toBe(450 + 25);
    expect(aggregates.recommendedFlatFields.adhesivePricePerM2).toBe(450);
    expect(aggregates.recommendedFlatFields.primerPricePerM2).toBe(25);
  });

  it("учитывает package_consumption для consumable", () => {
    const aggregates = aggregateCoveringAssembly([
      makeRow({
        id: "pack",
        kind: "consumable",
        formula: "package_consumption",
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
      makeRow({ id: "t1", kind: "tool", formula: "flat_per_m2", price: 40 }),
      makeRow({ id: "t2", kind: "tool", formula: "flat_per_m2", price: 10 }),
    ]);
    expect(aggregates.toolPerM2).toBe(50);
    expect(aggregates.recommendedFlatFields.toolConsumablesPerM2).toBe(50);
  });
});

describe("getAssemblyKindLabel", () => {
  it("возвращает русские подписи типов", () => {
    expect(getAssemblyKindLabel("work")).toBe("Работа");
    expect(getAssemblyKindLabel("material")).toBe("Материал");
    expect(getAssemblyKindLabel("consumable")).toBe("Расходник");
    expect(getAssemblyKindLabel("tool")).toBe("Инструмент");
  });
});

describe("getAssemblyFormulaLabel", () => {
  it("возвращает русские подписи формул", () => {
    expect(getAssemblyFormulaLabel("flat_per_m2")).toBe("₽/м² напрямую");
    expect(getAssemblyFormulaLabel("layer_consumption")).toBe("Слой × фасовка × расход");
  });
});

describe("inferDefaultFormula", () => {
  it("для work/material/tool возвращает flat_per_m2", () => {
    expect(inferDefaultFormula("work")).toBe("flat_per_m2");
    expect(inferDefaultFormula("material")).toBe("flat_per_m2");
    expect(inferDefaultFormula("tool")).toBe("flat_per_m2");
  });

  it("для consumable выбирает формулу по названию", () => {
    expect(inferDefaultFormula("consumable", { title: "Клей плиточный" })).toBe("layer_consumption");
    expect(inferDefaultFormula("consumable", { title: "Грунтовка" })).toBe("package_consumption");
    expect(inferDefaultFormula("consumable", { title: "СВП 2 мм" })).toBe("piece_consumption");
    expect(inferDefaultFormula("consumable", { title: "Затирка" })).toBe("package_consumption");
    expect(inferDefaultFormula("consumable", { title: "Прочее" })).toBe("unit_consumption");
  });
});

describe("getFormulaFieldVisibility", () => {
  it("скрывает поля для flat_per_m2", () => {
    expect(getFormulaFieldVisibility("flat_per_m2")).toEqual({
      consumption: false,
      packageSize: false,
      layerMm: false,
    });
  });

  it("показывает нужные поля для layer_consumption", () => {
    expect(getFormulaFieldVisibility("layer_consumption")).toEqual({
      consumption: true,
      packageSize: true,
      layerMm: true,
    });
  });
});

describe("calculateAssemblyRowTotal", () => {
  it("flat_per_m2 возвращает price", () => {
    expect(
      calculateAssemblyRowTotal(makeRow({ id: "w", kind: "work", formula: "flat_per_m2", price: 2000 })),
    ).toBe(2000);
    expect(
      calculateAssemblyRowTotal(makeRow({ id: "m", kind: "material", formula: "flat_per_m2", price: 2900 })),
    ).toBe(2900);
    expect(
      calculateAssemblyRowTotal(makeRow({ id: "t", kind: "tool", formula: "flat_per_m2", price: 40 })),
    ).toBe(40);
  });

  it("unit_consumption: price × consumptionPerM2", () => {
    expect(
      calculateAssemblyRowTotal(
        makeRow({
          id: "c",
          kind: "consumable",
          formula: "unit_consumption",
          price: 300,
          consumptionPerM2: 1.5,
        }),
      ),
    ).toBe(450);
  });

  it("package_consumption: (price / packageSize) × consumptionPerM2", () => {
    expect(
      calculateAssemblyRowTotal(
        makeRow({
          id: "c",
          kind: "consumable",
          formula: "package_consumption",
          price: 600,
          packageSize: 25,
          consumptionPerM2: 1.5,
        }),
      ),
    ).toBe((600 / 25) * 1.5);
  });

  it("layer_consumption: (price / packageSize) × consumptionPerM2 × layerMm", () => {
    expect(
      calculateAssemblyRowTotal(
        makeRow({
          id: "c",
          kind: "consumable",
          formula: "layer_consumption",
          price: 600,
          packageSize: 25,
          consumptionPerM2: 1.5,
          layerMm: 5,
        }),
      ),
    ).toBe((600 / 25) * 1.5 * 5);
  });

  it("piece_consumption без фасовки: price × consumptionPerM2", () => {
    expect(
      calculateAssemblyRowTotal(
        makeRow({
          id: "c",
          kind: "consumable",
          formula: "piece_consumption",
          price: 30,
          consumptionPerM2: 4,
        }),
      ),
    ).toBe(120);
  });

  it("piece_consumption с фасовкой: (price / packageSize) × consumptionPerM2", () => {
    expect(
      calculateAssemblyRowTotal(
        makeRow({
          id: "c",
          kind: "consumable",
          formula: "piece_consumption",
          price: 3000,
          packageSize: 100,
          consumptionPerM2: 4,
        }),
      ),
    ).toBe((3000 / 100) * 4);
  });
});

describe("getRecommendedFlatFieldEntries", () => {
  it("возвращает человекочитаемые подписи полей", () => {
    const aggregates = aggregateCoveringAssembly(getKeramogranit120x60Preset());
    const entries = getRecommendedFlatFieldEntries(aggregates.recommendedFlatFields);
    expect(entries.map((e) => e.label)).toEqual([
      "Материал покрытия",
      "Работа",
      "Клей",
      "Грунт",
      "СВП",
      "Затирка",
      "Инструмент",
    ]);
    expect(entries.find((e) => e.label === "Материал покрытия")?.valuePerM2).toBe(2900);
    expect(entries.find((e) => e.label === "Клей")?.valuePerM2).toBe(180);
    expect(entries.find((e) => e.label === "Грунт")?.valuePerM2).toBe(25);
    expect(entries.find((e) => e.label === "СВП")?.valuePerM2).toBe(120);
    expect(entries.find((e) => e.label === "Затирка")?.valuePerM2).toBe(18);
  });
});

describe("getKeramogranit120x60Preset", () => {
  it("возвращает непустой набор строк с формулами", () => {
    const preset = getKeramogranit120x60Preset();
    expect(preset.length).toBeGreaterThan(0);
    expect(preset.some((row) => row.kind === "material")).toBe(true);
    expect(preset.some((row) => row.kind === "work")).toBe(true);
    expect(preset.some((row) => row.kind === "consumable")).toBe(true);
    expect(preset.every((row) => row.formula)).toBe(true);
    const glue = preset.find((row) => row.title.includes("Клей"));
    expect(glue?.formula).toBe("layer_consumption");
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

describe("formatCoveringSaveFeedback", () => {
  it("формирует сообщение о создании с ключевыми ставками", () => {
    const draft = emptyDraft();
    draft.materialPricePerM2 = 2900;
    draft.laborPricePerM2 = 2000;
    draft.instrumentPricePerM2 = 40;

    const message = formatCoveringSaveFeedback("Керамогранит", draft, "create");
    expect(message).toContain("Покрытие «Керамогранит» создано в БД");
    expect(message).toMatch(/материал 2[\s\u00a0]900 ₽\/м²/);
    expect(message).toMatch(/работа 2[\s\u00a0]000 ₽\/м²/);
    expect(message).toContain("инструмент 40 ₽/м²");
    expect(message).toContain("Строки «Состав покрытия» не сохраняются");
  });

  it("упоминает неизменённый черновик состава", () => {
    const draft = emptyDraft();
    draft.materialPricePerM2 = 100;
    const message = formatCoveringSaveFeedback("Тест", draft, "create", { assemblyRowsRemain: true });
    expect(message).toContain("Черновик состава в форме не изменён");
  });
});

describe("createEmptyAssemblyRow", () => {
  it("задаёт formula по умолчанию", () => {
    const row = createEmptyAssemblyRow({ kind: "work" });
    expect(row.formula).toBe("flat_per_m2");
    const consumable = createEmptyAssemblyRow({ kind: "consumable", title: "Клей" });
    expect(consumable.formula).toBe("layer_consumption");
  });
});
