/**
 * Генератор публичных snapshot (prebuild + dev commands).
 *
 * Режимы (--mode=… или SNAPSHOT_MODE):
 * - auto (default): PUBLIC_SNAPSHOT_BASE_URL / VITE_API_BASE_URL → remote, иначе local seed
 * - local: детерминированный seed (plumbing Python, warm-floor v1, flooring-v2 package seed)
 * - remote: GET /api/public/catalog/{section}/snapshot; base URL из env или --base-url=
 * - strict-remote: как remote, но exit != 0 без base URL или при invalid payload (без seed fallback)
 *
 * ENV:
 * - PUBLIC_SNAPSHOT_BASE_URL — приоритетный base URL для remote
 * - VITE_API_BASE_URL — fallback base URL
 * - SNAPSHOT_MODE — явный режим (local | remote | strict-remote)
 *
 * npm scripts: snapshot:local, snapshot:remote, snapshot:remote:local, snapshot:strict-remote
 *
 * Запуск: `node scripts/generate-snapshot.js` (auto) или `node scripts/generate-snapshot.js --mode=local`.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import flooringV2PackageSeed from "./flooring-v2-package-seed.json" with { type: "json" };

const FORBIDDEN_KEYS = new Set([
  "riskPercent",
  "risk_percent",
  "technical_title",
  "technicalTitle",
  "work_price",
  "material_price",
  "equipment_price",
  "consumables_price",
  "coefficient",
  "source",
  "note",
  "id",
  "owner_user_id",
  "created_at",
  "updated_at",
  "custom_consumables_json",
]);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const adminUiRoot = resolve(scriptDir, "..");
const repoRoot = resolve(adminUiRoot, "..");

const pythonScript = resolve(repoRoot, "tools", "generate_plumbing_snapshot.py");
const outputFile = resolve(
  adminUiRoot,
  "src",
  "features",
  "public",
  "generated",
  "plumbing.snapshot.json",
);
const warmFloorOutputFile = resolve(
  adminUiRoot,
  "src",
  "features",
  "public",
  "generated",
  "warm-floor.snapshot.json",
);
const flooringOutputFile = resolve(
  adminUiRoot,
  "src",
  "features",
  "public",
  "generated",
  "flooring.snapshot.json",
);

/** Детерминированный seed публичных тарифов тёплого пола v1 (нет remote API). */
export const WARM_FLOOR_V1_SEED = {
  version: "warm-floor-v1",
  water: {
    waterLaborRatePerM2: 1600,
    pipeMetersPerM2: 6,
    maxCircuitAreaM2: 15,
    pumpRoomThreshold: 3,
    pumpCircuitThreshold: 4,
    pipePricePerMeter: 168.78,
    chaseLaborPerMeter: 900,
    smallLoopFittingsMaterial: 1501.19,
    smallLoopControlHeadMaterial: 7000,
    smallLoopConnectionLabor: 4600,
    manifoldLabor: 6000,
    manifoldMaterial: 20000,
    pumpLabor: 8000,
    pumpMaterial: 25000,
  },
  electric: {
    electricMatPricePerM2: 2700,
    electricBreakerMaterial: 1500,
    thermostatMaterial: 5500,
    electricWireMaterial: 1000,
    electricInstallationLabor: 7000,
  },
};

/** Package-first local dev seed for flooring-v2 (catalog items include required specLines). */
export const FLOORING_V2_SEED = flooringV2PackageSeed;

/** @returns {unknown} */
export function loadFlooringV2PackageSeedFromPython() {
  const pythonExecutable = process.env.PYTHON ?? "python";
  const generatorScript = resolve(repoRoot, "tools", "generate_flooring_package_seed.py");
  const result = spawnSync(pythonExecutable, [generatorScript], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONPATH: resolve(repoRoot, "src") },
    encoding: "utf-8",
  });

  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(result.stderr || `flooring package seed generator exited with ${result.status}`);
  }

  return JSON.parse(result.stdout);
}

const SNAPSHOT_MODES = new Set(["local", "remote", "strict-remote"]);

/**
 * @param {string[]} [argv]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {"local" | "remote" | "strict-remote" | null}
 */
