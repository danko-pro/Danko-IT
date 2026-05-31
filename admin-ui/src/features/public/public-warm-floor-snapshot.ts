import warmFloorSnapshotData from "./generated/warm-floor.snapshot.json";

export type WarmFloorWaterRates = {
  waterLaborRatePerM2: number;
  pipeMetersPerM2: number;
  maxCircuitAreaM2: number;
  pumpRoomThreshold: number;
  pumpCircuitThreshold: number;
  pipePricePerMeter: number;
  chaseLaborPerMeter: number;
  smallLoopFittingsMaterial: number;
  smallLoopControlHeadMaterial: number;
  smallLoopConnectionLabor: number;
  manifoldLabor: number;
  manifoldMaterial: number;
  pumpLabor: number;
  pumpMaterial: number;
};

export type WarmFloorElectricRates = {
  electricMatPricePerM2: number;
  electricBreakerMaterial: number;
  thermostatMaterial: number;
  electricWireMaterial: number;
  electricInstallationLabor: number;
};

export type WarmFloorSnapshot = {
  version: string;
  water: WarmFloorWaterRates;
  electric: WarmFloorElectricRates;
};

export type WarmFloorRates = WarmFloorWaterRates & WarmFloorElectricRates;

const WATER_RATE_KEYS: (keyof WarmFloorWaterRates)[] = [
  "waterLaborRatePerM2",
  "pipeMetersPerM2",
  "maxCircuitAreaM2",
  "pumpRoomThreshold",
  "pumpCircuitThreshold",
  "pipePricePerMeter",
  "chaseLaborPerMeter",
  "smallLoopFittingsMaterial",
  "smallLoopControlHeadMaterial",
  "smallLoopConnectionLabor",
  "manifoldLabor",
  "manifoldMaterial",
  "pumpLabor",
  "pumpMaterial",
];

const ELECTRIC_RATE_KEYS: (keyof WarmFloorElectricRates)[] = [
  "electricMatPricePerM2",
  "electricBreakerMaterial",
  "thermostatMaterial",
  "electricWireMaterial",
  "electricInstallationLabor",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasNumericRates(
  section: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => typeof section[key] === "number" && Number.isFinite(section[key]));
}

/**
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateWarmFloorSnapshot(payload: unknown) {
  if (!isRecord(payload)) {
    return { ok: false as const, reason: "payload must be a non-null object" };
  }
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    return { ok: false as const, reason: "version must be a non-empty string" };
  }
  if (!isRecord(payload.water)) {
    return { ok: false as const, reason: "water must be an object" };
  }
  if (!isRecord(payload.electric)) {
    return { ok: false as const, reason: "electric must be an object" };
  }
  if (!hasNumericRates(payload.water, WATER_RATE_KEYS)) {
    return { ok: false as const, reason: "water rates must be finite numbers" };
  }
  if (!hasNumericRates(payload.electric, ELECTRIC_RATE_KEYS)) {
    return { ok: false as const, reason: "electric rates must be finite numbers" };
  }

  return { ok: true as const };
}

export function loadWarmFloorSnapshot(): WarmFloorSnapshot {
  const validation = validateWarmFloorSnapshot(warmFloorSnapshotData);
  if (!validation.ok) {
    throw new Error(`warm-floor.snapshot: ${validation.reason}`);
  }

  return warmFloorSnapshotData as WarmFloorSnapshot;
}

export function getWarmFloorRates(): WarmFloorRates {
  const snapshot = loadWarmFloorSnapshot();
  return { ...snapshot.water, ...snapshot.electric };
}
