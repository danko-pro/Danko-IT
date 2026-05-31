import { describe, expect, it } from "vitest";

import {
  getWarmFloorRates,
  loadWarmFloorSnapshot,
  validateWarmFloorSnapshot,
} from "./public-warm-floor-snapshot";
import { calculateWarmFloor } from "./public-estimate-warm-floor";

describe("warm-floor snapshot", () => {
  it("loads and validates the generated v1 snapshot", () => {
    const snapshot = loadWarmFloorSnapshot();
    expect(snapshot.version).toBe("warm-floor-v1");
    expect(snapshot.water.waterLaborRatePerM2).toBe(1600);
    expect(snapshot.electric.electricMatPricePerM2).toBe(2700);
  });

  it("rejects invalid snapshot payloads", () => {
    expect(validateWarmFloorSnapshot(null)).toEqual({
      ok: false,
      reason: "payload must be a non-null object",
    });
    expect(
      validateWarmFloorSnapshot({
        version: "warm-floor-v1",
        water: {},
        electric: { electricMatPricePerM2: 1 },
      }),
    ).toEqual({
      ok: false,
      reason: "water rates must be finite numbers",
    });
  });

  it("merges water and electric rates for calculateWarmFloor", () => {
    const rates = getWarmFloorRates();
    const result = calculateWarmFloor("electric", [
      {
        roomId: "bath",
        roomName: "Ванная",
        area: 5,
        isSelected: true,
        warmFloorArea: 5,
      },
    ]);

    const expectedMaterials =
      5 * rates.electricMatPricePerM2 +
      rates.electricBreakerMaterial +
      rates.thermostatMaterial +
      rates.electricWireMaterial;

    expect(result.materialsTotal).toBeCloseTo(expectedMaterials, 2);
    expect(result.worksTotal).toBeCloseTo(rates.electricInstallationLabor, 2);
  });

  it("changes totals when snapshot rates differ", () => {
    const baseRates = getWarmFloorRates();
    const altered = {
      version: "warm-floor-v1",
      water: { ...baseRates },
      electric: {
        ...baseRates,
        electricMatPricePerM2: baseRates.electricMatPricePerM2 + 500,
      },
    };

    const validation = validateWarmFloorSnapshot(altered);
    expect(validation.ok).toBe(true);

    const area = 8;
    const baseResult = calculateWarmFloor("electric", [
      {
        roomId: "bath",
        roomName: "Ванная",
        area,
        isSelected: true,
        warmFloorArea: area,
      },
    ]);

    const alteredMaterials =
      area * altered.electric.electricMatPricePerM2 +
      altered.electric.electricBreakerMaterial +
      altered.electric.thermostatMaterial +
      altered.electric.electricWireMaterial;

    expect(alteredMaterials - baseResult.materialsTotal).toBeCloseTo(area * 500, 2);
  });
});
