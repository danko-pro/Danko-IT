import flooringSnapshotData from "./generated/flooring.snapshot.json";
import type {
  FlooringCoveringType,
  FlooringLayoutType,
  FlooringPlinthType,
  FlooringPreparationType,
} from "./public-estimate-flooring";

export type FlooringPackageSpecLine = {
  code: string;
  title: string;
  category: "materials" | "works" | "consumables" | "tools";
  basis: "area";
  unit: string;
  quantityPerBasis: number;
  unitPrice: number;
  packageSize?: number;
  packageUnit?: string;
  packagePrice?: number;
  purchaseMode?: "raw" | "package";
  purchaseAggregation?: "room" | "project";
  aggregationKey?: string;
  calculationNote?: string;
};

export type FlooringCoveringSnapshotItem = {
  code: FlooringCoveringType;
  title: string;
  materialPricePerM2: number;
  /** Legacy flooring-v1 fallback. In flooring-v2 labor belongs to layout. */
  laborPricePerM2?: number;
  baseWastePercent: number;
  underlayPricePerM2: number;
  adhesivePricePerM2: number;
  primerPricePerM2: number;
  svpPricePerM2: number;
  groutPricePerM2: number;
  toolConsumablesPerM2: number;
  specLines: FlooringPackageSpecLine[];
};

export type FlooringPreparationSnapshotItem = {
  code: FlooringPreparationType;
  title: string;
  laborPricePerM2: number;
  materialPricePerM2: number;
  specLines: FlooringPackageSpecLine[];
};

export type FlooringLayoutSnapshotItem = {
  code: FlooringLayoutType;
  title: string;
  laborPricePerM2?: number;
  laborFactor: number;
  additionalWastePercent: number;
  specLines: FlooringPackageSpecLine[];
};

export type FlooringPlinthSnapshotItem = {
  code: FlooringPlinthType;
  title: string;
  materialPricePerMeter: number;
  laborPricePerMeter: number;
  factor: number;
};

export type FlooringGlobalAddons = {
  thresholdPrice: number;
  demolitionPricePerM2: number;
};

export type FlooringSnapshot = {
  version: string;
  coverings: FlooringCoveringSnapshotItem[];
  preparations: FlooringPreparationSnapshotItem[];
  layouts: FlooringLayoutSnapshotItem[];
  plinthTypes: FlooringPlinthSnapshotItem[];
  globalAddons: FlooringGlobalAddons;
};

export type FlooringCoveringRates = Omit<FlooringCoveringSnapshotItem, "code" | "title" | "specLines">;
export type FlooringPreparationRates = Omit<FlooringPreparationSnapshotItem, "code" | "title" | "specLines">;
export type FlooringLayoutRates = Omit<FlooringLayoutSnapshotItem, "code" | "title" | "specLines">;
export type FlooringPlinthRates = Omit<FlooringPlinthSnapshotItem, "code" | "title">;

export type FlooringSnapshotRates = {
  flooringCoveringRates: Record<FlooringCoveringType, FlooringCoveringRates>;
  flooringPreparationRates: Record<FlooringPreparationType, FlooringPreparationRates>;
  flooringLayoutRates: Record<FlooringLayoutType, FlooringLayoutRates>;
  flooringPlinthRates: Record<FlooringPlinthType, FlooringPlinthRates>;
  flooringExtraRates: FlooringGlobalAddons;
};

const EXPECTED_COVERING_CODES: FlooringCoveringType[] = [
  "porcelain",
  "quartz_vinyl",
  "laminate",
  "carpet",
  "engineered_wood",
];

const EXPECTED_PREPARATION_CODES: FlooringPreparationType[] = [
  "none",
  "primer",
  "self_leveling",
  "waterproofing",
];

const EXPECTED_LAYOUT_CODES: FlooringLayoutType[] = [
  "straight",
  "large_format_straight",
  "glue",
  "floating",
];

