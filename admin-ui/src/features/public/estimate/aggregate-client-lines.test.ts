import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aggregateMaterialLinesFromDocumentLines,
  aggregateWorkLines,
  buildAggregatedClientPresentation,
  formatAggregatedLinePresentation,
  formatDisplayUnit,
  materialLinesFromProcurement,
  stripRoomSuffix,
  type AggregatedClientLine,
} from "./aggregate-client-lines";
import {
  buildPublicEstimateDocument,
  calculateDocumentLineTotals,
  collectDocumentSectionLines,
  getAggregatedPresentationForSection,
  type EstimateDocumentLine,
} from "./public-estimate-document";
import { buildPublicEstimateResult } from "./engine";
import { calculateFlooring, type FlooringOptions, type FlooringRoomInput } from "../public-estimate-flooring";
import {
  FLOORING_GOLDEN_TOTAL,
  getFlooringGoldenSnapshotCatalog,
  getFlooringGoldenSnapshotRates,
} from "../flooring-golden.fixture";
import * as flooringSnapshotModule from "../public-flooring-snapshot";
import { createEstimateSection } from "../public-estimate-model";
import type { FlooringProcurementLine } from "../public-estimate-flooring-procurement";

function installFlooringGoldenSnapshotMocks() {
  vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotRates").mockReturnValue(
    getFlooringGoldenSnapshotRates(),
  );
  vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue(
    getFlooringGoldenSnapshotCatalog(),
  );
}

function documentLine(overrides: Partial<EstimateDocumentLine> & Pick<EstimateDocumentLine, "id" | "title" | "category">): EstimateDocumentLine {
  const quantity = overrides.quantity ?? 1;
  const unitPrice = overrides.unitPrice ?? 100;

  return {
    quantity,
    unit: overrides.unit ?? "m2",
    unitPrice,
    total: overrides.total ?? quantity * unitPrice,
    isIncluded: overrides.isIncluded ?? true,
    ...overrides,
  };
}

function cloneLines(lines: EstimateDocumentLine[]) {
  return structuredClone(lines);
}

describe("stripRoomSuffix", () => {
  it("removes room suffix from spec titles", () => {
    expect(stripRoomSuffix("Укладка ламината — Комната")).toBe("Укладка ламината");
    expect(stripRoomSuffix("Плинтус")).toBe("Плинтус");
  });
});

describe("aggregateWorkLines", () => {
  it("merges same works across rooms by normalized title, unit, unitPrice, and category", () => {
    const lines = [
      documentLine({
        id: "work-a-room-1",
        title: "Укладка — Комната 1",
        category: "works",
        quantity: 10,
        unitPrice: 500,
        roomName: "Комната 1",
      }),
      documentLine({
        id: "work-a-room-2",
        title: "Укладка — Комната 2",
        category: "works",
        quantity: 12,
        unitPrice: 500,
        roomName: "Комната 2",
      }),
      documentLine({
        id: "plinth-labor",
        title: "Монтаж плинтуса",
        category: "works",
        quantity: 4,
        unit: "m",
        unitPrice: 200,
      }),
    ];

    const aggregated = aggregateWorkLines(lines);

    expect(aggregated).toHaveLength(2);
    const merged = aggregated.find((line) => line.title === "Укладка");
    expect(merged?.quantity).toBe(22);
    expect(merged?.sources).toHaveLength(2);
    expect(merged?.total).toBe(calculateDocumentLineTotals([merged!]).total);
  });

  it("does not merge works with different unitPrice", () => {
    const lines = [
      documentLine({
        id: "work-low",
        title: "Подготовка — Комната",
        category: "works",
        quantity: 5,
        unitPrice: 100,
      }),
      documentLine({
        id: "work-high",
        title: "Подготовка — Комната 2",
        category: "works",
        quantity: 5,
        unitPrice: 150,
      }),
    ];

    expect(aggregateWorkLines(lines)).toHaveLength(2);
  });

  it("ignores excluded lines", () => {
    const lines = [
      documentLine({
        id: "included",
        title: "Работа — Комната",
        category: "works",
        quantity: 3,
        unitPrice: 100,
        isIncluded: true,
      }),
      documentLine({
        id: "excluded",
        title: "Работа — Комната 2",
        category: "works",
        quantity: 9,
        unitPrice: 100,
        isIncluded: false,
      }),
    ];

    const aggregated = aggregateWorkLines(lines);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]?.quantity).toBe(3);
  });
});

