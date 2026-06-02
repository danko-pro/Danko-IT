// Сохранение/очистка состава при редактировании плоской строки каталога (FS3d).
// Вызывается после успешного PATCH; без React — покрывается unit-тестами.

import { deleteFlooringCatalogAssembly, saveFlooringCatalogAssembly } from "./api/flooring-client";
import type { FlooringCatalogAssemblyPayload, FlooringCatalogAssemblyTarget } from "./api/flooring-types";
import type { CoveringAssemblyRow, FlooringAssemblyTarget } from "./flooring-assembly";
import { ApiError } from "../../shared/utils";
import {
  buildFlooringCatalogAssemblyPayload,
  flooringAssemblyTargetToCatalogTarget,
  type SaveFlooringCatalogAssemblyFn,
} from "./flooring-catalog-assembly-save";

export type DeleteFlooringCatalogAssemblyFn = (
  targetKind: FlooringCatalogAssemblyTarget,
  targetId: number,
) => Promise<unknown>;

export type AssemblyEditPersistOutcome =
  | { status: "saved" }
  | { status: "cleared" }
  | { status: "skipped" }
  | { status: "failed"; message: string };

export const FLOORING_ASSEMBLY_EDIT_SAVE_FAILED_WARNING =
  "Строка сохранена, но состав не удалось сохранить/очистить";

const FLOORING_EDIT_FLAT_SAVED: Record<FlooringAssemblyTarget, string> = {
  covering: "Покрытие сохранено",
  preparation: "Подготовка сохранена",
  layout: "Укладка сохранена",
};

export function assemblyEditRowsAreEmpty(rows: CoveringAssemblyRow[]): boolean {
  return rows.length === 0;
}

export function isAssemblyDeleteNotFoundError(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 404;
}

export async function deleteFlooringCatalogAssemblyIgnoringNotFound(
  targetKind: FlooringCatalogAssemblyTarget,
  targetId: number,
  deleteAssembly?: DeleteFlooringCatalogAssemblyFn,
): Promise<void> {
  try {
    await (deleteAssembly ?? deleteFlooringCatalogAssembly)(targetKind, targetId);
  } catch (cause) {
    if (isAssemblyDeleteNotFoundError(cause)) {
      return;
    }
    throw cause;
  }
}

export async function persistFlooringCatalogAssemblyOnEdit(options: {
  target: FlooringAssemblyTarget;
  targetId: number;
  title: string;
  rows: CoveringAssemblyRow[];
  hadAssemblyOnLoad: boolean;
  saveAssembly?: SaveFlooringCatalogAssemblyFn;
  deleteAssembly?: DeleteFlooringCatalogAssemblyFn;
}): Promise<AssemblyEditPersistOutcome> {
  const targetKind = flooringAssemblyTargetToCatalogTarget(options.target);
  if (options.targetId <= 0) {
    return { status: "failed", message: "Не удалось определить id строки каталога." };
  }

  if (!assemblyEditRowsAreEmpty(options.rows)) {
    const payload = buildFlooringCatalogAssemblyPayload(
      targetKind,
      options.targetId,
      options.title,
      options.rows,
    );
    try {
      await (options.saveAssembly ?? saveFlooringCatalogAssembly)(targetKind, options.targetId, payload);
      return { status: "saved" };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Не удалось сохранить состав.";
      return { status: "failed", message };
    }
  }

  if (!options.hadAssemblyOnLoad) {
    return { status: "skipped" };
  }

  try {
    await deleteFlooringCatalogAssemblyIgnoringNotFound(
      targetKind,
      options.targetId,
      options.deleteAssembly,
    );
    return { status: "cleared" };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Не удалось очистить состав.";
    return { status: "failed", message };
  }
}

export async function finalizeFlooringCatalogAssemblyAfterFlatSave(options: {
  target: FlooringAssemblyTarget;
  assemblyTarget: FlooringAssemblyTarget;
  targetId: number;
  title: string;
  rows: CoveringAssemblyRow[];
  hadAssemblyOnLoad: boolean;
  defaultStatusMessage: string;
  defaultWarningMessage?: string | null;
  saveAssembly?: SaveFlooringCatalogAssemblyFn;
  deleteAssembly?: DeleteFlooringCatalogAssemblyFn;
}): Promise<{ statusMessage: string | null; warningMessage: string | null }> {
  if (options.assemblyTarget !== options.target) {
    return {
      statusMessage: options.defaultStatusMessage,
      warningMessage: options.defaultWarningMessage ?? null,
    };
  }

  const outcome = await persistFlooringCatalogAssemblyOnEdit({
    target: options.target,
    targetId: options.targetId,
    title: options.title,
    rows: options.rows,
    hadAssemblyOnLoad: options.hadAssemblyOnLoad,
    saveAssembly: options.saveAssembly,
    deleteAssembly: options.deleteAssembly,
  });
  const feedback = formatAssemblyEditPersistFeedback(options.target, outcome);
  return {
    statusMessage: feedback.statusMessage ?? (feedback.warningMessage ? null : options.defaultStatusMessage),
    warningMessage: feedback.warningMessage ?? options.defaultWarningMessage ?? null,
  };
}

export function formatAssemblyEditPersistFeedback(
  target: FlooringAssemblyTarget,
  outcome: AssemblyEditPersistOutcome,
): { statusMessage: string | null; warningMessage: string | null } {
  const flat = FLOORING_EDIT_FLAT_SAVED[target];
  if (outcome.status === "saved") {
    return { statusMessage: `${flat}, состав сохранён`, warningMessage: null };
  }
  if (outcome.status === "cleared") {
    return { statusMessage: `${flat}, состав очищен`, warningMessage: null };
  }
  if (outcome.status === "skipped") {
    return { statusMessage: null, warningMessage: null };
  }
  return {
    statusMessage: null,
    warningMessage: FLOORING_ASSEMBLY_EDIT_SAVE_FAILED_WARNING,
  };
}

/** @internal — для тестов payload PUT */
export function buildEditAssemblyPayload(
  target: FlooringAssemblyTarget,
  targetId: number,
  title: string,
  rows: CoveringAssemblyRow[],
): FlooringCatalogAssemblyPayload {
  return buildFlooringCatalogAssemblyPayload(
    flooringAssemblyTargetToCatalogTarget(target),
    targetId,
    title,
    rows,
  );
}
