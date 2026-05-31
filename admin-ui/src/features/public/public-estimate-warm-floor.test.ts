import { describe, expect, it } from "vitest";
import {
  calculateWarmFloor,
  warmFloorRates,
  type WarmFloorRoomInput,
} from "./public-estimate-warm-floor";

function room(overrides: Partial<WarmFloorRoomInput> & Pick<WarmFloorRoomInput, "roomId">): WarmFloorRoomInput {
  return {
    roomName: "Помещение",
    area: 10,
    isSelected: true,
    warmFloorArea: 10,
    ...overrides,
  };
}

describe("calculateWarmFloor", () => {
  it("возвращает нулевой итог без выбранных помещений", () => {
    const result = calculateWarmFloor("water", [
      room({ roomId: "a", isSelected: false, warmFloorArea: 12 }),
      room({ roomId: "b", warmFloorArea: 0 }),
    ]);

    expect(result.selectedArea).toBe(0);
    expect(result.total).toBe(0);
    expect(result.section.items).toHaveLength(0);
  });

  it("считает водяной малый контур в одном помещении", () => {
    const area = 10;
    const result = calculateWarmFloor("water", [room({ roomId: "bath", warmFloorArea: area, area })]);

    const pipeMeters = area * warmFloorRates.pipeMetersPerM2;
    const chaseLength = Math.max(3, 1 * 3);

    expect(result.roomCount).toBe(1);
    expect(result.circuitCount).toBe(1);
    expect(result.usesTowelRailConnection).toBe(true);
    expect(result.needsManifold).toBe(false);
    expect(result.needsPump).toBe(false);
    expect(result.pipeMeters).toBeCloseTo(pipeMeters, 6);
    expect(result.chaseLengthMeters).toBe(chaseLength);

    const pipeTotal = pipeMeters * warmFloorRates.pipePricePerMeter;
    expect(pipeTotal).toBeCloseTo(area * 6 * 168.78, 2);

    expect(result.section.items.some((item) => item.id === "warm-floor-small-loop-fittings-material")).toBe(true);
    expect(result.section.items.some((item) => item.id === "warm-floor-small-loop-control-head-material")).toBe(true);
    expect(result.section.items.some((item) => item.id === "warm-floor-small-loop-connection-labor")).toBe(true);
    expect(result.section.items.some((item) => item.id === "warm-floor-towel-rail-connection-labor")).toBe(false);
    expect(result.section.items.some((item) => item.id === "warm-floor-towel-rail-connection-material")).toBe(false);

    const materialsFromSmallLoop =
      warmFloorRates.smallLoopFittingsMaterial + warmFloorRates.smallLoopControlHeadMaterial;
    const worksFromSmallLoop = warmFloorRates.smallLoopConnectionLabor + chaseLength * warmFloorRates.chaseLaborPerMeter;
    const worksFromLabor = area * warmFloorRates.waterLaborRatePerM2;

    expect(result.materialsTotal).toBeCloseTo(pipeTotal + materialsFromSmallLoop, 2);
    expect(result.worksTotal).toBeCloseTo(worksFromLabor + worksFromSmallLoop, 2);
    expect(result.total).toBeCloseTo(result.materialsTotal + result.worksTotal, 2);
  });

  it("добавляет гребенку для двух помещений или двух контуров", () => {
    const twoRooms = calculateWarmFloor("water", [
      room({ roomId: "a", warmFloorArea: 8, area: 8 }),
      room({ roomId: "b", warmFloorArea: 6, area: 6 }),
    ]);
    expect(twoRooms.needsManifold).toBe(true);
    expect(twoRooms.needsPump).toBe(false);
    expect(twoRooms.section.items.some((item) => item.id === "warm-floor-manifold-labor")).toBe(true);
    expect(twoRooms.section.items.some((item) => item.id === "warm-floor-manifold-material")).toBe(true);

    const twoCircuits = calculateWarmFloor("water", [room({ roomId: "large", warmFloorArea: 20, area: 20 })]);
    expect(twoCircuits.circuitCount).toBe(2);
    expect(twoCircuits.needsManifold).toBe(true);
    expect(twoCircuits.needsPump).toBe(false);
    expect(twoCircuits.usesTowelRailConnection).toBe(false);
    expect(twoCircuits.section.items.some((item) => item.id === "warm-floor-manifold-labor")).toBe(true);
  });

  it("добавляет насос для трёх помещений или четырёх контуров", () => {
    const threeRooms = calculateWarmFloor("water", [
      room({ roomId: "a", warmFloorArea: 5, area: 5 }),
      room({ roomId: "b", warmFloorArea: 5, area: 5 }),
      room({ roomId: "c", warmFloorArea: 5, area: 5 }),
    ]);
    expect(threeRooms.needsPump).toBe(true);
    expect(threeRooms.section.items.some((item) => item.id === "warm-floor-pump-labor")).toBe(true);
    expect(threeRooms.section.items.some((item) => item.id === "warm-floor-pump-material")).toBe(true);

    const fourCircuits = calculateWarmFloor("water", [room({ roomId: "large", warmFloorArea: 55, area: 55 })]);
    expect(fourCircuits.circuitCount).toBe(4);
    expect(fourCircuits.needsPump).toBe(true);
    expect(fourCircuits.section.items.some((item) => item.id === "warm-floor-pump-labor")).toBe(true);
  });

  it("считает электрический тёплый пол по фиксированному комплекту v1", () => {
    const area = 8;
    const result = calculateWarmFloor("electric", [room({ roomId: "bath", warmFloorArea: area, area })]);

    const fixedMaterials =
      warmFloorRates.electricBreakerMaterial +
      warmFloorRates.thermostatMaterial +
      warmFloorRates.electricWireMaterial;
    const expectedMaterials = area * warmFloorRates.electricMatPricePerM2 + fixedMaterials;
    const expectedWorks = warmFloorRates.electricInstallationLabor;

    expect(result.thermostatCount).toBe(1);
    expect(result.electricBreakerCount).toBe(1);
    expect(result.chaseLengthMeters).toBe(0);
    expect(result.section.items.some((item) => item.id === "warm-floor-electric-chase-labor")).toBe(false);
    expect(result.section.items.some((item) => item.id === "warm-floor-electric-labor")).toBe(false);

    expect(fixedMaterials).toBe(8000);
    expect(result.materialsTotal).toBeCloseTo(expectedMaterials, 2);
    expect(result.worksTotal).toBeCloseTo(expectedWorks, 2);
    expect(result.total).toBeCloseTo(expectedMaterials + expectedWorks, 2);
  });
});