describe("formatDisplayUnit", () => {
  it("normalizes common unit codes for display", () => {
    expect(formatDisplayUnit("kg")).toBe("кг");
    expect(formatDisplayUnit("l")).toBe("л");
    expect(formatDisplayUnit("pcs")).toBe("шт");
    expect(formatDisplayUnit("m2")).toBe("м²");
    expect(formatDisplayUnit("m")).toBe("м");
    expect(formatDisplayUnit("package")).toBe("уп.");
  });
});

describe("PF5c4 aggregated material presentation", () => {
  it("shows package purchase qty, unit, and package price in display fields", () => {
    const procurement: FlooringProcurementLine[] = [
      {
        aggregationKey: "glue",
        code: "glue",
        title: "Клей плиточный",
        category: "consumables",
        rawQuantity: 143,
        rawUnit: "kg",
        purchaseMode: "package",
        purchaseQuantity: 6,
        purchaseUnit: "kg",
        unitPrice: 20,
        packageSize: 25,
        packagePrice: 500,
        total: 3000,
      },
    ];

    const [line] = materialLinesFromProcurement(procurement);

    expect(line?.quantity).toBe(6);
    expect(line?.unitPrice).toBe(500);
    expect(line?.total).toBe(3000);
    expect(line?.displayQuantity).toBe(6);
    expect(line?.displayUnit).toBe("кг");
    expect(line?.displayUnitPrice).toBe(500);
    expect(line?.presentationNote).toContain("143");
    expect(line?.presentationNote).toContain("кг");
    expect(formatAggregatedLinePresentation(line!)).toEqual(line);
  });

  it("keeps linear raw presentation when package metadata is absent", () => {
    const procurement: FlooringProcurementLine[] = [
      {
        aggregationKey: "primer",
        code: "primer",
        title: "Грунт",
        category: "consumables",
        rawQuantity: 143,
        rawUnit: "kg",
        purchaseMode: "raw",
        purchaseQuantity: 143,
        purchaseUnit: "kg",
        unitPrice: 45,
        total: 6435,
      },
    ];

    const [line] = materialLinesFromProcurement(procurement);

    expect(line?.displayQuantity).toBe(143);
    expect(line?.displayUnit).toBe("кг");
    expect(line?.displayUnitPrice).toBe(45);
    expect(line?.presentationNote).toBeUndefined();
  });

  it("merges duplicate tool lines with same title, unit, unitPrice, and category", () => {
    const toolLine = (aggregationKey: string, rawQuantity: number): FlooringProcurementLine => ({
      aggregationKey,
      code: aggregationKey,
      title: "Инструмент и мелкий расходник",
      category: "tools",
      rawQuantity,
      rawUnit: "m2",
      purchaseMode: "raw",
      purchaseQuantity: rawQuantity,
      purchaseUnit: "m2",
      unitPrice: 40,
      total: rawQuantity * 40,
    });

    const lines = materialLinesFromProcurement([
      toolLine("covering_tools", 16),
      toolLine("preparation_tools", 12),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.title).toBe("Инструмент и мелкий расходник");
    expect(lines[0]?.quantity).toBe(28);
    expect(lines[0]?.displayUnit).toBe("м²");
    expect(lines[0]?.total).toBe(28 * 40);
    expect(lines[0]?.sources).toHaveLength(2);
  });

  it("does not merge material lines with different unitPrice", () => {
    const lines = materialLinesFromProcurement([
      {
        aggregationKey: "tool-a",
        code: "tool-a",
        title: "Инструмент и мелкий расходник",
        category: "tools",
        rawQuantity: 10,
        rawUnit: "m2",
        purchaseMode: "raw",
        purchaseQuantity: 10,
        purchaseUnit: "m2",
        unitPrice: 40,
        total: 400,
      },
      {
        aggregationKey: "tool-b",
        code: "tool-b",
        title: "Инструмент и мелкий расходник",
        category: "tools",
        rawQuantity: 10,
        rawUnit: "m2",
        purchaseMode: "raw",
        purchaseQuantity: 10,
        purchaseUnit: "m2",
        unitPrice: 80,
        total: 800,
      },
    ]);

    expect(lines).toHaveLength(2);
  });
});

describe("materialLinesFromProcurement", () => {
  const procurementBase: FlooringProcurementLine = {
    aggregationKey: "laminate-board",
    code: "laminate-board",
    title: "Ламинат",
    category: "materials",
    rawQuantity: 18.4,
    rawUnit: "m2",
    purchaseMode: "raw",
    purchaseQuantity: 18.4,
    purchaseUnit: "m2",
    unitPrice: 930,
    total: 18.4 * 930,
  };

  it("builds materials block from procurement rows", () => {
    const lines = materialLinesFromProcurement([procurementBase]);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.title).toBe("Ламинат");
    expect(lines[0]?.category).toBe("materials");
    expect(lines[0]?.quantity).toBe(18.4);
    expect(lines[0]?.total).toBe(procurementBase.total);
  });

  it("maps tools and consumables into estimate material categories", () => {
    const procurement: FlooringProcurementLine[] = [
      procurementBase,
      {
        ...procurementBase,
        aggregationKey: "glue",
        code: "glue",
        title: "Клей",
        category: "consumables",
        purchaseQuantity: 2,
        purchaseUnit: "уп.",
        total: 1000,
      },
      {
        ...procurementBase,
        aggregationKey: "tools-kit",
        code: "tools-kit",
        title: "Инструмент",
        category: "tools",
        purchaseQuantity: 1,
        purchaseUnit: "компл.",
        total: 400,
      },
    ];

    const lines = materialLinesFromProcurement(procurement);

    expect(lines.map((line) => line.category)).toEqual(["materials", "consumables", "consumables"]);
  });

  it("appends global material lines not covered by procurement", () => {
    const globals = [
      documentLine({
        id: "flooring-plinth-material",
        title: "Плинтус",
        category: "materials",
        quantity: 10,
        unit: "m",
        unitPrice: 120,
      }),
    ];

    const lines = materialLinesFromProcurement([procurementBase], globals);

    expect(lines.some((line) => line.id === "flooring-plinth-material")).toBe(true);
  });
});