export function parseSnapshotMode(argv = process.argv.slice(2), env = process.env) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length).trim();
      if (!SNAPSHOT_MODES.has(mode)) {
        throw new Error(`invalid snapshot mode: ${mode}`);
      }
      return /** @type {"local" | "remote" | "strict-remote"} */ (mode);
    }
    if (arg === "--mode") {
      const mode = argv[index + 1]?.trim();
      if (!mode || !SNAPSHOT_MODES.has(mode)) {
        throw new Error(`invalid snapshot mode: ${mode ?? "(missing)"}`);
      }
      return /** @type {"local" | "remote" | "strict-remote"} */ (mode);
    }
  }

  const envMode = env.SNAPSHOT_MODE?.trim();
  if (envMode) {
    if (!SNAPSHOT_MODES.has(envMode)) {
      throw new Error(`invalid SNAPSHOT_MODE: ${envMode}`);
    }
    return /** @type {"local" | "remote" | "strict-remote"} */ (envMode);
  }

  return null;
}

/**
 * @param {string[]} [argv]
 * @returns {string | null}
 */
export function parseSnapshotBaseUrlArg(argv = process.argv.slice(2)) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--base-url=")) {
      const baseUrl = arg.slice("--base-url=".length).trim();
      return baseUrl.length > 0 ? baseUrl : null;
    }
    if (arg === "--base-url") {
      const baseUrl = argv[index + 1]?.trim();
      return baseUrl && baseUrl.length > 0 ? baseUrl : null;
    }
  }
  return null;
}

/** @param {string | null | undefined} baseUrl */
export function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) {
    return null;
  }
  const trimmed = baseUrl.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.replace(/\/+$/, "");
}

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveRemoteBaseUrl(env = process.env) {
  const publicSnapshot = env.PUBLIC_SNAPSHOT_BASE_URL?.trim();
  if (publicSnapshot) {
    return publicSnapshot;
  }
  const viteApi = env.VITE_API_BASE_URL?.trim();
  if (viteApi) {
    return viteApi;
  }
  return null;
}

/**
 * @param {"local" | "remote" | "strict-remote" | null} explicitMode
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string | null} [cliBaseUrl]
 * @returns {{
 *   mode: "local" | "remote";
 *   baseUrl: string | null;
 *   strictRemote: boolean;
 * }}
 */
export function resolveSnapshotRunPlan(
  explicitMode,
  env = process.env,
  cliBaseUrl = null,
) {
  const strictRemote = explicitMode === "strict-remote";
  const cliNormalized = normalizeBaseUrl(cliBaseUrl);
  const envNormalized = normalizeBaseUrl(resolveRemoteBaseUrl(env));
  const baseUrl = cliNormalized ?? envNormalized;

  if (explicitMode === "local") {
    return { mode: "local", baseUrl: null, strictRemote: false };
  }

  if (explicitMode === "remote" || explicitMode === "strict-remote") {
    return {
      mode: "remote",
      baseUrl,
      strictRemote: explicitMode === "strict-remote",
    };
  }

  if (baseUrl) {
    return { mode: "remote", baseUrl, strictRemote: false };
  }

  return { mode: "local", baseUrl: null, strictRemote: false };
}

/** @param {string} baseUrl */
export function buildSnapshotUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return `${normalized}/api/public/catalog/plumbing/snapshot`;
}

/** @param {string} baseUrl */
export function buildWarmFloorSnapshotUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return `${normalized}/api/public/catalog/warm-floor/snapshot`;
}

/** @param {string} baseUrl */
export function buildFlooringSnapshotUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return `${normalized}/api/public/catalog/flooring/snapshot`;
}

/**
 * @param {unknown} node
 * @param {Set<string>} [found]
 * @returns {Set<string>}
 */
export function findForbiddenKeys(node, found = new Set()) {
  if (node !== null && typeof node === "object") {
    if (Array.isArray(node)) {
      for (const item of node) {
        findForbiddenKeys(item, found);
      }
    } else {
      for (const [key, value] of Object.entries(node)) {
        if (FORBIDDEN_KEYS.has(key)) {
          found.add(key);
        }
        findForbiddenKeys(value, found);
      }
    }
  }
  return found;
}

/**
 * @param {unknown} payload
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateSnapshotPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "payload must be a non-null object" };
  }
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    return { ok: false, reason: "version must be a non-empty string" };
  }
  if (!Array.isArray(payload.items)) {
    return { ok: false, reason: "items must be an array" };
  }
  if (!Array.isArray(payload.zones) || payload.zones.length === 0) {
    return { ok: false, reason: "zones must be a non-empty array" };
  }

  const leaked = findForbiddenKeys(payload);
  if (leaked.size > 0) {
    return {
      ok: false,
      reason: `forbidden internal keys: ${[...leaked].sort().join(", ")}`,
    };
  }

  return { ok: true };
}

const WARM_FLOOR_WATER_KEYS = [
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

const WARM_FLOOR_ELECTRIC_KEYS = [
  "electricMatPricePerM2",
  "electricBreakerMaterial",
  "thermostatMaterial",
  "electricWireMaterial",
  "electricInstallationLabor",
];

/**
 * @param {Record<string, unknown>} section
 * @param {string[]} keys
 * @returns {boolean}
 */
