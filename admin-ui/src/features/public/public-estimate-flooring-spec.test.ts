import { describe, expect, it } from "vitest";
import { createEstimateSection } from "./public-estimate-model";
import {
  buildFlooringSpecification,
  expandFlooringSectionForSpec,
  type FlooringRoomForSpecification,
} from "./public-estimate-flooring-spec";

const room: FlooringRoomForSpecification = {
  roomId: "room-1",
  roomName: "Комната",
  area: 16,
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
              quantityPerBasis: 1.15,
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
          ],
        },
      },
      layoutByCode: {
        straight: {
          code: "straight",
          title: "Прямая укладка",
          specLines: [
            {
              code: "layout-work",
              title: "Укладка ламината",
              category: "works",
              basis: "area",
              unit: "m2",
              quantityPerBasis: 1,
              unitPrice: 1100,
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

    expect(specificationLines).toHaveLength(4);
    expect(specificationLines[0]).toMatchObject({
      category: "materials",
      quantity: 16,
      unitPrice: 930,
      total: 16 * 930 * 1.15,
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
