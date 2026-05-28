import { describe, expect, it } from "vitest";
import {
  calculateEstimateTotals,
  calculateSectionTotals,
  createEstimateSection,
  type EstimateLineItem,
} from "./public-estimate-model";

function makeItem(
  id: string,
  category: EstimateLineItem["category"],
  quantity: number,
  unitPrice: number,
  isIncluded = true,
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
    isIncluded,
  };
}

describe("calculateSectionTotals", () => {
  it("суммирует по категориям и игнорирует невключённые позиции", () => {
    const totals = calculateSectionTotals([
      makeItem("a", "works", 10, 100),
      makeItem("b", "materials", 2, 500),
      makeItem("c", "materials", 5, 1000, false),
    ]);

    expect(totals.works).toBe(1000);
    expect(totals.materials).toBe(1000);
    expect(totals.total).toBe(2000);
  });
});

describe("calculateEstimateTotals", () => {
  it("складывает разделы и считает ₽/м²", () => {
    const sectionOne = createEstimateSection("walls", "Стены", [
      makeItem("works", "works", 10, 100),
      makeItem("materials", "materials", 2, 500),
    ]);
    const sectionTwo = createEstimateSection("appliances", "Техника", [
      makeItem("equipment", "equipment", 1, 5000),
      makeItem("consumables", "consumables", 4, 250),
    ]);

    const totals = calculateEstimateTotals([sectionOne, sectionTwo], 50);

    expect(totals.works).toBe(1000);
    expect(totals.materials).toBe(1000);
    expect(totals.equipment).toBe(5000);
    expect(totals.consumables).toBe(1000);
    expect(totals.total).toBe(8000);
    expect(totals.pricePerSquareMeter).toBeCloseTo(160, 6);
  });

  it("возвращает нулевую цену за м² при нулевой площади", () => {
    const section = createEstimateSection("walls", "Стены", [makeItem("works", "works", 1, 100)]);
    const totals = calculateEstimateTotals([section], 0);

    expect(totals.total).toBe(100);
    expect(totals.pricePerSquareMeter).toBe(0);
  });
});
