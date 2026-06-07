import { describe, expect, it } from "vitest";

import type { FlooringSnapshot } from "../../public/public-flooring-snapshot";
import {
  assemblyItemDraftToPayload,
  attachCatalogIdsToDisplayRows,
  consumablePricePerM2,
  coveringDtoToConsumableRates,
  coveringDraftToPayload,
  coveringDraftToUpdatePayload,
  dtoToFlooringAssemblyItemDraft,
  dtoToFlooringCoveringDraft,
  dtoToFlooringLayoutDraft,
  dtoToFlooringPreparationDraft,
  layoutDraftToPayload,
  layoutDraftToUpdatePayload,
  normalizeNum,
  preparationDraftToPayload,
  preparationDraftToUpdatePayload,
  snapshotToDisplayRows,
} from "./flooring-mappers";
import type {
  FlooringAssemblyItemDto,
  FlooringCoveringDto,
  FlooringLayoutDto,
  FlooringPreparationDto,
} from "./flooring-types";

function makeCoveringDto(overrides: Partial<FlooringCoveringDto> = {}): FlooringCoveringDto {
  return {
    id: 1,
    title: "Керамогранит",
    material_price_per_m2: 2900,
    labor_price_per_m2: 2000,
    base_waste_percent: 10,
    underlay_mode: "none",
    underlay_consumption_per_m2: 0,
    glue_consumption_per_m2: 1.5,
    glue_unit: "kg",
    glue_price_per_unit: 300,
    primer_consumption_per_m2: 0.2,
    primer_unit: "l",
    primer_price_per_unit: 125,
    svp_consumption_per_m2: 4,
    svp_unit: "pcs",
    svp_price_per_unit: 30,
    grout_consumption_per_m2: 0.5,
    grout_unit: "kg",
    grout_price_per_unit: 180,
    custom_consumables_json: JSON.stringify([
      { title: "Прокладка", consumption_per_m2: 0.1, unit: "pcs", price_per_unit: 50 },
    ]),
    needs_plinth: 1,
    instrument_price_per_m2: 40,
    note: null,
    ...overrides,
  };
}

function makePreparationDto(overrides: Partial<FlooringPreparationDto> = {}): FlooringPreparationDto {
  return {
    id: 2,
    title: "Грунтование",
    labor_price_per_m2: 250,
    material_price_per_m2: 120,
    primer_consumption_per_m2: 0.15,
    primer_unit: "l",
    primer_price_per_unit: 100,
    note: null,
    ...overrides,
  };
}

function makeLayoutDto(overrides: Partial<FlooringLayoutDto> = {}): FlooringLayoutDto {
  return {
    id: 3,
    title: "Прямая",
    labor_price_per_m2: 1000,
    labor_multiplier: 1.1,
    extra_waste_percent: 5,
    note: null,
    ...overrides,
  };
}

function makeAssemblyItemDto(overrides: Partial<FlooringAssemblyItemDto> = {}): FlooringAssemblyItemDto {
  return {
    id: 4,
    source_code: "consumable-tile-glue",
    section: "consumable",
    title: "Клей плиточный",
    kind: "consumable",
    formula: "kg_layer_consumption",
    unit: "kg",
    price: 600,
    consumption_per_m2: 1.5,
    package_size: 25,
    layer_mm: 5,
    note: null,
    sort_order: 70,
    ...overrides,
  };
}

const MINI_SNAPSHOT: FlooringSnapshot = {
  version: "flooring-v2",
  coverings: [
    {
      code: "porcelain",
      title: "Керамогранит",
      materialPricePerM2: 2900,
      baseWastePercent: 10,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 450,
      primerPricePerM2: 25,
      svpPricePerM2: 120,
      groutPricePerM2: 90,
      toolConsumablesPerM2: 40,
    },
  ],
  preparations: [{ code: "primer", title: "Грунтование", laborPricePerM2: 250, materialPricePerM2: 120 }],
  layouts: [{ code: "straight", title: "Прямая", laborPricePerM2: 1000, laborFactor: 1.1, additionalWastePercent: 5 }],
  plinthTypes: [
    { code: "none", title: "Без плинтуса", materialPricePerMeter: 0, laborPricePerMeter: 0, factor: 1 },
  ],
  globalAddons: { thresholdPrice: 900, demolitionPricePerM2: 150 },
};

