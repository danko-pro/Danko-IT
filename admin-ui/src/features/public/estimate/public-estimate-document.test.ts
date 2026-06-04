import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicEstimateResult } from "./engine";
import {
  buildFlatDocumentSection,
  buildPublicEstimateDocument,
  calculateDocumentLineTotals,
  collectDocumentSectionLines,
  documentToEstimateSpecModalData,
  documentToEstimateSpecSections,
  getAggregatedPresentationForSection,
  type BuildPublicEstimateDocumentInput,
} from "./public-estimate-document";
import { mapSectionsForSpec } from "./spec";
import { calculateFlooring, type FlooringOptions, type FlooringRoomInput } from "../public-estimate-flooring";
import type { FlooringProcurementLine } from "../public-estimate-flooring-procurement";
import {
  FLOORING_GOLDEN_SNAPSHOT,
  FLOORING_GOLDEN_TOTAL,
  getFlooringGoldenSnapshotCatalog,
  getFlooringGoldenSnapshotRates,
} from "../flooring-golden.fixture";
import * as flooringSnapshotModule from "../public-flooring-snapshot";
import {
  createEstimateSection,
  type EstimateLineItem,
  type PublicEstimateResult,
} from "../public-estimate-model";
import type { PlumbingCalculationResult, PlumbingOptions } from "../public-estimate-plumbing";

const flooringRoom: FlooringRoomInput = {
  roomId: "room",
  roomName: "Комната",
  area: 16,
  perimeter: 16.8,
  plinthLength: 15.9,
  coveringType: "laminate",
  preparationType: "none",
  layoutType: "straight",
  isIncluded: true,
};

const flooringOptions: FlooringOptions = {
  includePlinth: true,
  plinthType: "duropolymer",
  includeThresholds: false,
  thresholdCount: 0,
  includeDemolition: false,
};

function installFlooringGoldenSnapshotMocks() {
  vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotRates").mockReturnValue(
    getFlooringGoldenSnapshotRates(),
  );
  vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue(
    getFlooringGoldenSnapshotCatalog(),
  );
}

function makeItem(
  id: string,
  sectionId: EstimateLineItem["sectionId"],
  category: EstimateLineItem["category"],
  quantity: number,
  unitPrice: number,
  isIncluded = true,
): EstimateLineItem {
  return {
    id,
    sectionId,
    title: id,
    category,
    quantity,
    unit: "шт.",
    unitPrice,
    total: quantity * unitPrice,
    isIncluded,
  };
}

function defaultPlumbingOptions(): PlumbingOptions {
  return {
    includeBathroomSet: true,
    includeBath: true,
    includeHygienicShower: true,
    includeElectricTowelRail: false,
    includeKitchenSink: true,
    kitchenSinkPackageLevel: "b",
    includeDishwasherOutput: true,
    dishwasherPackageLevel: "b",
    includeShowerZone: false,
    showerPackageLevel: "b",
    includeInstallRelocation: false,
    includeWasherOutput: true,
    includeWaterNode: true,
    includeLeakProtection: false,
  };
}

function emptyPlumbingResult(): PlumbingCalculationResult {
  return {
    bathroomCount: 0,
    hasKitchen: false,
    hasPlumbingRooms: false,
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    fixtureCount: 0,
    worksTotal: 0,
    materialsTotal: 0,
    equipmentTotal: 0,
    consumablesTotal: 0,
    total: 0,
    section: createEstimateSection("plumbing", "Сантехника", []),
  };
}

function buildDocumentInput(
  result: PublicEstimateResult,
  overrides: Partial<BuildPublicEstimateDocumentInput["context"]> = {},
): BuildPublicEstimateDocumentInput {
  return {
    result,
    context: {
      floorArea: 40,
      ...overrides,
    },
  };
}

describe("buildFlatDocumentSection", () => {
  it("maps a flat estimate section to a document section with lines", () => {
    const section = createEstimateSection("walls", "Стены", [
      makeItem("wall-works", "walls", "works", 10, 100),
      makeItem("wall-materials", "walls", "materials", 2, 500),
    ]);

    const documentSection = buildFlatDocumentSection(section);

    expect(documentSection.sectionId).toBe("walls");
    expect(documentSection.title).toBe("Стены");
    expect(documentSection.flatLines).toHaveLength(2);
    expect(documentSection.flatLines?.[0]?.id).toBe("wall-works");
    expect(documentSection.groups).toHaveLength(1);
    expect(documentSection.groups[0]?.scopeLabel).toBe("Стены");
  });
});