function hasNumericRates(section, keys) {
  return keys.every(
    (key) => typeof section[key] === "number" && Number.isFinite(section[key]),
  );
}

/**
 * @param {unknown} payload
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateWarmFloorSnapshotPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "payload must be a non-null object" };
  }
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    return { ok: false, reason: "version must be a non-empty string" };
  }
  if (!payload.water || typeof payload.water !== "object" || Array.isArray(payload.water)) {
    return { ok: false, reason: "water must be an object" };
  }
  if (!payload.electric || typeof payload.electric !== "object" || Array.isArray(payload.electric)) {
    return { ok: false, reason: "electric must be an object" };
  }
  if (!hasNumericRates(payload.water, WARM_FLOOR_WATER_KEYS)) {
    return { ok: false, reason: "water rates must be finite numbers" };
  }
  if (!hasNumericRates(payload.electric, WARM_FLOOR_ELECTRIC_KEYS)) {
    return { ok: false, reason: "electric rates must be finite numbers" };
  }

  return { ok: true };
}

const FLOORING_COVERING_RATE_KEYS = [
  "materialPricePerM2",
  "baseWastePercent",
  "underlayPricePerM2",
  "adhesivePricePerM2",
  "primerPricePerM2",
  "svpPricePerM2",
  "groutPricePerM2",
  "toolConsumablesPerM2",
];

const FLOORING_LEGACY_COVERING_RATE_KEYS = [
  ...FLOORING_COVERING_RATE_KEYS,
  "laborPricePerM2",
];

const FLOORING_PREPARATION_RATE_KEYS = ["laborPricePerM2", "materialPricePerM2"];

const FLOORING_LAYOUT_RATE_KEYS = ["laborPricePerM2", "laborFactor", "additionalWastePercent"];

const FLOORING_LEGACY_LAYOUT_RATE_KEYS = ["laborFactor", "additionalWastePercent"];

const FLOORING_PLINTH_RATE_KEYS = ["materialPricePerMeter", "laborPricePerMeter", "factor"];

const FLOORING_GLOBAL_ADDON_KEYS = ["thresholdPrice", "demolitionPricePerM2"];

const EXPECTED_FLOORING_COVERING_CODES = [
  "porcelain",
  "quartz_vinyl",
  "laminate",
  "carpet",
  "engineered_wood",
];

const EXPECTED_FLOORING_PREPARATION_CODES = ["none", "primer", "self_leveling", "waterproofing"];

const EXPECTED_FLOORING_LAYOUT_CODES = ["straight", "large_format_straight", "glue", "floating"];

const EXPECTED_FLOORING_PLINTH_CODES = ["none", "duropolymer", "painted_mdf"];

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
];

const FLOORING_NUMERIC_UNIT_PATTERN = /^\d+(?:[,.]\d+)?$/;

/**
 * @param {unknown} specLines
 * @param {string} arrayName
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
function validateSpecLines(specLines, arrayName) {
  if (!Array.isArray(specLines)) {
    return { ok: false, reason: `${arrayName}.specLines must be an array` };
  }

  for (const [index, line] of specLines.entries()) {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
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
    if (FLOORING_NUMERIC_UNIT_PATTERN.test(line.unit.trim())) {
      return { ok: false, reason: `${arrayName}.specLines[${index}].unit must be a measurement unit` };
    }
    if (typeof line.quantityPerBasis !== "number" || !Number.isFinite(line.quantityPerBasis)) {
      return {
        ok: false,
        reason: `${arrayName}.specLines[${index}].quantityPerBasis must be a finite number`,
      };
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

/**
 * @param {unknown} items
 * @param {string} arrayName
 * @param {string[]} rateKeys
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
function validateFlooringCatalogItems(items, arrayName, rateKeys, { requireSpecLines = false } = {}) {
  if (!Array.isArray(items)) {
    return { ok: false, reason: `${arrayName} must be an array` };
  }
  if (items.length === 0) {
    return { ok: false, reason: `${arrayName} must contain at least one item` };
  }

  const seenCodes = new Set();

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
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

/**
 * @param {unknown} items
 * @param {string} arrayName
 * @param {string[]} expectedCodes
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
function validateFlooringRequiredCodes(items, arrayName, expectedCodes) {
  if (!Array.isArray(items)) {
    return { ok: false, reason: `${arrayName} must be an array` };
  }

  const presentCodes = new Set(
    items
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .map((item) => item.code)
      .filter((code) => typeof code === "string"),
  );

  for (const code of expectedCodes) {
    if (!presentCodes.has(code)) {
      return { ok: false, reason: `${arrayName} missing required code: ${code}` };
    }
  }

  return { ok: true };
}

/**
 * @param {unknown} payload
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function validateFlooringSnapshotPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "payload must be a non-null object" };
  }
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    return { ok: false, reason: "version must be a non-empty string" };
  }

  const isLegacyV1 = payload.version === "flooring-v1";
  const coveringRateKeys = isLegacyV1 ? FLOORING_LEGACY_COVERING_RATE_KEYS : FLOORING_COVERING_RATE_KEYS;
  const layoutRateKeys = isLegacyV1 ? FLOORING_LEGACY_LAYOUT_RATE_KEYS : FLOORING_LAYOUT_RATE_KEYS;
  const requirePackageSpecLines = !isLegacyV1;

  const coveringsValidation = validateFlooringCatalogItems(
    payload.coverings,
    "coverings",
    coveringRateKeys,
    { requireSpecLines: requirePackageSpecLines },
  );
  if (!coveringsValidation.ok) {
    return coveringsValidation;
  }

  const preparationsValidation = validateFlooringCatalogItems(
    payload.preparations,
    "preparations",
    FLOORING_PREPARATION_RATE_KEYS,
    { requireSpecLines: requirePackageSpecLines },
  );
  if (!preparationsValidation.ok) {
    return preparationsValidation;
  }

  const layoutsValidation = validateFlooringCatalogItems(
    payload.layouts,
    "layouts",
    layoutRateKeys,
    { requireSpecLines: requirePackageSpecLines },
  );
  if (!layoutsValidation.ok) {
    return layoutsValidation;
  }

  const plinthTypesValidation = validateFlooringCatalogItems(
    payload.plinthTypes,
    "plinthTypes",
    FLOORING_PLINTH_RATE_KEYS,
  );
  if (!plinthTypesValidation.ok) {
    return plinthTypesValidation;
  }

  if (!payload.globalAddons || typeof payload.globalAddons !== "object" || Array.isArray(payload.globalAddons)) {
    return { ok: false, reason: "globalAddons must be an object" };
  }
  if (!hasNumericRates(payload.globalAddons, FLOORING_GLOBAL_ADDON_KEYS)) {
    return { ok: false, reason: "globalAddons rates must be finite numbers" };
  }

  if (isLegacyV1) {
    const requiredCoverings = validateFlooringRequiredCodes(
      payload.coverings,
      "coverings",
      EXPECTED_FLOORING_COVERING_CODES,
    );
    if (!requiredCoverings.ok) {
      return requiredCoverings;
    }

    const requiredPreparations = validateFlooringRequiredCodes(
      payload.preparations,
      "preparations",
      EXPECTED_FLOORING_PREPARATION_CODES,
    );
    if (!requiredPreparations.ok) {
      return requiredPreparations;
    }

    const requiredLayouts = validateFlooringRequiredCodes(
      payload.layouts,
      "layouts",
      EXPECTED_FLOORING_LAYOUT_CODES,
    );
    if (!requiredLayouts.ok) {
      return requiredLayouts;
    }
  }

  const requiredPlinthTypes = validateFlooringRequiredCodes(
    payload.plinthTypes,
    "plinthTypes",
    EXPECTED_FLOORING_PLINTH_CODES,
  );
  if (!requiredPlinthTypes.ok) {
    return requiredPlinthTypes;
  }

  const leaked = findForbiddenKeys(payload);
  if (leaked.size > 0) {
    return {
      ok: false,
      reason: `forbidden internal keys: ${[...leaked].sort().join(", ")}`,
    };
  }

  return { ok: true };
}

/** @param {unknown} payload */
function writeWarmFloorSnapshot(payload) {
  const validation = validateWarmFloorSnapshotPayload(payload);
  if (!validation.ok) {
    console.error(
      `[generate-snapshot] failure: invalid warm-floor payload — ${validation.reason}`,
    );
    process.exit(1);
  }

  mkdirSync(dirname(warmFloorOutputFile), { recursive: true });
  const rendered = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(warmFloorOutputFile, rendered, "utf-8");
  console.log(
    `[generate-snapshot] success: warm-floor snapshot written to ${warmFloorOutputFile}`,
  );
}

