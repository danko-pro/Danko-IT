import { describe, expect, it } from "vitest";

import type { FlooringSnapshot } from "../../public/public-flooring-snapshot";
import {
  consumablePricePerM2,
  coveringDtoToConsumableRates,
  coveringDraftToPayload,
  dtoToFlooringCoveringDraft,
  dtoToFlooringLayoutDraft,
  dtoToFlooringPreparationDraft,
  layoutDraftToPayload,
  normalizeNum,
  snapshotToDisplayRows,
} from "./flooring-mappers";
import type { FlooringCoveringDto, FlooringLayoutDto, FlooringPreparationDto } from "./flooring-types";

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
    labor_multiplier: 1.1,
    extra_waste_percent: 5,
    note: null,
    ...overrides,
  };
}

const MINI_SNAPSHOT: FlooringSnapshot = {
  version: "flooring-v1",
  coverings: [
    {
      code: "porcelain",
      title: "Керамогранит",
      materialPricePerM2: 2900,
      laborPricePerM2: 2000,
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
  layouts: [{ code: "straight", title: "Прямая", laborFactor: 1.1, additionalWastePercent: 5 }],
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
  it("маппит laborFactor и additionalWastePercent", () => {
    const draft = dtoToFlooringLayoutDraft(makeLayoutDto());
    expect(draft.laborFactor).toBe(1.1);
    expect(draft.additionalWastePercent).toBe(5);
  });

  it("нулевой labor_multiplier → laborFactor 1", () => {
    const draft = dtoToFlooringLayoutDraft(makeLayoutDto({ labor_multiplier: 0 }));
    expect(draft.laborFactor).toBe(1);
  });
});

describe("draft payloads", () => {
  it("coveringDraftToPayload сохраняет snake_case поля", () => {
    const draft = dtoToFlooringCoveringDraft(makeCoveringDto({ note: "  заметка  " }));
    const payload = coveringDraftToPayload(draft);
    expect(payload.material_price_per_m2).toBe(2900);
    expect(payload.labor_price_per_m2).toBe(2000);
    expect(payload.note).toBe("заметка");
    expect(payload.custom_consumables[0].title).toBe("Прокладка");
  });

  it("layoutDraftToPayload отдаёт labor_multiplier и extra_waste_percent", () => {
    const draft = dtoToFlooringLayoutDraft(makeLayoutDto());
    const payload = layoutDraftToPayload(draft);
    expect(payload.labor_multiplier).toBe(1.1);
    expect(payload.extra_waste_percent).toBe(5);
    expect(payload.note).toBeNull();
  });
});

describe("snapshotToDisplayRows", () => {
  it("строит строки preview по секциям snapshot", () => {
    const rows = snapshotToDisplayRows(MINI_SNAPSHOT);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      section: "coverings",
      code: "porcelain",
      rates: { materialPricePerM2: 2900, laborPricePerM2: 2000 },
    });
    expect(rows.find((row) => row.section === "layouts")?.rates).toEqual({
      laborFactor: 1.1,
      additionalWastePercent: 5,
    });
    expect(rows.find((row) => row.section === "globalAddons")?.rates).toEqual({
      thresholdPrice: 900,
      demolitionPricePerM2: 150,
    });
  });
});
