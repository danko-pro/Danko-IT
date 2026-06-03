import { describe, expect, it } from "vitest";
import { calculateSectionTotals, createEstimateSection, type EstimateCostCategory } from "./public-estimate-model";
import {
  buildFlooringSpecification,
  calculateSpecificationSectionItemTotals,
  expandFlooringSectionForSpec,
  type FlooringRoomForSpecification,
} from "./public-estimate-flooring-spec";

function expectCategoryTotalsNear(
  actual: Record<EstimateCostCategory | "total", number>,
  expected: Record<EstimateCostCategory | "total", number>,
) {
  for (const key of ["works", "materials", "equipment", "consumables", "total"] as const) {
    expect(actual[key]).toBeCloseTo(expected[key], 2);
  }
}

function flatItemTotalsForPrefixes(
  section: ReturnType<typeof createEstimateSection>,
  roomId: string,
  prefixes: readonly string[],
) {
  const items = section.items.filter((item) => prefixes.some((prefix) => item.id === `${prefix}-${roomId}`));
  return calculateSectionTotals(items);
}

const room: FlooringRoomForSpecification = {
  roomId: "room-1",
  roomName: "Комната",
  area: 16,
  purchaseArea: 18.4,
  isIncluded: true,
  coveringType: "laminate",
  preparationType: "none",
  layoutType: "straight",
};

function flatSectionForRoom() {
  return createEstimateSection("flooring", "Полы", [
    {
      id: "flooring-installation-room-1",
      sectionId: "flooring",
      title: "Укладка",
      category: "works",
      quantity: 16,
      unit: "м²",
      unitPrice: 1100,
      total: 17600,
      isIncluded: true,
    },
    {
      id: "flooring-preparation-labor-room-1",
      sectionId: "flooring",
      title: "Подготовка работы",
      category: "works",
      quantity: 16,
      unit: "м²",
      unitPrice: 300,
      total: 4800,
      isIncluded: true,
    },
    {
      id: "flooring-material-room-1",
      sectionId: "flooring",
      title: "Покрытие",
      category: "materials",
      quantity: 18.4,
      unit: "м²",
      unitPrice: 930,
      total: 17112,
      isIncluded: true,
    },
    {
      id: "flooring-preparation-material-room-1",
      sectionId: "flooring",
      title: "Подготовка материалы",
      category: "materials",
      quantity: 16,
      unit: "м²",
      unitPrice: 100,
      total: 1600,
      isIncluded: true,
    },
    {
      id: "flooring-underlay-room-1",
      sectionId: "flooring",
      title: "Подложка",
      category: "consumables",
      quantity: 18.4,
      unit: "м²",
      unitPrice: 220,
      total: 4048,
      isIncluded: true,
    },
    {
      id: "flooring-primer-room-1",
      sectionId: "flooring",
      title: "Грунт",
      category: "consumables",
      quantity: 16,
      unit: "м²",
      unitPrice: 25,
      total: 400,
      isIncluded: true,
    },
    {
      id: "flooring-tools-room-1",
      sectionId: "flooring",
      title: "Инструмент",
      category: "consumables",
      quantity: 16,
      unit: "м²",
      unitPrice: 40,
      total: 640,
      isIncluded: true,
    },
    {
      id: "flooring-plinth-material",
      sectionId: "flooring",
      title: "Плинтус",
      category: "materials",
      quantity: 15.9,
      unit: "м",
      unitPrice: 450,
      total: 7155,
      isIncluded: true,
    },
  ]);
}