describe("normalizeNum", () => {
  it("нормализует строки и невалидные значения", () => {
    expect(normalizeNum("12,5")).toBe(12.5);
    expect(normalizeNum(null)).toBe(0);
    expect(normalizeNum(Number.NaN)).toBe(0);
  });
});

describe("dtoToFlooringCoveringDraft", () => {
  it("маппит material/labor/waste и расходники", () => {
    const draft = dtoToFlooringCoveringDraft(makeCoveringDto());
    expect(draft.materialPricePerM2).toBe(2900);
    expect(draft.laborPricePerM2).toBe(2000);
    expect(draft.baseWastePercent).toBe(10);
    expect(draft.glueConsumptionPerM2).toBe(1.5);
    expect(draft.gluePricePerUnit).toBe(300);
    expect(draft.customConsumables).toHaveLength(1);
    expect(draft.customConsumables[0].title).toBe("Прокладка");
    expect(draft.needsPlinth).toBe(true);
  });

  it("пустые optional-поля не ломают draft", () => {
    const draft = dtoToFlooringCoveringDraft(
      makeCoveringDto({
        note: null,
        custom_consumables_json: "",
        underlay_mode: " ",
        glue_unit: "",
        needs_plinth: 0,
      }),
    );
    expect(draft.note).toBe("");
    expect(draft.customConsumables).toEqual([]);
    expect(draft.underlayMode).toBe("none");
    expect(draft.glueUnit).toBe("kg");
    expect(draft.needsPlinth).toBe(false);
  });
});

describe("coveringDtoToConsumableRates", () => {
  it("агрегирует material/labor/waste и ₽/m² расходников", () => {
    const rates = coveringDtoToConsumableRates(makeCoveringDto(), { underlayPricePerM2: 120 });
    expect(rates.materialPricePerM2).toBe(2900);
    expect(rates.laborPricePerM2).toBe(2000);
    expect(rates.baseWastePercent).toBe(10);
    expect(rates.adhesivePricePerM2).toBe(consumablePricePerM2(1.5, 300));
    expect(rates.primerPricePerM2).toBe(consumablePricePerM2(0.2, 125));
    expect(rates.svpPricePerM2).toBe(consumablePricePerM2(4, 30));
    expect(rates.groutPricePerM2).toBe(consumablePricePerM2(0.5, 180));
    expect(rates.toolConsumablesPerM2).toBe(45);
  });
});

describe("dtoToFlooringPreparationDraft", () => {
  it("маппит labor/material", () => {
    const draft = dtoToFlooringPreparationDraft(makePreparationDto());
    expect(draft.laborPricePerM2).toBe(250);
    expect(draft.materialPricePerM2).toBe(120);
    expect(draft.note).toBe("");
  });
});

describe("dtoToFlooringLayoutDraft", () => {
  it("маппит laborPricePerM2, laborFactor и additionalWastePercent", () => {
    const draft = dtoToFlooringLayoutDraft(makeLayoutDto());
    expect(draft.laborPricePerM2).toBe(1000);
    expect(draft.laborFactor).toBe(1.1);
    expect(draft.additionalWastePercent).toBe(5);
  });

  it("нулевой labor_multiplier → laborFactor 1", () => {
    const draft = dtoToFlooringLayoutDraft(makeLayoutDto({ labor_multiplier: 0 }));
    expect(draft.laborFactor).toBe(1);
  });
});

