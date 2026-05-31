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
 * Также пишет `generated/warm-floor.snapshot.json` из детерминированного v1 seed
 * (отдельного public API пока нет).
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
  "work_price",
  "material_price",
  "equipment_price",
  "consumables_price",
  "coefficient",
  "source",
  "note",
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
}

async function runRemoteMode(baseUrl) {
  const url = buildSnapshotUrl(baseUrl);
  console.log("[generate-snapshot] mode: remote");
  console.log(`[generate-snapshot] URL: ${url}`);

  try {
    const payload = await fetchRemoteSnapshot(url);
    const validation = validateSnapshotPayload(payload);
    if (!validation.ok) {
      console.error(`[generate-snapshot] failure: invalid payload — ${validation.reason}`);
      process.exit(1);
    }

    writeSnapshot(payload);
    console.log(`[generate-snapshot] success: remote snapshot written to ${outputFile}`);
    writeWarmFloorSnapshot(WARM_FLOOR_V1_SEED);
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