/** @param {unknown} payload */
function writeFlooringSnapshot(payload) {
  const validation = validateFlooringSnapshotPayload(payload);
  if (!validation.ok) {
    console.error(
      `[generate-snapshot] failure: invalid flooring payload — ${validation.reason}`,
    );
    process.exit(1);
  }

  mkdirSync(dirname(flooringOutputFile), { recursive: true });
  const rendered = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(flooringOutputFile, rendered, "utf-8");
  console.log(
    `[generate-snapshot] success: flooring snapshot written to ${flooringOutputFile}`,
  );
}

/** @param {string} url */
async function fetchRemoteSnapshot(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** @param {unknown} payload */
function writeSnapshot(payload) {
  mkdirSync(dirname(outputFile), { recursive: true });
  const rendered = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(outputFile, rendered, "utf-8");
}

function runLocalPythonGenerator() {
  mkdirSync(dirname(outputFile), { recursive: true });

  const pythonExecutable = process.env.PYTHON ?? "python";
  const result = spawnSync(
    pythonExecutable,
    [pythonScript, "--output", outputFile],
    { stdio: "inherit" },
  );

  if (result.error) {
    console.error(
      `[generate-snapshot] не удалось запустить ${pythonExecutable}:`,
      result.error.message,
    );
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.error(
      `[generate-snapshot] генератор завершился с кодом ${result.status}`,
    );
    process.exit(result.status);
  }

  console.log(`[generate-snapshot] success: local snapshot written to ${outputFile}`);
  writeWarmFloorSnapshot(WARM_FLOOR_V1_SEED);
  writeFlooringSnapshot(FLOORING_V2_SEED);
}

function runLocalSeedMode({ explicit = false } = {}) {
  console.log(
    explicit
      ? "[generate-snapshot] mode: local (explicit seed fallback)"
      : "[generate-snapshot] mode: local (auto — no remote base URL)",
  );
  runLocalPythonGenerator();
}

async function runRemoteMode(baseUrl) {
  const url = buildSnapshotUrl(baseUrl);
  const warmFloorUrl = buildWarmFloorSnapshotUrl(baseUrl);
  const flooringUrl = buildFlooringSnapshotUrl(baseUrl);
  console.log("[generate-snapshot] mode: remote");
  console.log(`[generate-snapshot] URL: ${url}`);
  console.log(`[generate-snapshot] warm-floor URL: ${warmFloorUrl}`);
  console.log(`[generate-snapshot] flooring URL: ${flooringUrl}`);

  try {
    const payload = await fetchRemoteSnapshot(url);
    const validation = validateSnapshotPayload(payload);
    if (!validation.ok) {
      console.error(`[generate-snapshot] failure: invalid payload — ${validation.reason}`);
      process.exit(1);
    }

    writeSnapshot(payload);
    console.log(`[generate-snapshot] success: remote snapshot written to ${outputFile}`);
    const warmFloorPayload = await fetchRemoteSnapshot(warmFloorUrl);
    writeWarmFloorSnapshot(warmFloorPayload);
    const flooringPayload = await fetchRemoteSnapshot(flooringUrl);
    writeFlooringSnapshot(flooringPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[generate-snapshot] failure: remote fetch failed — ${message}`);
    process.exit(1);
  }
}

async function main() {
  let explicitMode = null;
  try {
    explicitMode = parseSnapshotMode();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[generate-snapshot] failure: ${message}`);
    process.exit(1);
  }

  const cliBaseUrl = parseSnapshotBaseUrlArg();
  const plan = resolveSnapshotRunPlan(explicitMode, process.env, cliBaseUrl);

  if (plan.strictRemote && !plan.baseUrl) {
    console.error(
      "[generate-snapshot] failure: strict-remote requires PUBLIC_SNAPSHOT_BASE_URL, VITE_API_BASE_URL, or --base-url=",
    );
    process.exit(1);
  }

  if (explicitMode === "remote" && !plan.baseUrl) {
    console.error(
      "[generate-snapshot] failure: remote mode requires PUBLIC_SNAPSHOT_BASE_URL, VITE_API_BASE_URL, or --base-url=",
    );
    process.exit(1);
  }

  if (plan.mode === "remote" && plan.baseUrl) {
    await runRemoteMode(plan.baseUrl);
    return;
  }

  if (explicitMode === "local") {
    runLocalSeedMode({ explicit: true });
    return;
  }

  runLocalSeedMode({ explicit: false });
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  main();
}