describe("aggregateMaterialLinesFromDocumentLines", () => {
  it("aggregates material and consumable document lines without room soup", () => {
    const lines = [
      documentLine({
        id: "mat-1",
        title: "Ламинат — Комната 1",
        category: "materials",
        quantity: 8,
        unitPrice: 930,
      }),
      documentLine({
        id: "mat-2",
        title: "Ламинат — Комната 2",
        category: "materials",
        quantity: 8,
        unitPrice: 930,
      }),
    ];

    const aggregated = aggregateMaterialLinesFromDocumentLines(lines);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]?.title).toBe("Ламинат");
    expect(aggregated[0]?.quantity).toBe(16);
  });
});

describe("buildAggregatedClientPresentation", () => {
  it("computes totals from aggregated lines via calculateDocumentLineTotals", () => {
    const presentation = buildAggregatedClientPresentation({
      lines: [
        documentLine({
          id: "work-1",
          title: "Монтаж — A",
          category: "works",
          quantity: 2,
          unitPrice: 1000,
        }),
        documentLine({
          id: "mat-1",
          title: "Плитка — A",
          category: "materials",
          quantity: 3,
          unitPrice: 500,
        }),
      ],
    });

    expect(presentation.workTotals).toEqual(calculateDocumentLineTotals(presentation.workLines));
    expect(presentation.materialTotals).toEqual(calculateDocumentLineTotals(presentation.materialLines));
    expect(presentation.presentationGroups).toHaveLength(2);
  });

  it("does not mutate input lines", () => {
    const lines = cloneLines([
      documentLine({
        id: "work-1",
        title: "Монтаж — A",
        category: "works",
        quantity: 2,
        unitPrice: 1000,
      }),
    ]);
    const before = JSON.stringify(lines);

    buildAggregatedClientPresentation({ lines });

    expect(JSON.stringify(lines)).toBe(before);
  });

  it("prefers procurement for materials when provided", () => {
    const procurement: FlooringProcurementLine[] = [
      {
        aggregationKey: "board",
        code: "board",
        title: "Ламинат закупка",
        category: "materials",
        rawQuantity: 10,
        rawUnit: "m2",
        purchaseMode: "raw",
        purchaseQuantity: 10,
        purchaseUnit: "m2",
        unitPrice: 900,
        total: 9000,
      },
    ];

    const presentation = buildAggregatedClientPresentation({
      lines: [
        documentLine({
          id: "room-mat",
          title: "Ламинат — Комната",
          category: "materials",
          quantity: 10,
          unitPrice: 930,
        }),
      ],
      procurement,
    });

    expect(presentation.materialLines).toHaveLength(1);
    expect(presentation.materialLines[0]?.title).toBe("Ламинат закупка");
    expect(presentation.materialLines[0]?.total).toBe(9000);
  });
});

