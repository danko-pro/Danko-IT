import { describe, expect, it, vi } from "vitest";
import {
  calculateFlooring,
  type FlooringOptions,
  type FlooringRoomInput,
} from "./public-estimate-flooring";
import * as flooringSnapshotModule from "./public-flooring-snapshot";
import flooringSnapshotData from "./generated/flooring.snapshot.json";

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

  it("без specLines использует flat section как specification fallback", () => {
    const result = calculateFlooring([room], options);

    expect(result.specificationLines).toEqual([]);
    expect(result.specificationSection).toBe(result.section);
  });

  it("с specLines строит specificationLines без изменения flat totals", () => {
    const catalogSpy = vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue({
      coverings: {
        ...Object.fromEntries(
          flooringSnapshotData.coverings.map((item) => [item.code, { ...item }]),
        ),
        laminate: {
          ...flooringSnapshotData.coverings.find((item) => item.code === "laminate")!,
          specLines: [
            {
              code: "laminate-board",
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
      preparations: Object.fromEntries(
        flooringSnapshotData.preparations.map((item) => [item.code, { ...item }]),
      ),
      layouts: Object.fromEntries(flooringSnapshotData.layouts.map((item) => [item.code, { ...item }])),
    });

    const result = calculateFlooring([room], options);

    expect(result.total).toBeCloseTo(60510, 2);
    expect(result.specificationLines.length).toBeGreaterThan(0);
    expect(result.specificationLines[0]).toMatchObject({
      category: "materials",
      quantity: 16,
      sourceLabel: expect.stringContaining("Покрытие"),
    });
    expect(result.specificationSection.items).not.toBe(result.section.items);
    expect(result.specificationSection.totals.total).toBe(result.section.totals.total);

    const materialSpecTotal = result.specificationLines
      .filter((line) => line.category === "materials")
      .reduce((sum, line) => sum + line.total, 0);
    const flatMaterialTotal = result.section.items
      .filter((item) => item.id.startsWith("flooring-material-"))
      .reduce((sum, item) => sum + item.total, 0);
    expect(materialSpecTotal).toBeCloseTo(flatMaterialTotal, 2);

    catalogSpy.mockRestore();
  });

  it("legacy flooring-v1 snapshot без specLines сохраняет golden totals", () => {
    const legacyCoverings = flooringSnapshotData.coverings.map((item) => ({
      ...item,
      laborPricePerM2: item.code === "laminate" ? 1000 : 0,
    }));
    const legacyLayouts = flooringSnapshotData.layouts.map(({ laborPricePerM2: _legacy, ...item }) => item);

    const catalogSpy = vi.spyOn(flooringSnapshotModule, "getFlooringSnapshotCatalog").mockReturnValue({
      coverings: Object.fromEntries(legacyCoverings.map((item) => [item.code, { ...item }])),
      preparations: Object.fromEntries(
        flooringSnapshotData.preparations.map((item) => [item.code, { ...item }]),
      ),
      layouts: Object.fromEntries(legacyLayouts.map((item) => [item.code, { ...item }])),
    });

    const result = calculateFlooring([room], options);

    expect(result.total).toBeCloseTo(60510, 2);
    expect(result.specificationLines).toEqual([]);
    expect(result.specificationSection).toBe(result.section);

    catalogSpy.mockRestore();
  });

  it("public result не содержит forbidden internal keys", () => {
    const result = calculateFlooring([room], options);
    const forbidden = new Set([
      "assembly_id",
      "assembly_item_id",
      "owner_user_id",
      "custom_consumables_json",
      "created_at",
      "updated_at",
      "technical_title",
    ]);

    function findForbiddenKeys(value: unknown, found = new Set<string>()): Set<string> {
      if (value !== null && typeof value === "object") {
        if (Array.isArray(value)) {
          for (const item of value) {
            findForbiddenKeys(item, found);
          }
        } else {
          for (const [key, nested] of Object.entries(value)) {
            if (forbidden.has(key)) {
              found.add(key);
            }
            findForbiddenKeys(nested, found);
          }
        }
      }
      return found;
    }

    expect([...findForbiddenKeys(result)].sort()).toEqual([]);
  });
});