describe("dtoToFlooringAssemblyItemDraft", () => {
  it("маппит кубик библиотеки полов", () => {
    const draft = dtoToFlooringAssemblyItemDraft(makeAssemblyItemDto());
    expect(draft.sourceCode).toBe("consumable-tile-glue");
    expect(draft.section).toBe("consumable");
    expect(draft.kind).toBe("consumable");
    expect(draft.formula).toBe("kg_layer_consumption");
    expect(draft.packageSize).toBe(25);
    expect(draft.layerMm).toBe(5);
  });
});

describe("draft payloads", () => {
  it("update payload совпадает с create payload", () => {
    const coveringDraft = dtoToFlooringCoveringDraft(makeCoveringDto());
    expect(coveringDraftToUpdatePayload(coveringDraft)).toEqual(coveringDraftToPayload(coveringDraft));
    const preparationDraft = dtoToFlooringPreparationDraft(makePreparationDto());
    expect(preparationDraftToUpdatePayload(preparationDraft)).toEqual(preparationDraftToPayload(preparationDraft));
    const layoutDraft = dtoToFlooringLayoutDraft(makeLayoutDto());
    expect(layoutDraftToUpdatePayload(layoutDraft)).toEqual(layoutDraftToPayload(layoutDraft));
  });

  it("coveringDraftToPayload сохраняет snake_case поля", () => {
    const draft = dtoToFlooringCoveringDraft(makeCoveringDto({ note: "  заметка  " }));
    const payload = coveringDraftToPayload(draft);
    expect(payload.material_price_per_m2).toBe(2900);
    expect(payload.labor_price_per_m2).toBe(0);
    expect(payload.note).toBe("заметка");
    expect(payload.custom_consumables[0].title).toBe("Прокладка");
  });

  it("layoutDraftToPayload отдаёт labor_price_per_m2, labor_multiplier и extra_waste_percent", () => {
    const draft = dtoToFlooringLayoutDraft(makeLayoutDto());
    const payload = layoutDraftToPayload(draft);
    expect(payload.labor_price_per_m2).toBe(1000);
    expect(payload.labor_multiplier).toBe(1.1);
    expect(payload.extra_waste_percent).toBe(5);
    expect(payload.note).toBeNull();
  });

  it("assemblyItemDraftToPayload сохраняет snake_case поля", () => {
    const draft = dtoToFlooringAssemblyItemDraft(makeAssemblyItemDto({ note: "  test  " }));
    const payload = assemblyItemDraftToPayload(draft);
    expect(payload.source_code).toBe("consumable-tile-glue");
    expect(payload.consumption_per_m2).toBe(1.5);
    expect(payload.package_size).toBe(25);
    expect(payload.layer_mm).toBe(5);
    expect(payload.note).toBe("test");
  });
});

describe("attachCatalogIdsToDisplayRows", () => {
  it("проставляет catalogId по совпадению title", () => {
    const rows = snapshotToDisplayRows(MINI_SNAPSHOT);
    const withIds = attachCatalogIdsToDisplayRows(rows, {
      coverings: [makeCoveringDto({ id: 11, title: "Керамогранит" })],
      preparations: [makePreparationDto({ id: 22, title: "Грунтование" })],
      layouts: [makeLayoutDto({ id: 33, title: "Прямая" })],
    });
    expect(withIds.find((row) => row.code === "porcelain")?.catalogId).toBe(11);
    expect(withIds.find((row) => row.code === "primer")?.catalogId).toBe(22);
    expect(withIds.find((row) => row.code === "straight")?.catalogId).toBe(33);
  });
});

describe("snapshotToDisplayRows", () => {
  it("строит строки preview по секциям snapshot", () => {
    const rows = snapshotToDisplayRows(MINI_SNAPSHOT);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      section: "coverings",
      code: "porcelain",
      rates: { materialPricePerM2: 2900 },
    });
    expect(rows.find((row) => row.section === "layouts")?.rates).toEqual({
      laborPricePerM2: 1000,
      laborFactor: 1.1,
      additionalWastePercent: 5,
    });
    expect(rows.find((row) => row.section === "globalAddons")?.rates).toEqual({
      thresholdPrice: 900,
      demolitionPricePerM2: 150,
    });
  });
});
