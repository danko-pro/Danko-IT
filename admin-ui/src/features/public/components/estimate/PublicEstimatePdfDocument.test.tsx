import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildPublicEstimateResult } from "../../estimate/engine";
import {
  buildFlatDocumentSection,
  buildPublicEstimateDocument,
  type BuildPublicEstimateDocumentInput,
} from "../../estimate/public-estimate-document";
import { calculateFlooring, type FlooringOptions, type FlooringRoomInput } from "../../public-estimate-flooring";
import {
  FLOORING_GOLDEN_TOTAL,
  getFlooringGoldenSnapshotCatalog,
  getFlooringGoldenSnapshotRates,
} from "../../flooring-golden.fixture";
import { calculateDocumentLineTotals } from "../../estimate/public-estimate-document";
import * as flooringSnapshotModule from "../../public-flooring-snapshot";
import {
  createEstimateSection,
  type EstimateLineItem,
  type PublicEstimateResult,
} from "../../public-estimate-model";
import { PublicEstimatePdfDocument } from "./PublicEstimatePdfDocument";

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
    isIncluded: true,
  };
}

function resultFromSection(section: ReturnType<typeof createEstimateSection>): PublicEstimateResult {
  return {
    sections: [section],
    totals: { ...section.totals, pricePerSquareMeter: 0 },
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

function renderPdfDocument(input: BuildPublicEstimateDocumentInput) {
  const document = buildPublicEstimateDocument(input);

  return renderToStaticMarkup(<PublicEstimatePdfDocument document={document} />);
}

describe("PublicEstimatePdfDocument", () => {
  it("renders brand, title, and summary totals from the document", () => {
    const section = createEstimateSection("walls", "Стены", [makeItem("works", "walls", "works", 2, 1000)]);
    const markup = renderPdfDocument(
      buildDocumentInput(resultFromSection(section), {
        floorArea: 20,
        title: "Смета объекта",
        objectMeta: {
          address: "ул. Тестовая, 1",
          complexName: "ЖК Тест",
          apartmentNumber: "12",
          contact: "+7 900 000-00-00",
        },
      }),
    );

    expect(markup).toContain("DANKO BUILTECH");
    expect(markup).toContain("Смета объекта");
    expect(markup).toContain("ЖК Тест");
    expect(markup).toContain("Работы");
    expect(markup).toContain("Материалы");
    expect(markup).toContain("Оборудование");
    expect(markup).toContain("Итого");
    expect(markup).toContain("₽/м²");
    expect(markup).toContain("Стены");
  });

  it("renders flooring presentation groups as works and materials tables", () => {
    installFlooringGoldenSnapshotMocks();

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

    const markup = renderPdfDocument(
      buildDocumentInput(estimateResult, {
        floorArea: 16,
        flooringResult: {
          specificationSection: flooringResult.specificationSection,
          procurementLines: flooringResult.procurementLines,
        },
      }),
    );

    expect(markup).toContain("Работы");
    expect(markup).toContain("Материалы и расходники");
    expect(markup).toContain("Позиция");
    expect(markup).toContain("Сумма");
    expect(markup).not.toContain("CSV");
  });

  it("falls back to flat section lines when presentation groups are absent", () => {
    const section = createEstimateSection("electric", "Электрика", [
      makeItem("electric-works", "electric", "works", 1, 1500),
      makeItem("electric-materials", "electric", "materials", 2, 400),
    ]);
    const documentSection = buildFlatDocumentSection(section);
    const document = buildPublicEstimateDocument(
      buildDocumentInput(resultFromSection(section)),
    );

    expect(documentSection.presentationGroups).toBeUndefined();

    const markup = renderToStaticMarkup(<PublicEstimatePdfDocument document={document} />);

    expect(markup).toContain("Электрика");
    expect(markup).toContain("electric-works");
    expect(markup).toContain("electric-materials");
    expect(markup).not.toContain("Материалы и расходники");
  });

  it("builds markup from buildPublicEstimateDocument rather than hand-written fixtures", () => {
    const section = createEstimateSection("doors", "Двери", [makeItem("door-works", "doors", "works", 3, 700)]);
    const document = buildPublicEstimateDocument(
      buildDocumentInput(resultFromSection(section), { title: "Смета" }),
    );
    const markup = renderToStaticMarkup(<PublicEstimatePdfDocument document={document} />);

    expect(document.meta.title).toBe("Смета");
    expect(markup).toContain("Смета");
    expect(markup).toContain("Двери");
    expect(markup).toContain("door-works");
  });
});

describe("PublicEstimatePdfDocument flooring integration", () => {
  beforeEach(() => {
    installFlooringGoldenSnapshotMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows aggregated flooring groups from the document builder", () => {
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

    expect(flooringSection?.presentationGroups?.map((group) => group.title)).toEqual([
      "Работы",
      "Материалы и расходники",
    ]);

    const markup = renderToStaticMarkup(<PublicEstimatePdfDocument document={document} />);

    expect(markup).toContain("Материалы и расходники");
    expect(markup).not.toMatch(/\.csv|CSV|downloadSpecExportCsv/i);
  });
});

describe("PF6d PDF quantity formatting polish", () => {
  beforeEach(() => {
    installFlooringGoldenSnapshotMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Russian units and rounded quantities without float artifacts", () => {
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
    const markup = renderToStaticMarkup(<PublicEstimatePdfDocument document={document} />);
    const materialsGroup = document.sections
      .find((section) => section.sectionId === "flooring")
      ?.presentationGroups?.find((group) => group.kind === "materials");

    expect(markup).toContain("м²");
    expect(markup).not.toMatch(/>\s*m2\s*</);
    expect(markup).not.toMatch(/999999999/);
    expect(materialsGroup?.lines.some((line) => line.presentationNote?.includes("Исходный расход"))).toBe(
      true,
    );
    materialsGroup?.lines.forEach((line) => {
      if (line.presentationNote) {
        expect(line.presentationNote).not.toMatch(/999999999/);
      }
    });
  });

  it("keeps golden section totals unchanged in the document builder", () => {
    const flooringResult = calculateFlooring([flooringRoom], flooringOptions);

    expect(flooringResult.section.totals.total).toBeCloseTo(FLOORING_GOLDEN_TOTAL, 2);

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
    const materialsGroup = flooringSection?.presentationGroups?.find((group) => group.kind === "materials");

    expect(flooringResult.section.totals.total).toBeCloseTo(FLOORING_GOLDEN_TOTAL, 2);
    expect(materialsGroup?.totals).toEqual(calculateDocumentLineTotals(materialsGroup?.lines ?? []));
  });
});