describe("buildFlooringSpecification", () => {
  it("разворачивает specLines covering/preparation/layout с basis area", () => {
    const flatSection = flatSectionForRoom();
    const { specificationLines, specificationSection } = buildFlooringSpecification({
      roomResults: [room],
      flatSection,
      coveringByCode: {
        laminate: {
          code: "laminate",
          title: "Ламинат",
          specLines: [
            {
              code: "cover-material",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 930,
            },
          ],
        },
      },
      preparationByCode: {
        none: {
          code: "none",
          title: "Без подготовки",
          specLines: [
            {
              code: "prep-work",
              title: "Контроль основания",
              category: "works",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 300,
            },
            {
              code: "prep-material",
              title: "Материалы подготовки",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 100,
            },
          ],
        },
      },
      layoutByCode: {
        straight: {
          code: "straight",
          title: "Прямая укладка",
          laborFactor: 1.1,
          specLines: [
            {
              code: "layout-work",
              title: "Укладка ламината",
              category: "works",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 1000,
            },
            {
              code: "layout-tool",
              title: "Инструмент",
              category: "tools",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 40,
            },
          ],
        },
      },
    });

    expect(specificationLines).toHaveLength(5);
    expect(specificationLines[0]).toMatchObject({
      category: "materials",
      quantity: 16,
      unitPrice: 930,
      total: 16 * 930 * (18.4 / 16),
      sourceLabel: "Покрытие: Ламинат",
      roomName: "Комната",
    });
    expect(specificationLines.find((line) => line.category === "tools")).toMatchObject({
      category: "tools",
      quantity: 16,
      total: 640,
      sourceLabel: "Укладка: Прямая укладка",
    });
    expect(specificationSection.items.some((item) => item.id === "flooring-material-room-1")).toBe(false);
    expect(specificationSection.items.some((item) => item.id === "flooring-installation-room-1")).toBe(false);
    expect(specificationSection.items.some((item) => item.id === "flooring-plinth-material")).toBe(true);
    expect(specificationSection.totals.total).toBe(flatSection.totals.total);
  });

  it("без specLines возвращает flat section как fallback", () => {
    const flatSection = flatSectionForRoom();
    const { specificationLines, specificationSection } = buildFlooringSpecification({
      roomResults: [room],
      flatSection,
      coveringByCode: { laminate: { code: "laminate", title: "Ламинат" } },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая укладка" } },
    });

    expect(specificationLines).toEqual([]);
    expect(specificationSection).toBe(flatSection);
  });

  it("частичные specLines оставляют flat строки для остальных источников", () => {
    const flatSection = flatSectionForRoom();
    const { specificationSection } = buildFlooringSpecification({
      roomResults: [room],
      flatSection,
      coveringByCode: {
        laminate: {
          code: "laminate",
          title: "Ламинат",
          specLines: [
            {
              code: "cover-material",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 930,
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая укладка" } },
    });

    expect(specificationSection.items.some((item) => item.id === "flooring-material-room-1")).toBe(false);
    expect(specificationSection.items.some((item) => item.id === "flooring-installation-room-1")).toBe(true);

    const flatMaterial = flatSection.items.find((item) => item.id === "flooring-material-room-1")!.total;
    const specMaterial = specificationSection.items
      .filter((item) => item.category === "materials" && item.id.startsWith("flooring-spec-"))
      .reduce((sum, item) => sum + item.total, 0);

    expect(specMaterial).toBeCloseTo(flatMaterial, 2);
  });
});

describe("FP5b specLines arithmetic guard", () => {
  it("covering material + waste: line total matches flat material bucket", () => {
    const area = 10;
    const purchaseArea = area;
    const unitPrice = 1000;
    const quantityPerBasis = 1.1;
    const materialPricePerM2 = unitPrice * quantityPerBasis;

    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-material-room-1",
        sectionId: "flooring",
        title: "Покрытие",
        category: "materials",
        quantity: area,
        unit: "м²",
        unitPrice: materialPricePerM2,
        total: area * materialPricePerM2,
        isIncluded: true,
      },
    ]);

    const { specificationLines, specificationSection } = buildFlooringSpecification({
      roomResults: [{ ...room, area, purchaseArea }],
      flatSection,
      coveringByCode: {
        laminate: {
          code: "laminate",
          title: "Ламинат",
          specLines: [
            {
              code: "cover-material",
              title: "Покрытие",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis,
              unitPrice,
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    expect(specificationLines[0]?.total).toBeCloseTo(11000, 2);
    expect(flatSection.items[0]?.total).toBeCloseTo(11000, 2);

    const specMaterialTotal = calculateSpecificationSectionItemTotals(specificationSection).materials;
    expect(specMaterialTotal).toBeCloseTo(flatSection.totals.materials, 2);
  });

  it("consumable package/layer: spec total matches flat consumables bucket", () => {
    const area = 12;
    const purchaseArea = 13.2;
    const packageSize = 25;
    const price = 600;
    const consumption = 1.5;
    const layerMm = 5;
    const unitPrice = price / packageSize;
    const quantityPerBasis = consumption * layerMm;
    const flatPerM2 = unitPrice * quantityPerBasis;

    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-adhesive-room-1",
        sectionId: "flooring",
        title: "Клей",
        category: "consumables",
        quantity: purchaseArea,
        unit: "м²",
        unitPrice: flatPerM2,
        total: purchaseArea * flatPerM2,
        isIncluded: true,
      },
    ]);

    const { specificationSection } = buildFlooringSpecification({
      roomResults: [{ ...room, area, purchaseArea }],
      flatSection,
      coveringByCode: {
        laminate: {
          code: "laminate",
          title: "Ламинат",
          specLines: [
            {
              code: "adhesive",
              title: "Клей плиточный",
              category: "consumables",
              basis: "area",
              unit: "kg",
              quantityPerBasis,
              unitPrice,
              packageSize,
              packageUnit: "kg",
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая" } },
    });

    const specLineTotal = specificationSection.items.find((item) => item.id.startsWith("flooring-spec-covering"))!.total;
    expect(specLineTotal).toBeCloseTo(area * unitPrice * quantityPerBasis * (purchaseArea / area), 2);
    expect(calculateSpecificationSectionItemTotals(specificationSection).consumables).toBeCloseTo(
      flatSection.totals.consumables,
      2,
    );
  });

  it("prep/layout works: spec work lines match flat works for area", () => {
    const area = 16;
    const laborPricePerM2 = 1000;
    const laborFactor = 1.1;
    const laborWithFactor = laborPricePerM2 * laborFactor;
    const prepLaborPricePerM2 = 300;

    const flatSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-installation-room-1",
        sectionId: "flooring",
        title: "Укладка",
        category: "works",
        quantity: area,
        unit: "м²",
        unitPrice: laborWithFactor,
        total: area * laborWithFactor,
        isIncluded: true,
      },
      {
        id: "flooring-preparation-labor-room-1",
        sectionId: "flooring",
        title: "Подготовка",
        category: "works",
        quantity: area,
        unit: "м²",
        unitPrice: prepLaborPricePerM2,
        total: area * prepLaborPricePerM2,
        isIncluded: true,
      },
    ]);

    const { specificationSection } = buildFlooringSpecification({
      roomResults: [{ ...room, area, purchaseArea: area }],
      flatSection,
      coveringByCode: { laminate: { code: "laminate", title: "Ламинат" } },
      preparationByCode: {
        none: {
          code: "none",
          title: "Без подготовки",
          specLines: [
            {
              code: "prep-work",
              title: "Подготовка",
              category: "works",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: prepLaborPricePerM2,
            },
          ],
        },
      },
      layoutByCode: {
        straight: {
          code: "straight",
          title: "Прямая",
          laborFactor,
          specLines: [
            {
              code: "layout-work",
              title: "Укладка",
              category: "works",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: laborPricePerM2,
            },
          ],
        },
      },
    });

    const flatWorks = flatItemTotalsForPrefixes(flatSection, room.roomId, [
      "flooring-installation",
      "flooring-preparation-labor",
    ]);
    const specWorks = calculateSpecificationSectionItemTotals({
      ...specificationSection,
      items: specificationSection.items.filter((item) => item.category === "works"),
    });

    expectCategoryTotalsNear(specWorks, flatWorks);
  });

  it("partial fallback: expanded spec + remaining flat — no double-count", () => {
    const flatSection = flatSectionForRoom();
    const { specificationSection } = buildFlooringSpecification({
      roomResults: [room],
      flatSection,
      coveringByCode: {
        laminate: {
          code: "laminate",
          title: "Ламинат",
          specLines: [
            {
              code: "cover-material",
              title: "Ламинат доска",
              category: "materials",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 930,
            },
          ],
        },
      },
      preparationByCode: { none: { code: "none", title: "Без подготовки" } },
      layoutByCode: { straight: { code: "straight", title: "Прямая укладка", laborFactor: 1.1 } },
    });

    const specIds = new Set(specificationSection.items.map((item) => item.id));
    const flatIds = new Set(flatSection.items.map((item) => item.id));
    const replacedFlatIds = [...flatIds].filter(
      (id) =>
        !specIds.has(id) &&
        (id.startsWith("flooring-material-") ||
          id.startsWith("flooring-underlay-") ||
          id.startsWith("flooring-installation-")),
    );

    expect(replacedFlatIds.some((id) => id === "flooring-material-room-1")).toBe(true);
    expect(specIds.has("flooring-material-room-1")).toBe(false);
    expect(specIds.has("flooring-installation-room-1")).toBe(true);

    const specMaterialTotal = specificationSection.items
      .filter((item) => item.id.startsWith("flooring-spec-covering-"))
      .reduce((sum, item) => sum + item.total, 0);
    const flatMaterialTotal = flatSection.items.find((item) => item.id === "flooring-material-room-1")!.total;
    expect(specMaterialTotal).toBeCloseTo(flatMaterialTotal, 2);
  });
});

describe("expandFlooringSectionForSpec", () => {
  it("подменяет items, сохраняя totals flat section", () => {
    const flatSection = flatSectionForRoom();
    const expandedSection = createEstimateSection("flooring", "Полы", [
      {
        id: "flooring-spec-line",
        sectionId: "flooring",
        title: "Spec line",
        category: "materials",
        quantity: 1,
        unit: "m2",
        unitPrice: 100,
        total: 100,
        isIncluded: true,
      },
    ]);

    const result = expandFlooringSectionForSpec(flatSection, expandedSection);

    expect(result.items).toHaveLength(1);
    expect(result.totals.total).toBe(flatSection.totals.total);
  });
});
