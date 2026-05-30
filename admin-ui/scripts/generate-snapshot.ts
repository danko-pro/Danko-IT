/**
 * Генератор публичного снапшота сантехники (A7.2) — шаг prebuild.
 *
 * Вызывает backend-генератор (tools/generate_plumbing_snapshot.py), который собирает
 * ПУБЛИЧНЫЙ whitelist-снапшот из ГЛОБАЛЬНОГО каталога (owner=NULL) с уже запечённым
 * резервом, и записывает его в src/features/public/generated/plumbing.snapshot.json.
 *
 * Запуск выполняет Node нативно (стрипит типы): `node scripts/generate-snapshot.ts`.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

mkdirSync(dirname(outputFile), { recursive: true });

const pythonExecutable = process.env.PYTHON ?? "python";

const result = spawnSync(
  pythonExecutable,
  [pythonScript, "--output", outputFile],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`[generate-snapshot] не удалось запустить ${pythonExecutable}:`, result.error.message);
  process.exit(1);
}

if (typeof result.status === "number" && result.status !== 0) {
  console.error(`[generate-snapshot] генератор завершился с кодом ${result.status}`);
  process.exit(result.status);
}

console.log(`[generate-snapshot] публичный снапшот записан: ${outputFile}`);