describe("buildPublicEstimateDocument", () => {
  it("excludes non-included lines from section and document totals", () => {
    const section = createEstimateSection("electric", "Электрика", [
      makeItem("included", "electric", "works", 1, 1000, true),
      makeItem("excluded", "electric", "materials", 1, 9000, false),
    ]);
    const document = buildPublicEstimateDocument(
      buildDocumentInput({ sections: [section], totals: section.totals }),
    );

    expect(document.sections[0]?.totals.total).toBe(1000);
    expect(document.sections[0]?.totals.materials).toBe(0);
    expect(document.totals.total).toBe(1000);
    expect(document.sections[0]?.flatLines?.find((line) => line.id === "excluded")?.isIncluded).toBe(false);
  });

  it("aggregates category totals from included lines", () => {
    const section = createEstimateSection("completion", "Отделка", [
      makeItem("works", "completion", "works", 2, 1000),
      makeItem("materials", "completion", "materials", 3, 200),
      makeItem("equipment", "completion", "equipment", 1, 500),
      makeItem("consumables", "completion", "consumables", 4, 25),
    ]);
    const document = buildPublicEstimateDocument(
      buildDocumentInput({ sections: [section], totals: section.totals }),
    );

    expect(document.sections[0]?.totals.works).toBe(2000);
    expect(document.sections[0]?.totals.materials).toBe(600);
    expect(document.sections[0]?.totals.equipment).toBe(500);
    expect(document.sections[0]?.totals.consumables).toBe(100);
    expect(document.sections[0]?.totals.total).toBe(3200);
  });

  it("sets pricePerSquareMeter from floorArea", () => {
    const section = createEstimateSection("walls", "Стены", [makeItem("works", "walls", "works", 1, 8000)]);
    const document = buildPublicEstimateDocument(
      buildDocumentInput({ sections: [section], totals: section.totals }, { floorArea: 50 }),
    );

    expect(document.totals.pricePerSquareMeter).toBeCloseTo(160, 6);
    expect(document.meta.floorArea).toBe(50);
  });

  it("applies default brand and metadata fields", () => {
    const section = createEstimateSection("doors", "Двери", []);
    const document = buildPublicEstimateDocument(
      buildDocumentInput({ sections: [section], totals: section.totals }, {
        objectMeta: {
          address: "ул. Тестовая, 1",
          complexName: "ЖК Тест",
          apartmentNumber: "12",
          contact: "+7 900 000-00-00",
        },
        title: "Смета объекта",
        estimateId: "est-42",
      }),
    );

    expect(document.meta.title).toBe("Смета объекта");
    expect(document.meta.estimateId).toBe("est-42");
    expect(document.meta.object?.complexName).toBe("ЖК Тест");
    expect(document.meta.brand).toEqual({
      name: "DANKO BUILTECH",
      logoUrl: "/brand/danko-logo-mark.png",
    });
    expect(document.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("document total equals sum of section totals", () => {
    const sectionOne = createEstimateSection("walls", "Стены", [makeItem("a", "walls", "works", 1, 1000)]);
    const sectionTwo = createEstimateSection("ceiling", "Потолки", [makeItem("b", "ceiling", "materials", 2, 500)]);
    const document = buildPublicEstimateDocument(
      buildDocumentInput({
        sections: [sectionOne, sectionTwo],
        totals: { works: 1000, materials: 1000, equipment: 0, consumables: 0, total: 2000, pricePerSquareMeter: 0 },
      }),
    );

    const sectionSum = document.sections.reduce((sum, section) => sum + section.totals.total, 0);

    expect(document.totals.total).toBe(sectionSum);
    expect(document.totals.total).toBe(2000);
  });

  it("does not mutate input result or context", () => {
    const section = createEstimateSection("home_goods", "Товары", [
      makeItem("item", "home_goods", "works", 1, 100),
    ]);
    const result = { sections: [section], totals: section.totals };
    const input = buildDocumentInput(result, { floorArea: 10 });

    const resultBefore = JSON.stringify(result);
    const contextBefore = JSON.stringify(input.context);

    buildPublicEstimateDocument(input);

    expect(JSON.stringify(result)).toBe(resultBefore);
    expect(JSON.stringify(input.context)).toBe(contextBefore);
  });
});

describe("buildPublicEstimateDocument flooring", () => {
  beforeEach(() => {
    installFlooringGoldenSnapshotMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses specificationSection items as flooring document lines", () => {
    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);
    const estimateResult = buildPublicEstimateResult({
      warmFloorResult: { selectedArea: 0, section: createEstimateSection("warm_floor", "Тёплый пол", []) },
      flooringResult: { flooringArea: flooringResult.flooringArea, section: flooringResult.section },
      wallsResult: { wallFinishArea: 0, section: createEstimateSection("walls", "Стены", []) },
      ceilingResult: { ceilingArea: 0, section: createEstimateSection("ceiling", "Потолки", []) },
      electricResult: { section: createEstimateSection("electric", "Электрика", []) },
      plumbingResult: { section: createEstimateSection("plumbing", "Сантехника", []) },
      doorsResult: { section: createEstimateSection("doors", "Двери", []) },
      completionResult: { section: createEstimateSection("completion", "Отделка", []) },
      appliancesResult: { section: createEstimateSection("appliances", "Техника", []) },
      looseFurnitureResult: { section: createEstimateSection("loose_furniture", "Мебель", []) },
      homeGoodsResult: { section: createEstimateSection("home_goods", "Товары", []) },
      floorArea: 16,
    });

    const document = buildPublicEstimateDocument(
      buildDocumentInput(estimateResult, {
        floorArea: 16,
        flooringResult: {
          specificationSection: flooringResult.specificationSection,
          procurementLines: flooringResult.procurementLines,
        },
      }),
    );

    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");

    expect(flooringSection).toBeDefined();
    expect(flooringSection?.title).toBe(flooringResult.specificationSection.title);
    expect(flooringSection?.flatLines?.map((line) => line.id)).toEqual(
      flooringResult.specificationSection.items.map((item) => item.id),
    );

    const lineTotals = calculateDocumentLineTotals(flooringSection?.flatLines ?? []);
    expect(flooringSection?.totals).toEqual(lineTotals);
    expect(flooringResult.total).toBeCloseTo(FLOORING_GOLDEN_TOTAL, 2);
  });

  it("passes procurement lines to appendices when present", () => {
    const laminate = FLOORING_GOLDEN_SNAPSHOT.coverings.find((item) => item.code === "laminate")!;

    vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue({
      coverings: {
        ...getFlooringGoldenSnapshotCatalog().coverings,
        laminate: {
          ...laminate,
          specLines: [
            {
              code: "laminate-board",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: laminate.materialPricePerM2,
            },
          ],
        },
      },
      preparations: getFlooringGoldenSnapshotCatalog().preparations,
      layouts: getFlooringGoldenSnapshotCatalog().layouts,
    });

    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);
    const estimateResult = buildPublicEstimateResult({
      warmFloorResult: { selectedArea: 0, section: createEstimateSection("warm_floor", "Тёплый пол", []) },
      flooringResult: { flooringArea: flooringResult.flooringArea, section: flooringResult.section },
      wallsResult: { wallFinishArea: 0, section: createEstimateSection("walls", "Стены", []) },
      ceilingResult: { ceilingArea: 0, section: createEstimateSection("ceiling", "Потолки", []) },
      electricResult: { section: createEstimateSection("electric", "Электрика", []) },
      plumbingResult: { section: createEstimateSection("plumbing", "Сантехника", []) },
      doorsResult: { section: createEstimateSection("doors", "Двери", []) },
      completionResult: { section: createEstimateSection("completion", "Отделка", []) },
      appliancesResult: { section: createEstimateSection("appliances", "Техника", []) },
      looseFurnitureResult: { section: createEstimateSection("loose_furniture", "Мебель", []) },
      homeGoodsResult: { section: createEstimateSection("home_goods", "Товары", []) },
      floorArea: 16,
    });

    const document = buildPublicEstimateDocument(
      buildDocumentInput(estimateResult, {
        floorArea: 16,
        flooringResult: {
          specificationSection: flooringResult.specificationSection,
          procurementLines: flooringResult.procurementLines,
        },
      }),
    );

    expect(flooringResult.procurementLines.length).toBeGreaterThan(0);
    expect(document.appendices?.procurement).toEqual(flooringResult.procurementLines);
  });

  function buildGoldenFlooringDocument(procurementLines?: FlooringProcurementLine[]) {
    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);
    const estimateResult = buildPublicEstimateResult({
      warmFloorResult: { selectedArea: 0, section: createEstimateSection("warm_floor", "Тёплый пол", []) },
      flooringResult: { flooringArea: flooringResult.flooringArea, section: flooringResult.section },
      wallsResult: { wallFinishArea: 0, section: createEstimateSection("walls", "Стены", []) },
      ceilingResult: { ceilingArea: 0, section: createEstimateSection("ceiling", "Потолки", []) },
      electricResult: { section: createEstimateSection("electric", "Электрика", []) },
      plumbingResult: { section: createEstimateSection("plumbing", "Сантехника", []) },
      doorsResult: { section: createEstimateSection("doors", "Двери", []) },
      completionResult: { section: createEstimateSection("completion", "Отделка", []) },
      appliancesResult: { section: createEstimateSection("appliances", "Техника", []) },
      looseFurnitureResult: { section: createEstimateSection("loose_furniture", "Мебель", []) },
      homeGoodsResult: { section: createEstimateSection("home_goods", "Товары", []) },
      floorArea: 16,
    });

    return {
      flooringResult,
      document: buildPublicEstimateDocument(
        buildDocumentInput(estimateResult, {
          floorArea: 16,
          flooringResult: {
            specificationSection: flooringResult.specificationSection,
            procurementLines: procurementLines ?? flooringResult.procurementLines,
          },
        }),
      ),
    };
  }

  it("attaches presentationGroups to flooring section", () => {
    const { document } = buildGoldenFlooringDocument();
    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");

    expect(flooringSection?.presentationGroups).toHaveLength(2);
    expect(flooringSection?.presentationGroups?.map((group) => group.title)).toEqual([
      "Работы",
      "Материалы и расходники",
    ]);
  });

  it("includes works presentation group with aggregated lines", () => {
    const { document } = buildGoldenFlooringDocument();
    const worksGroup = document.sections
      .find((section) => section.sectionId === "flooring")
      ?.presentationGroups?.find((group) => group.kind === "works");

    expect(worksGroup).toBeDefined();
    expect(worksGroup?.title).toBe("Работы");
    expect(worksGroup!.lines.length).toBeGreaterThan(0);
    expect(worksGroup!.lines.every((line) => line.category === "works")).toBe(true);
  });

  it("includes materials presentation group", () => {
    const { document } = buildGoldenFlooringDocument();
    const materialsGroup = document.sections
      .find((section) => section.sectionId === "flooring")
      ?.presentationGroups?.find((group) => group.kind === "materials");

    expect(materialsGroup).toBeDefined();
    expect(materialsGroup?.title).toBe("Материалы и расходники");
    expect(materialsGroup!.lines.length).toBeGreaterThan(0);
  });

  it("builds materials group from procurement when present", () => {
    const laminate = FLOORING_GOLDEN_SNAPSHOT.coverings.find((item) => item.code === "laminate")!;

    vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue({
      coverings: {
        ...getFlooringGoldenSnapshotCatalog().coverings,
        laminate: {
          ...laminate,
          specLines: [
            {
              code: "laminate-board",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: laminate.materialPricePerM2,
              aggregationKey: "laminate-board",
            },
          ],
        },
      },
      preparations: getFlooringGoldenSnapshotCatalog().preparations,
      layouts: getFlooringGoldenSnapshotCatalog().layouts,
    });

    const { flooringResult, document } = buildGoldenFlooringDocument();

    expect(flooringResult.procurementLines.length).toBeGreaterThan(0);

    const materialsGroup = document.sections
      .find((section) => section.sectionId === "flooring")
      ?.presentationGroups?.find((group) => group.kind === "materials");

    expect(materialsGroup!.lines.some((line) => line.sources?.some((source) => source.procurementCode))).toBe(
      true,
    );
  });

  it("falls back to document material aggregation when procurement is empty", () => {
    const { document } = buildGoldenFlooringDocument([]);

    expect(document.appendices?.procurement).toBeUndefined();

    const materialsGroup = document.sections
      .find((section) => section.sectionId === "flooring")
      ?.presentationGroups?.find((group) => group.kind === "materials");

    expect(materialsGroup).toBeDefined();
    expect(materialsGroup!.lines.length).toBeGreaterThan(0);
    expect(
      materialsGroup!.lines.some((line) => line.sources?.some((source) => source.lineId !== undefined)),
    ).toBe(true);
  });

  it("sets presentation group totals from aggregated lines", () => {
    const { document } = buildGoldenFlooringDocument();
    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");

    for (const group of flooringSection?.presentationGroups ?? []) {
      expect(group.totals).toEqual(calculateDocumentLineTotals(group.lines));
    }
  });

  it("does not attach presentationGroups to non-flooring sections", () => {
    const { document } = buildGoldenFlooringDocument();

    for (const section of document.sections) {
      if (section.sectionId !== "flooring") {
        expect(section.presentationGroups).toBeUndefined();
      }
    }
  });

  it("does not mutate input when attaching presentationGroups", () => {
    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);
    const estimateResult = buildPublicEstimateResult({
      warmFloorResult: { selectedArea: 0, section: createEstimateSection("warm_floor", "Тёплый пол", []) },
      flooringResult: { flooringArea: flooringResult.flooringArea, section: flooringResult.section },
      wallsResult: { wallFinishArea: 0, section: createEstimateSection("walls", "Стены", []) },
      ceilingResult: { ceilingArea: 0, section: createEstimateSection("ceiling", "Потолки", []) },
      electricResult: { section: createEstimateSection("electric", "Электрика", []) },
      plumbingResult: { section: createEstimateSection("plumbing", "Сантехника", []) },
      doorsResult: { section: createEstimateSection("doors", "Двери", []) },
      completionResult: { section: createEstimateSection("completion", "Отделка", []) },
      appliancesResult: { section: createEstimateSection("appliances", "Техника", []) },
      looseFurnitureResult: { section: createEstimateSection("loose_furniture", "Мебель", []) },
      homeGoodsResult: { section: createEstimateSection("home_goods", "Товары", []) },
      floorArea: 16,
    });
    const input = buildDocumentInput(estimateResult, {
      floorArea: 16,
      flooringResult: {
        specificationSection: flooringResult.specificationSection,
        procurementLines: flooringResult.procurementLines,
      },
    });

    const resultBefore = JSON.stringify(estimateResult);
    const contextBefore = JSON.stringify(input.context);

    const document = buildPublicEstimateDocument(input);
    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");
    const presentation = getAggregatedPresentationForSection(document, "flooring");

    expect(JSON.stringify(estimateResult)).toBe(resultBefore);
    expect(JSON.stringify(input.context)).toBe(contextBefore);
    expect(presentation).toBeDefined();
    expect(collectDocumentSectionLines(flooringSection!).map((line) => line.id)).toEqual(
      flooringResult.specificationSection.items.map((item) => item.id),
    );
  });
});

