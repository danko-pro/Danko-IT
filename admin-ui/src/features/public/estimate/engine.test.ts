import { describe, expect, it } from "vitest";
import {
  createEmptyEstimateResult,
  createEstimateSection,
  type EstimateLineItem,
} from "../public-estimate-model";
import { buildPublicEstimateResult } from "./engine";

function makeItem(
  id: string,
  category: EstimateLineItem["category"],
  quantity: number,
  unitPrice: number,
): EstimateLineItem {
  return {
    id,
    sectionId: "extras",
    title: id,
    category,
    quantity,
    unit: "шт.",
    unitPrice,
    total: quantity * unitPrice,
    isIncluded: true,
  };
}

function emptySection(id: EstimateLineItem["sectionId"], title: string) {
  return createEstimateSection(id, title, []);
}

function sectionWithItem(id: EstimateLineItem["sectionId"], title: string, itemId: string, total: number) {
  return createEstimateSection(id, title, [makeItem(itemId, "works", 1, total)]);
}

function emptyAssemblyInput(floorArea = 0) {
  return {
    warmFloorResult: { selectedArea: 0, section: emptySection("warm_floor", "Тёплый пол") },
    flooringResult: { flooringArea: 0, section: emptySection("flooring", "Напольное покрытие") },
    wallsResult: { wallFinishArea: 0, section: emptySection("walls", "Стены") },
    ceilingResult: { ceilingArea: 0, section: emptySection("ceiling", "Потолки") },
    electricResult: { section: emptySection("electric", "Электрика") },
    plumbingResult: { section: emptySection("plumbing", "Сантехника") },
    doorsResult: { section: emptySection("doors", "Двери") },
    completionResult: { section: emptySection("completion", "Завершение") },
    appliancesResult: { section: emptySection("appliances", "Техника") },
    looseFurnitureResult: { section: emptySection("loose_furniture", "Мебель") },
    homeGoodsResult: { section: emptySection("home_goods", "Товары для дома") },
    floorArea,
  };
}

describe("buildPublicEstimateResult", () => {
  it("возвращает пустой результат, если все разделы отфильтрованы", () => {
    const result = buildPublicEstimateResult(emptyAssemblyInput());

    expect(result).toEqual(createEmptyEstimateResult());
  });

  it("отфильтровывает разделы с нулевой площадью и пустыми позициями", () => {
    const input = emptyAssemblyInput(50);
    input.warmFloorResult = { selectedArea: 0, section: sectionWithItem("warm_floor", "Тёплый пол", "wf", 1000) };
    input.flooringResult = { flooringArea: 0, section: sectionWithItem("flooring", "Напольное покрытие", "fl", 2000) };
    input.wallsResult = { wallFinishArea: 12, section: sectionWithItem("walls", "Стены", "wl", 3000) };
    input.ceilingResult = { ceilingArea: 0, section: sectionWithItem("ceiling", "Потолки", "cl", 4000) };
    input.electricResult = { section: emptySection("electric", "Электрика") };
    input.plumbingResult = { section: emptySection("plumbing", "Сантехника") };

    const result = buildPublicEstimateResult(input);

    expect(result.sections.map((section) => section.id)).toEqual(["walls"]);
    expect(result.totals.total).toBe(3000);
    expect(result.totals.pricePerSquareMeter).toBeCloseTo(60, 6);
  });

  it("собирает несколько разделов в фиксированном порядке и считает итоги", () => {
    const input = emptyAssemblyInput(40);
    input.warmFloorResult = { selectedArea: 8, section: sectionWithItem("warm_floor", "Тёплый пол", "wf", 1000) };
    input.flooringResult = { flooringArea: 40, section: sectionWithItem("flooring", "Напольное покрытие", "fl", 2000) };
    input.wallsResult = { wallFinishArea: 0, section: sectionWithItem("walls", "Стены", "wl", 3000) };
    input.electricResult = { section: sectionWithItem("electric", "Электрика", "el", 4000) };
    input.appliancesResult = { section: sectionWithItem("appliances", "Техника", "ap", 5000) };

    const result = buildPublicEstimateResult(input);

    expect(result.sections.map((section) => section.id)).toEqual([
      "warm_floor",
      "flooring",
      "electric",
      "appliances",
    ]);
    expect(result.totals.works).toBe(12000);
    expect(result.totals.total).toBe(12000);
    expect(result.totals.pricePerSquareMeter).toBeCloseTo(300, 6);
  });
});
