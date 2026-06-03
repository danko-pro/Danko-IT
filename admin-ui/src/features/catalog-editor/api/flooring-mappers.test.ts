import { describe, expect, it } from "vitest";

import type { FlooringSnapshot } from "../../public/public-flooring-snapshot";
import {
  assemblyItemDraftToPayload,
  assemblyRowsToCatalogAssemblyDraftRows,
  attachCatalogIdsToDisplayRows,
  catalogAssemblyDraftRowsToAssemblyRows,
  catalogAssemblyDraftToPayload,
  catalogAssemblyDtoToDraft,
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
  snapshotCoveringRowToCreatePayload,
  snapshotLayoutRowToCreatePayload,
  snapshotPreparationRowToCreatePayload,
  snapshotToDisplayRows,
  snapshotUnderlayFieldsFromRate,
  DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2,
  SNAPSHOT_ROW_CREATE_NOTE,
} from "./flooring-mappers";
import type {
  FlooringAssemblyItemDto,
  FlooringCatalogAssemblyDto,
  FlooringCatalogAssemblyRowDto,
  FlooringCoveringDto,
  FlooringLayoutDto,
  FlooringPreparationDto,
  FlooringSnapshotDisplayRow,
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

function makeCatalogAssemblyRowDto(
  overrides: Partial<FlooringCatalogAssemblyRowDto> = {},
): FlooringCatalogAssemblyRowDto {
  return {
    id: 10,
    assembly_item_id: 4,
    section: "covering",
    kind: "material",
    formula: "flat_per_m2",
    title: "Керамогранит",
    unit: "m2",
    price: 1200,
    consumption_per_m2: 1.1,
    package_size: null,
    layer_mm: null,
    sort_order: 10,
    is_enabled: 1,
    public_category: "materials",
    public_title: "Материалы покрытия",
    ...overrides,
  };
}

function makeCatalogAssemblyDto(overrides: Partial<FlooringCatalogAssemblyDto> = {}): FlooringCatalogAssemblyDto {
  return {
    id: 5,
    target_kind: "covering",
    target_id: 11,
    title: "Состав покрытия",
    version: "flooring-assembly-v1",
    rows: [makeCatalogAssemblyRowDto()],
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

const CARPET_SNAPSHOT_ROW: FlooringSnapshotDisplayRow = {
  section: "coverings",
  code: "carpet",
  title: "Ковролин",
  rates: {
    materialPricePerM2: 1500,
    baseWastePercent: 7,
    underlayPricePerM2: 0,
    adhesivePricePerM2: 250,
    primerPricePerM2: 25,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 40,
  },
};

const LAMINATE_UNDERLAY_ROW: FlooringSnapshotDisplayRow = {
  section: "coverings",
  code: "laminate",
  title: "Ламинат",
  rates: {
    materialPricePerM2: 930,
    baseWastePercent: 10,
    underlayPricePerM2: 220,
    adhesivePricePerM2: 0,
    primerPricePerM2: 25,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 40,
  },
};

describe("snapshot row → create payload mappers", () => {
  it("маппит ковролин (carpet) в covering create payload", () => {
    const payload = snapshotCoveringRowToCreatePayload(CARPET_SNAPSHOT_ROW);
    expect(payload.title).toBe("Ковролин");
    expect(payload.material_price_per_m2).toBe(1500);
    expect(payload.base_waste_percent).toBe(7);
    expect(payload.labor_price_per_m2).toBe(0);
    expect(payload.glue_consumption_per_m2).toBe(1);
    expect(payload.glue_price_per_unit).toBe(250);
    expect(payload.primer_consumption_per_m2).toBe(1);
    expect(payload.primer_price_per_unit).toBe(25);
    expect(payload.instrument_price_per_m2).toBe(40);
    expect(payload.needs_plinth).toBe(true);
    expect(payload.note).toBe(SNAPSHOT_ROW_CREATE_NOTE);
    expect(payload.underlay_mode).toBe("none");
    expect(payload.underlay_consumption_per_m2).toBe(0);
  });

  it("covering labor_price_per_m2 всегда 0", () => {
    expect(snapshotCoveringRowToCreatePayload(CARPET_SNAPSHOT_ROW).labor_price_per_m2).toBe(0);
  });

  it("не теряет ₽/m² расходников (плоская модель consumption=1)", () => {
    const payload = snapshotCoveringRowToCreatePayload(CARPET_SNAPSHOT_ROW);
    expect(consumablePricePerM2(payload.glue_consumption_per_m2, payload.glue_price_per_unit)).toBe(250);
    expect(consumablePricePerM2(payload.primer_consumption_per_m2, payload.primer_price_per_unit)).toBe(25);
    expect(payload.instrument_price_per_m2).toBe(40);
  });

  it("сохраняет underlayPricePerM2 через mode required и consumption=rate", () => {
    const payload = snapshotCoveringRowToCreatePayload(LAMINATE_UNDERLAY_ROW);
    expect(payload.underlay_mode).toBe("required");
    expect(payload.underlay_consumption_per_m2).toBe(1);
    const rates = coveringDtoToConsumableRates(
      {
        ...makeCoveringDto(),
        title: "Ламинат",
        underlay_mode: payload.underlay_mode,
        underlay_consumption_per_m2: payload.underlay_consumption_per_m2,
      },
      { underlayPricePerM2: DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2 },
    );
    expect(rates.underlayPricePerM2).toBe(220);
  });

  it("маппит preparation snapshot row", () => {
    const row: FlooringSnapshotDisplayRow = {
      section: "preparations",
      code: "primer",
      title: "Грунтование",
      rates: { laborPricePerM2: 250, materialPricePerM2: 120 },
    };
    const payload = snapshotPreparationRowToCreatePayload(row);
    expect(payload).toEqual({
      title: "Грунтование",
      labor_price_per_m2: 250,
      material_price_per_m2: 120,
      primer_consumption_per_m2: 0,
      primer_unit: "l",
      primer_price_per_unit: 0,
      note: SNAPSHOT_ROW_CREATE_NOTE,
    });
  });

  it("маппит layout snapshot row (laborFactor → labor_multiplier)", () => {
    const row: FlooringSnapshotDisplayRow = {
      section: "layouts",
      code: "straight",
      title: "Прямая",
      rates: { laborPricePerM2: 1000, laborFactor: 1.1, additionalWastePercent: 5 },
    };
    const payload = snapshotLayoutRowToCreatePayload(row);
    expect(payload).toEqual({
      title: "Прямая",
      labor_price_per_m2: 1000,
      labor_multiplier: 1.1,
      extra_waste_percent: 5,
      note: SNAPSHOT_ROW_CREATE_NOTE,
    });
  });

  it("бросает при неверной section", () => {
    expect(() => snapshotCoveringRowToCreatePayload({ ...CARPET_SNAPSHOT_ROW, section: "layouts" })).toThrow(
      'snapshot row section must be "coverings"',
    );
    expect(() => snapshotPreparationRowToCreatePayload(CARPET_SNAPSHOT_ROW)).toThrow(
      'snapshot row section must be "preparations"',
    );
  });
});

describe("snapshotUnderlayFieldsFromRate", () => {
  it("0 → none", () => {
    expect(snapshotUnderlayFieldsFromRate(0)).toEqual({ underlayMode: "none", underlayConsumptionPerM2: 0 });
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

describe("catalogAssemblyDtoToDraft", () => {
  it("маппит targetKind/targetId/rows и snake_case поля", () => {
    const draft = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({
        target_kind: "preparation",
        target_id: 22,
        rows: [
          makeCatalogAssemblyRowDto({
            kind: "consumable",
            section: "consumable",
            formula: "kg_layer_consumption",
            consumption_per_m2: 1.5,
            package_size: 25,
            layer_mm: 5,
            public_category: "consumables",
          }),
        ],
      }),
    );
    expect(draft.targetKind).toBe("preparation");
    expect(draft.targetId).toBe(22);
    expect(draft.rows).toHaveLength(1);
    expect(draft.rows[0].assemblyItemId).toBe(4);
    expect(draft.rows[0].consumptionPerM2).toBe(1.5);
    expect(draft.rows[0].packageSize).toBe(25);
    expect(draft.rows[0].layerMm).toBe(5);
    expect(draft.rows[0].publicCategory).toBe("consumables");
    expect(draft.rows[0].publicTitle).toBe("Материалы покрытия");
  });

  it("targetKind остаётся singular (не plural)", () => {
    expect(catalogAssemblyDtoToDraft(makeCatalogAssemblyDto({ target_kind: "covering" })).targetKind).toBe(
      "covering",
    );
    expect(catalogAssemblyDtoToDraft(makeCatalogAssemblyDto({ target_kind: "layout" })).targetKind).toBe("layout");
  });

  it("is_enabled 0/1 → isEnabled boolean", () => {
    const enabled = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({ rows: [makeCatalogAssemblyRowDto({ is_enabled: 1 })] }),
    );
    const disabled = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({ rows: [makeCatalogAssemblyRowDto({ is_enabled: 0 })] }),
    );
    expect(enabled.rows[0].isEnabled).toBe(true);
    expect(disabled.rows[0].isEnabled).toBe(false);
  });

  it("optional null поля остаются null", () => {
    const draft = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({
        rows: [
          makeCatalogAssemblyRowDto({
            assembly_item_id: null,
            package_size: null,
            layer_mm: null,
            public_title: null,
          }),
        ],
      }),
    );
    expect(draft.rows[0].assemblyItemId).toBeNull();
    expect(draft.rows[0].packageSize).toBeNull();
    expect(draft.rows[0].layerMm).toBeNull();
    expect(draft.rows[0].publicTitle).toBeNull();
  });
});

describe("catalogAssemblyDraftToPayload", () => {
  it("возвращает snake_case payload", () => {
    const draft = catalogAssemblyDtoToDraft(makeCatalogAssemblyDto());
    const payload = catalogAssemblyDraftToPayload(draft);
    expect(payload.title).toBe("Состав покрытия");
    expect(payload.version).toBe("flooring-assembly-v1");
    expect(payload.rows[0]).toMatchObject({
      assembly_item_id: 4,
      consumption_per_m2: 1.1,
      package_size: null,
      layer_mm: null,
      is_enabled: true,
      public_category: "materials",
      public_title: "Материалы покрытия",
    });
  });

  it("optional null поля — null, не undefined", () => {
    const draft = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({
        rows: [
          makeCatalogAssemblyRowDto({
            assembly_item_id: null,
            package_size: null,
            layer_mm: null,
            public_title: null,
          }),
        ],
      }),
    );
    const row = catalogAssemblyDraftToPayload(draft).rows[0];
    expect(row.assembly_item_id).toBeNull();
    expect(row.package_size).toBeNull();
    expect(row.layer_mm).toBeNull();
    expect(row.public_title).toBeNull();
    expect(row.assembly_item_id).not.toBeUndefined();
    expect(row.package_size).not.toBeUndefined();
    expect(row.layer_mm).not.toBeUndefined();
    expect(row.public_title).not.toBeUndefined();
  });

  it("isEnabled roundtrip через payload", () => {
    const draft = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({ rows: [makeCatalogAssemblyRowDto({ is_enabled: false })] }),
    );
    expect(catalogAssemblyDraftToPayload(draft).rows[0].is_enabled).toBe(false);
  });

  it("числовые поля строк roundtrip", () => {
    const draft = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({
        rows: [
          makeCatalogAssemblyRowDto({
            price: "1200" as unknown as number,
            consumption_per_m2: "1,5" as unknown as number,
            package_size: "25" as unknown as number,
            layer_mm: "5" as unknown as number,
          }),
        ],
      }),
    );
    const payload = catalogAssemblyDraftToPayload(draft).rows[0];
    expect(payload.price).toBe(1200);
    expect(payload.consumption_per_m2).toBe(1.5);
    expect(payload.package_size).toBe(25);
    expect(payload.layer_mm).toBe(5);
  });

  it("publicCategory сохраняется", () => {
    const draft = catalogAssemblyDtoToDraft(
      makeCatalogAssemblyDto({
        rows: [makeCatalogAssemblyRowDto({ public_category: "tools", kind: "tool", section: "tool" })],
      }),
    );
    expect(catalogAssemblyDraftToPayload(draft).rows[0].public_category).toBe("tools");
  });
});

describe("assembly row bridging mappers", () => {
  it("assemblyRowsToCatalogAssemblyDraftRows и обратно", () => {
    const coveringRows = catalogAssemblyDraftRowsToAssemblyRows(
      assemblyRowsToCatalogAssemblyDraftRows([
        {
          id: "local-1",
          title: "Клей",
          kind: "consumable",
          formula: "kg_layer_consumption",
          unit: "kg",
          price: 600,
          consumptionPerM2: 1.5,
          packageSize: 25,
          layerMm: 5,
          enabled: true,
        },
      ]),
    );
    expect(coveringRows[0].title).toBe("Клей");
    expect(coveringRows[0].enabled).toBe(true);
    expect(coveringRows[0].packageSize).toBe(25);
  });
});
