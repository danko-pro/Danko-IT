import { describe, expect, it } from "vitest";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  parseEstimateInteger,
  type EstimateRoomInput,
} from "./public-estimate-geometry";

const baseRoom: EstimateRoomInput = {
  id: "room",
  name: "Комната",
  type: "living_room",
  area: 16,
  doorCount: 1,
  windowCount: 1,
};

describe("calculateEstimateRoomGeometry", () => {
  it("выводит периметр, площадь стен и плинтус с вычетом дверей", () => {
    const geometry = calculateEstimateRoomGeometry(baseRoom, 2.7);

    // shapeFactor living_room = 1.05; perimeter = 4 * sqrt(16) * 1.05 = 16.8
    expect(geometry.perimeter).toBeCloseTo(16.8, 6);
    // wallArea = perimeter * height
    expect(geometry.wallArea).toBeCloseTo(45.36, 6);
    // openingArea = 1 дверь * 1.6 + 1 окно * 1.8
    expect(geometry.openingArea).toBeCloseTo(3.4, 6);
    expect(geometry.finishWallArea).toBeCloseTo(41.96, 6);
    expect(geometry.ceilingArea).toBeCloseTo(16, 6);
    // plinthLength = perimeter - двери * 0.9 = 16.8 - 0.9
    expect(geometry.plinthLength).toBeCloseTo(15.9, 6);
  });

  it("учитывает несколько дверей при расчёте плинтуса и не уходит ниже нуля", () => {
    const geometry = calculateEstimateRoomGeometry({ ...baseRoom, area: 4, doorCount: 30 }, 2.7);

    // perimeter = 4 * 2 * 1.05 = 8.4; 30 дверей * 0.9 = 27 -> max(0, ...) = 0
    expect(geometry.perimeter).toBeCloseTo(8.4, 6);
    expect(geometry.plinthLength).toBe(0);
  });

  it("округляет дробные двери и окна и защищает от отрицательных значений", () => {
    const geometry = calculateEstimateRoomGeometry(
      { ...baseRoom, doorCount: 1.4, windowCount: 2.6, area: -5 },
      -1,
    );

    expect(geometry.area).toBe(0);
    expect(geometry.doorCount).toBe(1);
    expect(geometry.windowCount).toBe(3);
    expect(geometry.wallArea).toBe(0);
  });
});

describe("calculateEstimateGeometryTotals", () => {
  it("суммирует объёмы по всем помещениям", () => {
    const rooms = [
      calculateEstimateRoomGeometry(baseRoom, 2.7),
      calculateEstimateRoomGeometry({ ...baseRoom, id: "room-2", area: 9, doorCount: 1, windowCount: 0 }, 2.7),
    ];

    const totals = calculateEstimateGeometryTotals(rooms);

    expect(totals.floorArea).toBeCloseTo(25, 6);
    // perimeter второй комнаты = 4 * 3 * 1.05 = 12.6
    expect(totals.perimeter).toBeCloseTo(16.8 + 12.6, 6);
    // plinthLength: (16.8 - 0.9) + (12.6 - 0.9) = 15.9 + 11.7
    expect(totals.plinthLength).toBeCloseTo(15.9 + 11.7, 6);
  });
});

describe("parseEstimateDecimal", () => {
  it("принимает запятую и точку как разделитель", () => {
    expect(parseEstimateDecimal("12,5")).toBeCloseTo(12.5, 6);
    expect(parseEstimateDecimal("12.5")).toBeCloseTo(12.5, 6);
  });

  it("возвращает 0 для пустых и нечисловых значений и не допускает отрицательных", () => {
    expect(parseEstimateDecimal("")).toBe(0);
    expect(parseEstimateDecimal("abc")).toBe(0);
    expect(parseEstimateDecimal("-5")).toBe(0);
  });
});

describe("parseEstimateInteger", () => {
  it("извлекает целое из строки и игнорирует мусорные символы", () => {
    expect(parseEstimateInteger("3")).toBe(3);
    expect(parseEstimateInteger("3.9")).toBe(39);
    expect(parseEstimateInteger("  12 шт ")).toBe(12);
  });

  it("возвращает 0 для пустых значений", () => {
    expect(parseEstimateInteger("")).toBe(0);
    expect(parseEstimateInteger("abc")).toBe(0);
  });
});