const EXPECTED_PLINTH_CODES: FlooringPlinthType[] = ["none", "duropolymer", "painted_mdf"];

const COVERING_RATE_KEYS: (keyof FlooringCoveringRates)[] = [
  "materialPricePerM2",
  "baseWastePercent",
  "underlayPricePerM2",
  "adhesivePricePerM2",
  "primerPricePerM2",
  "svpPricePerM2",
  "groutPricePerM2",
  "toolConsumablesPerM2",
];

const LEGACY_COVERING_RATE_KEYS: (keyof FlooringCoveringRates)[] = [
  ...COVERING_RATE_KEYS,
  "laborPricePerM2",
];

const PREPARATION_RATE_KEYS: (keyof FlooringPreparationRates)[] = ["laborPricePerM2", "materialPricePerM2"];

const LAYOUT_RATE_KEYS: (keyof FlooringLayoutRates)[] = ["laborPricePerM2", "laborFactor", "additionalWastePercent"];

const LEGACY_LAYOUT_RATE_KEYS: (keyof FlooringLayoutRates)[] = ["laborFactor", "additionalWastePercent"];

const PLINTH_RATE_KEYS: (keyof FlooringPlinthRates)[] = [
  "materialPricePerMeter",
  "laborPricePerMeter",
  "factor",
];

const GLOBAL_ADDON_KEYS: (keyof FlooringGlobalAddons)[] = ["thresholdPrice", "demolitionPricePerM2"];

const FORBIDDEN_INTERNAL_KEYS = new Set([
  "id",
  "owner_user_id",
  "note",
  "source",
  "created_at",
  "updated_at",
  "custom_consumables_json",
  "risk_percent",
  "riskPercent",
  "technical_title",
  "work_price",
  "material_price",
  "equipment_price",
  "consumables_price",
  "coefficient",
  "assembly_id",
  "assembly_item_id",
]);

const FLOORING_SPEC_LINE_CATEGORIES = new Set(["materials", "works", "consumables", "tools"]);

const FLOORING_SPEC_LINE_PURCHASE_MODES = new Set(["raw", "package"]);

const FLOORING_SPEC_LINE_PURCHASE_AGGREGATIONS = new Set(["room", "project"]);

const FLOORING_SPEC_LINE_REQUIRED_KEYS = [
  "code",
  "title",
  "category",
  "basis",
  "unit",
  "quantityPerBasis",
  "unitPrice",
] as const;

const NUMERIC_UNIT_PATTERN = /^\d+(?:[,.]\d+)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasNumericRates(section: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => typeof section[key] === "number" && Number.isFinite(section[key]));
}

function findForbiddenKeys(node: unknown, found = new Set<string>()): Set<string> {
  if (node !== null && typeof node === "object") {
    if (Array.isArray(node)) {
      for (const item of node) {
        findForbiddenKeys(item, found);
      }
    } else {
      for (const [key, value] of Object.entries(node)) {
        if (FORBIDDEN_INTERNAL_KEYS.has(key)) {
          found.add(key);
        }
        findForbiddenKeys(value, found);
      }
    }
  }
  return found;
}