describe("getAggregatedPresentationForSection (shadow)", () => {
  const flooringOptions: FlooringOptions = {
    includePlinth: true,
    plinthType: "duropolymer",
    includeThresholds: false,
    thresholdCount: 0,
    includeDemolition: false,
  };

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

  const secondRoom: FlooringRoomInput = {
    ...flooringRoom,
    roomId: "room-2",
    roomName: "Спальня",
    area: 12,
    perimeter: 14,
    plinthLength: 13,
  };

  beforeEach(() => {
    installFlooringGoldenSnapshotMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates golden flooring works across rooms", () => {
    const flooringResult = calculateFlooring([flooringRoom, secondRoom], flooringOptions);
    const document = buildPublicEstimateDocument({
      result: buildPublicEstimateResult({
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
        floorArea: 28,
      }),
      context: {
        floorArea: 28,
        flooringResult: {
          specificationSection: flooringResult.specificationSection,
          procurementLines: flooringResult.procurementLines,
        },
      },
    });

    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");
    const flatWorks = (flooringSection?.flatLines ?? []).filter((line) => line.category === "works");
    const presentation = getAggregatedPresentationForSection(document, "flooring");

    expect(presentation).toBeDefined();
    expect(presentation!.workLines.length).toBeLessThan(flatWorks.length);
    expect(presentation!.materialLines.length).toBeGreaterThan(0);
  });

  it("returns undefined for non-flooring sections", () => {
    const wallsSection = createEstimateSection("walls", "Стены", []);
    const document = buildPublicEstimateDocument({
      result: { sections: [wallsSection], totals: wallsSection.totals },
      context: { floorArea: 40 },
    });

    expect(getAggregatedPresentationForSection(document, "walls")).toBeUndefined();
    expect(getAggregatedPresentationForSection(document, "flooring")).toBeUndefined();
  });

  it("does not change document section lines used by modal adapter", () => {
    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);
    const document = buildPublicEstimateDocument({
      result: buildPublicEstimateResult({
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
      }),
      context: {
        floorArea: 16,
        flooringResult: {
          specificationSection: flooringResult.specificationSection,
          procurementLines: flooringResult.procurementLines,
        },
      },
    });

    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");
    const linesBefore = JSON.stringify(collectDocumentSectionLines(flooringSection!));

    getAggregatedPresentationForSection(document, "flooring");

    expect(JSON.stringify(collectDocumentSectionLines(flooringSection!))).toBe(linesBefore);
    expect(document.sections.find((section) => section.sectionId === "flooring")?.flatLines).toEqual(
      flooringSection?.flatLines,
    );
  });

  it("keeps golden section totals unchanged after presentation polish", () => {
    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);
    const document = buildPublicEstimateDocument({
      result: buildPublicEstimateResult({
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
      }),
      context: {
        floorArea: 16,
        flooringResult: {
          specificationSection: flooringResult.specificationSection,
          procurementLines: flooringResult.procurementLines,
        },
      },
    });

    const flooringSection = document.sections.find((section) => section.sectionId === "flooring");
    const materialsGroup = flooringSection?.presentationGroups?.find((group) => group.kind === "materials");

    expect(flooringResult.section.totals.total).toBeCloseTo(FLOORING_GOLDEN_TOTAL, 2);

    expect(materialsGroup?.lines.every((line) => (line.displayQuantity ?? line.quantity) > 0)).toBe(true);
    expect(materialsGroup?.totals).toEqual(calculateDocumentLineTotals(materialsGroup?.lines ?? []));
  });
});
