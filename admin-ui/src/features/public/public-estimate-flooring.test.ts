import { describe, expect, it } from "vitest";
import {
  calculateFlooring,
  type FlooringOptions,
  type FlooringRoomInput,
} from "./public-estimate-flooring";

const room: FlooringRoomInput = {
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

const options: FlooringOptions = {
  includePlinth: true,
  plinthType: "duropolymer",
  includeThresholds: false,
  thresholdCount: 0,
  includeDemolition: false,
};

describe("calculateFlooring", () => {
  it("использует длину плинтуса из геометрии, а не полный периметр", () => {
    const result = calculateFlooring([room], options);

    // Должно равняться plinthLength (15.9), а не perimeter (16.8).
    expect(result.plinthLength).toBeCloseTo(15.9, 6);

    const plinthMaterial = result.section.items.find((item) => item.id === "flooring-plinth-material");
    const plinthLabor = result.section.items.find((item) => item.id === "flooring-plinth-labor");

    expect(plinthMaterial?.quantity).toBeCloseTo(15.9, 6);
    expect(plinthLabor?.quantity).toBeCloseTo(15.9, 6);
  });

  it("откатывается на периметр, если длина плинтуса не передана", () => {
    const { plinthLength, ...withoutPlinth } = room;
    void plinthLength;
    const result = calculateFlooring([withoutPlinth], options);

    expect(result.plinthLength).toBeCloseTo(16.8, 6);
  });

  it("считает золотой случай ламината с прямой укладкой и плинтусом", () => {
    const result = calculateFlooring([room], options);

    // works: укладка 16*1100 + подготовка 16*300 + монтаж плинтуса 15.9*450
    expect(result.worksTotal).toBeCloseTo(17600 + 4800 + 7155, 2);
    // materials: покрытие 18.4*930 + материалы подготовки 16*100 + плинтус 15.9*450
    expect(result.materialsTotal).toBeCloseTo(17112 + 1600 + 7155, 2);
    // consumables: подложка 18.4*220 + грунт 16*25 + инструмент 16*40
    expect(result.consumablesTotal).toBeCloseTo(4048 + 400 + 640, 2);
    expect(result.total).toBeCloseTo(60510, 2);
  });

  it("не добавляет плинтус, если опция отключена", () => {
    const result = calculateFlooring([room], { ...options, includePlinth: false });

    expect(result.plinthLength).toBe(0);
    expect(result.section.items.some((item) => item.id === "flooring-plinth-material")).toBe(false);
  });

  it("исключает помещения, которые не включены или с нулевой площадью", () => {
    const result = calculateFlooring([{ ...room, isIncluded: false }], options);

    expect(result.flooringArea).toBe(0);
    expect(result.total).toBe(0);
  });
});