describe("documentToEstimateSpecModalData", () => {
  it("matches mapSectionsForSpec sections with legacy totals for full modal", () => {
    const wallsSection = createEstimateSection("walls", "Стены", [
      makeItem("wall-works", "walls", "works", 10, 100),
    ]);
    const plumbingSection = createEstimateSection("plumbing", "Сантехника", []);
    const estimateResult = { sections: [wallsSection, plumbingSection], totals: wallsSection.totals };

    const document = buildPublicEstimateDocument(
      buildDocumentInput(estimateResult, {
        plumbingOptions: defaultPlumbingOptions(),
        plumbingResult: emptyPlumbingResult(),
        modalState: { kind: "full" },
      }),
    );

    const legacyModal = mapSectionsForSpec(
      estimateResult.sections,
      defaultPlumbingOptions(),
      emptyPlumbingResult(),
      { specificationSection: createEstimateSection("flooring", "Полы", []) },
    );
    const adapted = documentToEstimateSpecSections(document, estimateResult.sections);

    expect(adapted).toEqual(legacyModal);
    expect(
      documentToEstimateSpecModalData(document, {
        subtitle: "Все разделы текущей сметы по позициям",
        legacySections: estimateResult.sections,
        includeProcurement: true,
      }),
    ).toMatchObject({
      title: "Полная спецификация",
      subtitle: "Все разделы текущей сметы по позициям",
      sections: legacyModal,
    });
  });

  it("preserves legacy section totals when document line totals differ", () => {
    const flatSection = createEstimateSection("flooring", "Полы", [
      makeItem("flooring-material-room", "flooring", "materials", 1, 100, true),
    ]);
    const specSection = createEstimateSection("flooring", "Полы", [
      makeItem("flooring-spec-line", "flooring", "materials", 16, 930, true),
    ]);
    const document = buildPublicEstimateDocument(
      buildDocumentInput({ sections: [flatSection], totals: flatSection.totals }, {
        flooringResult: { specificationSection: specSection, procurementLines: [] },
        modalState: { kind: "section", sectionId: "flooring" },
      }),
    );

    const [adapted] = documentToEstimateSpecSections(document, [flatSection]);

    expect(adapted?.items[0]?.id).toBe("flooring-spec-line");
    expect(adapted?.totals.total).toBe(flatSection.totals.total);
    expect(adapted?.totals.total).not.toBe(specSection.totals.total);
  });
});

describe("buildPublicEstimateDocument plumbing", () => {
  it("builds plumbing from flat section without breaking empty plumbing", () => {
    const plumbingSection = createEstimateSection("plumbing", "Сантехника", []);
    const document = buildPublicEstimateDocument(
      buildDocumentInput(
        { sections: [plumbingSection], totals: plumbingSection.totals },
        {
          plumbingOptions: defaultPlumbingOptions(),
          plumbingResult: emptyPlumbingResult(),
        },
      ),
    );

    expect(document.sections[0]?.sectionId).toBe("plumbing");
    expect(document.sections[0]?.flatLines).toEqual([]);
    expect(document.sections[0]?.totals.total).toBe(0);
  });
});
