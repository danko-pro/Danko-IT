/**
 * Генератор публичного снапшота сантехники (A7.2) — шаг prebuild.
 *
 * Remote mode (Render/production): если задан PUBLIC_SNAPSHOT_BASE_URL или
 * VITE_API_BASE_URL — GET /api/public/catalog/plumbing/snapshot, валидация,
 * запись в src/features/public/generated/plumbing.snapshot.json.
 * При ошибке fetch или невалидном payload — exit != 0 (без fallback на Python).
 *
 * Local/dev mode (env не задан): Python-генератор (tools/generate_plumbing_snapshot.py)
 * с детерминированным seed-fallback.
 *
 * Также пишет `generated/warm-floor.snapshot.json`:
 * - remote mode: GET /api/public/catalog/warm-floor/snapshot;
 * - local/dev mode: детерминированный v1 seed fallback.
 *
 * Также пишет `generated/flooring.snapshot.json`:
 * - remote mode: GET /api/public/catalog/flooring/snapshot;
 * - local/dev mode: детерминированный FLOORING_V1_SEED fallback.
 *
 * Запуск: `node scripts/generate-snapshot.js`.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

/** Детерминированный seed публичных тарифов полов v1 (парити F1 / public-estimate-flooring.ts). */
export const FLOORING_V1_SEED = {
  version: "flooring-v1",
  coverings: [
    {
      code: "porcelain",
      title: "Керамогранит",
      materialPricePerM2: 2900,
      laborPricePerM2: 2000,
      baseWastePercent: 10,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 450,
      primerPricePerM2: 25,
      svpPricePerM2: 120,
      groutPricePerM2: 90,
      toolConsumablesPerM2: 40,
    },
    {
      code: "quartz_vinyl",
      title: "Кварцвинил",
      materialPricePerM2: 1700,
      laborPricePerM2: 800,
      baseWastePercent: 5,
      underlayPricePerM2: 220,
      adhesivePricePerM2: 0,
      primerPricePerM2: 25,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 80,
    },
    {
      code: "laminate",
      title: "Ламинат",
      materialPricePerM2: 930,
      laborPricePerM2: 1000,
      baseWastePercent: 10,
      underlayPricePerM2: 220,
      adhesivePricePerM2: 0,
      primerPricePerM2: 25,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 40,
    },
    {
      code: "carpet",
      title: "Ковролин",
      materialPricePerM2: 1500,
      laborPricePerM2: 900,
      baseWastePercent: 7,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 250,
      primerPricePerM2: 25,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 40,
    },
    {
      code: "engineered_wood",
      title: "Инженерная доска",
      materialPricePerM2: 6000,
      laborPricePerM2: 2500,
      baseWastePercent: 10,
      underlayPricePerM2: 0,
      adhesivePricePerM2: 900,
      primerPricePerM2: 120,
      svpPricePerM2: 0,
      groutPricePerM2: 0,
      toolConsumablesPerM2: 120,
    },
  ],
  preparations: [
    {
      code: "none",
      title: "Без подготовки",
      laborPricePerM2: 300,
      materialPricePerM2: 100,
    },
    {
      code: "primer",
      title: "Грунтование",
      laborPricePerM2: 250,
      materialPricePerM2: 120,
    },
    {
      code: "self_leveling",
      title: "Наливной пол",
      laborPricePerM2: 650,
      materialPricePerM2: 120,
    },
    {
      code: "waterproofing",
      title: "Гидроизоляция",
      laborPricePerM2: 300,
      materialPricePerM2: 80,
    },
  ],
  layouts: [
    {
      code: "straight",
      title: "Прямая",
      laborFactor: 1.1,
      additionalWastePercent: 5,
    },
    {
      code: "large_format_straight",
      title: "Крупный формат",
      laborFactor: 1.2,
      additionalWastePercent: 10,
    },
    {
      code: "glue",
      title: "Клеевая",
      laborFactor: 1.25,
      additionalWastePercent: 5,
    },
    {
      code: "floating",
      title: "Плавающая",
      laborFactor: 1,
      additionalWastePercent: 3,
    },
  ],
  plinthTypes: [
    {
      code: "none",
      title: "Без плинтуса",
      materialPricePerMeter: 0,
      laborPricePerMeter: 0,
      factor: 1,
    },
    {
      code: "duropolymer",
      title: "Дюрополимерный",
      materialPricePerMeter: 450,
      laborPricePerMeter: 450,
      factor: 1,
    },
    {
      code: "painted_mdf",
      title: "МДФ окрашенный",
      materialPricePerMeter: 650,
      laborPricePerMeter: 500,
      factor: 1,
    },
  ],
  globalAddons: {
    thresholdPrice: 900,
    demolitionPricePerM2: 150,
  },
};

/** @returns {string | null} */
export function resolveRemoteBaseUrl() {
  const publicSnapshot = process.env.PUBLIC_SNAPSHOT_BASE_URL?.trim();
  if (publicSnapshot) {
    return publicSnapshot;
  }
  const viteApi = process.env.VITE_API_BASE_URL?.trim();
  if (viteApi) {
    return viteApi;
  }
  return null;
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
  "laborPricePerM2",
  "baseWastePercent",
  "underlayPricePerM2",
  "adhesivePricePerM2",
  "primerPricePerM2",
  "svpPricePerM2",
  "groutPricePerM2",
  "toolConsumablesPerM2",
];

const FLOORING_PREPARATION_RATE_KEYS = ["laborPricePerM2", "materialPricePerM2"];

const FLOORING_LAYOUT_RATE_KEYS = ["laborFactor", "additionalWastePercent"];

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

/**
 * @param {unknown} items
 * @param {string} arrayName
 * @param {string[]} rateKeys
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
function validateFlooringCatalogItems(items, arrayName, rateKeys) {
  if (!Array.isArray(items)) {
    return { ok: false, reason: `${arrayName} must be an array` };
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

  const coveringsValidation = validateFlooringCatalogItems(
    payload.coverings,
    "coverings",
    FLOORING_COVERING_RATE_KEYS,
  );
  if (!coveringsValidation.ok) {
    return coveringsValidation;
  }

  const preparationsValidation = validateFlooringCatalogItems(
    payload.preparations,
    "preparations",
    FLOORING_PREPARATION_RATE_KEYS,
  );
  if (!preparationsValidation.ok) {
    return preparationsValidation;
  }

  const layoutsValidation = validateFlooringCatalogItems(
    payload.layouts,
    "layouts",
    FLOORING_LAYOUT_RATE_KEYS,
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
  writeFlooringSnapshot(FLOORING_V1_SEED);
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
  const baseUrl = resolveRemoteBaseUrl();
  if (baseUrl) {
    await runRemoteMode(baseUrl);
    return;
  }

  console.log("[generate-snapshot] mode: local (Python seed fallback)");
  runLocalPythonGenerator();
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  main();
}
