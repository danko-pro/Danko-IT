// Загрузка состава каталога полов при редактировании плоской строки (FS3c).
// Без React — покрывается unit-тестами; fetch инжектируется для тестов.

import { fetchFlooringCatalogAssembly } from "./api/flooring-client";
import {
  catalogAssemblyDtoToDraft,
  catalogAssemblyDraftRowsToAssemblyRows,
} from "./api/flooring-mappers";
import type {
  FlooringCatalogAssemblyDraft,
  FlooringCatalogAssemblyTarget,
} from "./api/flooring-types";
import type { CoveringAssemblyRow, FlooringAssemblyTarget } from "./flooring-assembly";
import { flooringAssemblyTargetToCatalogTarget } from "./flooring-catalog-assembly-save";

export type LoadFlooringCatalogAssemblyResult = {
  rows: CoveringAssemblyRow[];
  title: string;
  status: "loaded" | "empty" | "failed";
  error?: string;
};

export type FetchFlooringCatalogAssemblyFn = typeof fetchFlooringCatalogAssembly;

export const FLOORING_ASSEMBLY_LOAD_FAILED_WARNING =
  "Строка открыта, но состав не удалось загрузить";

export function resolveAssemblyRowsForEditor(draft: FlooringCatalogAssemblyDraft): CoveringAssemblyRow[] {
  return catalogAssemblyDraftRowsToAssemblyRows(draft.rows);
}

export function assemblyEditResetKey(target: FlooringAssemblyTarget, targetId: number): string {
  return `${target}-${targetId}`;
}

export async function loadAssemblyForEditorEdit(
  target: FlooringAssemblyTarget,
  targetId: number,
  fetchFn?: FetchFlooringCatalogAssemblyFn,
): Promise<LoadFlooringCatalogAssemblyResult> {
  return loadFlooringCatalogAssemblyForEdit(
    flooringAssemblyTargetToCatalogTarget(target),
    targetId,
    fetchFn,
  );
}

export async function loadFlooringCatalogAssemblyForEdit(
  targetKind: FlooringCatalogAssemblyTarget,
  targetId: number,
  fetchFn?: FetchFlooringCatalogAssemblyFn,
): Promise<LoadFlooringCatalogAssemblyResult> {
  try {
    const dto = await (fetchFn ?? fetchFlooringCatalogAssembly)(targetKind, targetId);
    const draft = catalogAssemblyDtoToDraft(dto);
    const rows = resolveAssemblyRowsForEditor(draft);
    const title = draft.title.trim();
    if (rows.length === 0) {
      return { rows: [], title, status: "empty" };
    }
    return { rows, title, status: "loaded" };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Не удалось загрузить состав.";
    return { rows: [], title: "", status: "failed", error };
  }
}
