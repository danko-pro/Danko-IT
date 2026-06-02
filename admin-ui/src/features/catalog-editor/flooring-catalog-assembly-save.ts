// Сохранение состава каталога полов после создания плоской строки (FS3b).
// Без React — покрывается unit-тестами; create/save инжектируются для тестов.

import { saveFlooringCatalogAssembly } from "./api/flooring-client";
import {
  assemblyRowsToCatalogAssemblyDraftRows,
  catalogAssemblyDraftToPayload,
  normalizeNum,
} from "./api/flooring-mappers";
import type {
  FlooringCatalogAssemblyPayload,
  FlooringCatalogAssemblyTarget,
} from "./api/flooring-types";
import type { PublicFlooringSnapshotResponse } from "./api/flooring-types";
import type { CoveringAssemblyRow, FlooringAssemblyTarget } from "./flooring-assembly";
import { SNAPSHOT_MISSING_WARNING, snapshotHasTitle } from "./flooring-catalog-model";

export type AssemblyTargetSnapshotSection = "coverings" | "preparations" | "layouts";

const FLOORING_CATALOG_ASSEMBLY_VERSION = "flooring-assembly-v1";

export type PersistCatalogAssemblyResult =
  | { status: "success" }
  | { status: "assembly_save_failed"; message: string };

export type SaveFlooringCatalogAssemblyFn = (
  targetKind: FlooringCatalogAssemblyTarget,
  targetId: number,
  payload: FlooringCatalogAssemblyPayload,
) => Promise<unknown>;

export function flooringAssemblyTargetToCatalogTarget(
  target: FlooringAssemblyTarget,
): FlooringCatalogAssemblyTarget {
  return target;
}

export function buildFlooringCatalogAssemblyPayload(
  targetKind: FlooringCatalogAssemblyTarget,
  targetId: number,
  title: string,
  assemblyRows: CoveringAssemblyRow[],
): FlooringCatalogAssemblyPayload {
  return catalogAssemblyDraftToPayload({
    targetKind,
    targetId,
    title,
    version: FLOORING_CATALOG_ASSEMBLY_VERSION,
    rows: assemblyRowsToCatalogAssemblyDraftRows(assemblyRows),
  });
}

export function resolveCreatedCatalogRowId(
  created: { id?: number },
  title: string,
  catalog: { id: number; title: string }[],
): number {
  const id = normalizeNum(created.id);
  if (id > 0) {
    return id;
  }
  const normalized = title.trim().toLowerCase();
  const found = catalog.find((item) => item.title.trim().toLowerCase() === normalized);
  return found ? normalizeNum(found.id) : 0;
}

export async function persistFlooringCatalogAssembly(
  options: {
    target: FlooringAssemblyTarget;
    targetId: number;
    title: string;
    assemblyRows: CoveringAssemblyRow[];
    saveAssembly?: SaveFlooringCatalogAssemblyFn;
  },
): Promise<PersistCatalogAssemblyResult> {
  const targetKind = flooringAssemblyTargetToCatalogTarget(options.target);
  if (options.targetId <= 0) {
    return {
      status: "assembly_save_failed",
      message: "Не удалось определить id строки каталога для сохранения состава.",
    };
  }

  const payload = buildFlooringCatalogAssemblyPayload(
    targetKind,
    options.targetId,
    options.title,
    options.assemblyRows,
  );

  try {
    await (options.saveAssembly ?? saveFlooringCatalogAssembly)(targetKind, options.targetId, payload);
    return { status: "success" };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Не удалось сохранить состав.";
    return { status: "assembly_save_failed", message };
  }
}

export const FLOORING_ASSEMBLY_CREATE_SUCCESS_STATUS: Record<FlooringAssemblyTarget, string> = {
  covering: "Покрытие создано, состав сохранён",
  preparation: "Подготовка создана, состав сохранён",
  layout: "Укладка создана, состав сохранён",
};

export function assemblySaveFailedWarning(
  target: FlooringAssemblyTarget,
  detail?: string,
): string {
  const label =
    target === "covering" ? "Покрытие" : target === "preparation" ? "Подготовка" : "Укладка";
  const base = `${label} создано, но состав не сохранён`;
  return detail ? `${base}: ${detail}` : `${base}.`;
}

export async function finalizeAssemblyTargetRowCreate(options: {
  target: FlooringAssemblyTarget;
  title: string;
  rows: CoveringAssemblyRow[];
  createdDto: { id?: number };
  snapshotSection: AssemblyTargetSnapshotSection;
  reload: () => Promise<{
    snapshot: PublicFlooringSnapshotResponse;
    catalog: { id: number; title: string }[];
  }>;
  setStatusMessage: (message: string | null) => void;
  setWarningMessage: (message: string | null) => void;
  saveAssembly?: SaveFlooringCatalogAssemblyFn;
}): Promise<boolean> {
  const { snapshot: fresh, catalog: freshCatalog } = await options.reload();
  if (!snapshotHasTitle(fresh, options.snapshotSection, options.title)) {
    options.setWarningMessage(SNAPSHOT_MISSING_WARNING);
  }

  const targetId = resolveCreatedCatalogRowId(options.createdDto, options.title, freshCatalog);
  const assemblyResult = await persistFlooringCatalogAssembly({
    target: options.target,
    targetId,
    title: options.title,
    assemblyRows: options.rows,
    saveAssembly: options.saveAssembly,
  });

  if (assemblyResult.status === "success") {
    options.setStatusMessage(FLOORING_ASSEMBLY_CREATE_SUCCESS_STATUS[options.target]);
    return true;
  }

  options.setWarningMessage(assemblySaveFailedWarning(options.target, assemblyResult.message));
  return true;
}