function validateSpecLines(
  specLines: unknown,
  arrayName: string,
): { ok: true } | { ok: false; reason: string } {
  if (!Array.isArray(specLines)) {
    return { ok: false, reason: `${arrayName}.specLines must be an array` };
  }

  for (const [index, line] of specLines.entries()) {
    if (!isRecord(line)) {
      return { ok: false, reason: `${arrayName}.specLines[${index}] must be an object` };
    }
    for (const key of FLOORING_SPEC_LINE_REQUIRED_KEYS) {
      if (!(key in line)) {
        return { ok: false, reason: `${arrayName}.specLines[${index}] missing ${key}` };
      }
    }
    if (typeof line.code !== "string" || line.code.length === 0) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].code must be a non-empty string` };
    }
    if (typeof line.title !== "string" || line.title.length === 0) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].title must be a non-empty string` };
    }
    if (typeof line.category !== "string" || !FLOORING_SPEC_LINE_CATEGORIES.has(line.category)) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].category is invalid` };
    }
    if (line.basis !== "area") {
      return { ok: false, reason: `${arrayName}.specLines[${index}].basis must be area` };
    }
    if (typeof line.unit !== "string" || line.unit.length === 0) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].unit must be a non-empty string` };
    }
    if (NUMERIC_UNIT_PATTERN.test(line.unit.trim())) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].unit must be a measurement unit` };
    }
    if (typeof line.quantityPerBasis !== "number" || !Number.isFinite(line.quantityPerBasis)) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].quantityPerBasis must be a finite number` };
    }
    if (typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice)) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].unitPrice must be a finite number` };
    }
    if ("packageSize" in line) {
      if (typeof line.packageSize !== "number" || !Number.isFinite(line.packageSize)) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].packageSize must be a finite number` };
      }
      if (typeof line.packageUnit !== "string" || line.packageUnit.length === 0) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].packageUnit must be a non-empty string` };
      }
    }
    if ("packagePrice" in line) {
      if (typeof line.packagePrice !== "number" || !Number.isFinite(line.packagePrice)) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].packagePrice must be a finite number` };
      }
    }
    if ("purchaseMode" in line) {
      if (typeof line.purchaseMode !== "string" || !FLOORING_SPEC_LINE_PURCHASE_MODES.has(line.purchaseMode)) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].purchaseMode is invalid` };
      }
    }
    if ("purchaseAggregation" in line) {
      if (
        typeof line.purchaseAggregation !== "string" ||
        !FLOORING_SPEC_LINE_PURCHASE_AGGREGATIONS.has(line.purchaseAggregation)
      ) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].purchaseAggregation is invalid` };
      }
    }
    if ("aggregationKey" in line) {
      if (typeof line.aggregationKey !== "string" || line.aggregationKey.length === 0) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].aggregationKey must be a non-empty string` };
      }
    }
    if ("calculationNote" in line) {
      if (typeof line.calculationNote !== "string" || line.calculationNote.length === 0) {
        return { ok: false, reason: `${arrayName}.specLines[${index}].calculationNote must be a non-empty string` };
      }
    }
  }

  return { ok: true };
}

function validateCatalogItems(
  items: unknown,
  arrayName: string,
  rateKeys: readonly string[],
  options: { requireSpecLines?: boolean } = {},
): { ok: true } | { ok: false; reason: string } {
  const { requireSpecLines = false } = options;
  if (!Array.isArray(items)) {
    return { ok: false, reason: `${arrayName} must be an array` };
  }
  if (items.length === 0) {
    return { ok: false, reason: `${arrayName} must contain at least one item` };
  }

  const seenCodes = new Set<string>();

  for (const item of items) {
    if (!isRecord(item)) {
      return { ok: false, reason: `${arrayName} items must be objects` };
    }
    if (typeof item.code !== "string" || item.code.length === 0) {
      return { ok: false, reason: `${arrayName} items must have a non-empty code` };
    }
    if (typeof item.title !== "string" || item.title.length === 0) {
      return { ok: false, reason: `${arrayName} items must have a non-empty title` };
    }
    if (seenCodes.has(item.code)) {
      return { ok: false, reason: `${arrayName} contains duplicate code: ${item.code}` };
    }
    seenCodes.add(item.code);
    if (!hasNumericRates(item, rateKeys)) {
      return { ok: false, reason: `${arrayName} rates must be finite numbers` };
    }
    if (requireSpecLines && !("specLines" in item)) {
      return { ok: false, reason: `${arrayName}[${item.code}] missing required specLines` };
    }
    if ("specLines" in item) {
      const specLinesValidation = validateSpecLines(item.specLines, `${arrayName}[${item.code}]`);
      if (!specLinesValidation.ok) {
        return specLinesValidation;
      }
    }
  }

  return { ok: true };
}

function validateRequiredCodes(
  items: unknown,
  arrayName: string,
  expectedCodes: readonly string[],
): { ok: true } | { ok: false; reason: string } {
  if (!Array.isArray(items)) {
    return { ok: false, reason: `${arrayName} must be an array` };
  }

  const presentCodes = new Set(
    items
      .filter(isRecord)
      .map((item) => item.code)
      .filter((code): code is string => typeof code === "string"),
  );

  for (const code of expectedCodes) {
    if (!presentCodes.has(code)) {
      return { ok: false, reason: `${arrayName} missing required code: ${code}` };
    }
  }

  return { ok: true };
}

function catalogItemsToRecord<T extends { code: string }, K extends keyof T>(
  items: T[],
  rateKeys: readonly K[],
): Record<string, Pick<T, K>> {
  const result: Record<string, Pick<T, K>> = {};

  for (const item of items) {
    const rates = {} as Pick<T, K>;
    for (const key of rateKeys) {
      rates[key] = item[key];
    }
    result[item.code] = rates;
  }

  return result;
}

/**
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateFlooringSnapshot(payload: unknown) {
  if (!isRecord(payload)) {
    return { ok: false as const, reason: "payload must be a non-null object" };
  }
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    return { ok: false as const, reason: "version must be a non-empty string" };
  }

  const isLegacyV1 = payload.version === "flooring-v1";
  const coveringRateKeys = isLegacyV1 ? LEGACY_COVERING_RATE_KEYS : COVERING_RATE_KEYS;
  const layoutRateKeys = isLegacyV1 ? LEGACY_LAYOUT_RATE_KEYS : LAYOUT_RATE_KEYS;
  const requirePackageSpecLines = !isLegacyV1;

  const coveringsValidation = validateCatalogItems(payload.coverings, "coverings", coveringRateKeys, {
    requireSpecLines: requirePackageSpecLines,
  });
  if (!coveringsValidation.ok) {
    return coveringsValidation;
  }

  const preparationsValidation = validateCatalogItems(
    payload.preparations,
    "preparations",
    PREPARATION_RATE_KEYS,
    { requireSpecLines: requirePackageSpecLines },
  );
  if (!preparationsValidation.ok) {
    return preparationsValidation;
  }

  const layoutsValidation = validateCatalogItems(payload.layouts, "layouts", layoutRateKeys, {
    requireSpecLines: requirePackageSpecLines,
  });
  if (!layoutsValidation.ok) {
    return layoutsValidation;
  }

  const plinthTypesValidation = validateCatalogItems(payload.plinthTypes, "plinthTypes", PLINTH_RATE_KEYS);
  if (!plinthTypesValidation.ok) {
    return plinthTypesValidation;
  }

  if (!isRecord(payload.globalAddons)) {
    return { ok: false as const, reason: "globalAddons must be an object" };
  }
  if (!hasNumericRates(payload.globalAddons, GLOBAL_ADDON_KEYS)) {
    return { ok: false as const, reason: "globalAddons rates must be finite numbers" };
  }

  if (isLegacyV1) {
    const requiredCoverings = validateRequiredCodes(payload.coverings, "coverings", EXPECTED_COVERING_CODES);
    if (!requiredCoverings.ok) {
      return requiredCoverings;
    }

    const requiredPreparations = validateRequiredCodes(
      payload.preparations,
      "preparations",
      EXPECTED_PREPARATION_CODES,
    );
    if (!requiredPreparations.ok) {
      return requiredPreparations;
    }

    const requiredLayouts = validateRequiredCodes(payload.layouts, "layouts", EXPECTED_LAYOUT_CODES);
    if (!requiredLayouts.ok) {
      return requiredLayouts;
    }
  }

  const requiredPlinthTypes = validateRequiredCodes(payload.plinthTypes, "plinthTypes", EXPECTED_PLINTH_CODES);
  if (!requiredPlinthTypes.ok) {
    return requiredPlinthTypes;
  }

  const leaked = findForbiddenKeys(payload);
  if (leaked.size > 0) {
    return {
      ok: false as const,
      reason: `forbidden internal keys: ${[...leaked].sort().join(", ")}`,
    };
  }

  return { ok: true as const };
}

export function loadFlooringSnapshot(): FlooringSnapshot {
  const validation = validateFlooringSnapshot(flooringSnapshotData);
  if (!validation.ok) {
    throw new Error(`flooring.snapshot: ${validation.reason}`);
  }

  return flooringSnapshotData as FlooringSnapshot;
}

export function isFlooringLegacyV1(version: string): boolean {
  return version === "flooring-v1";
}

export function isFlooringPackageFirst(version: string): boolean {
  return !isFlooringLegacyV1(version);
}

export function isPackageBackedFlooringCatalogRow<T extends { specLines?: FlooringPackageSpecLine[] }>(
  item: T,
): boolean {
  return Array.isArray(item.specLines) && item.specLines.length > 0;
}

export function getPackageBackedFlooringRows(snapshot: FlooringSnapshot): {
  coverings: FlooringCoveringSnapshotItem[];
  preparations: FlooringPreparationSnapshotItem[];
  layouts: FlooringLayoutSnapshotItem[];
} {
  if (isFlooringLegacyV1(snapshot.version)) {
    return {
      coverings: snapshot.coverings,
      preparations: snapshot.preparations,
      layouts: snapshot.layouts,
    };
  }

  return {
    coverings: snapshot.coverings.filter(isPackageBackedFlooringCatalogRow),
    preparations: snapshot.preparations.filter(isPackageBackedFlooringCatalogRow),
    layouts: snapshot.layouts.filter(isPackageBackedFlooringCatalogRow),
  };
}

function catalogItemsByCode<T extends { code: string }>(items: T[]): Record<string, T> {
  const result: Record<string, T> = {};

  for (const item of items) {
    result[item.code] = item;
  }

  return result;
}

export type FlooringSnapshotCatalog = {
  coverings: Record<string, FlooringCoveringSnapshotItem>;
  preparations: Record<string, FlooringPreparationSnapshotItem>;
  layouts: Record<string, FlooringLayoutSnapshotItem>;
};

export function getFlooringSnapshotCatalog(): FlooringSnapshotCatalog {
  const snapshot = loadFlooringSnapshot();
  const packageBacked = getPackageBackedFlooringRows(snapshot);

  return {
    coverings: catalogItemsByCode(packageBacked.coverings),
    preparations: catalogItemsByCode(packageBacked.preparations),
    layouts: catalogItemsByCode(packageBacked.layouts),
  };
}

export function getFlooringSnapshotRates(): FlooringSnapshotRates {
  const snapshot = loadFlooringSnapshot();
  const isLegacyV1 = isFlooringLegacyV1(snapshot.version);
  const packageBacked = getPackageBackedFlooringRows(snapshot);

  return {
    flooringCoveringRates: catalogItemsToRecord(
      packageBacked.coverings,
      isLegacyV1 ? LEGACY_COVERING_RATE_KEYS : COVERING_RATE_KEYS,
    ) as Record<FlooringCoveringType, FlooringCoveringRates>,
    flooringPreparationRates: catalogItemsToRecord(
      packageBacked.preparations,
      PREPARATION_RATE_KEYS,
    ) as Record<FlooringPreparationType, FlooringPreparationRates>,
    flooringLayoutRates: catalogItemsToRecord(
      packageBacked.layouts,
      isLegacyV1 ? LEGACY_LAYOUT_RATE_KEYS : LAYOUT_RATE_KEYS,
    ) as Record<FlooringLayoutType, FlooringLayoutRates>,
    flooringPlinthRates: catalogItemsToRecord(
      snapshot.plinthTypes,
      PLINTH_RATE_KEYS,
    ) as Record<FlooringPlinthType, FlooringPlinthRates>,
    flooringExtraRates: { ...snapshot.globalAddons },
  };
}
