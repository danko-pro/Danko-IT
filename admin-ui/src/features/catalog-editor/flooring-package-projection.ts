// FP3: assembly rows → flat catalog draft rates (mirrors backend flooring_package_projection).
// Pure helpers — no React, no network.

import {
  aggregateCoveringAssembly,
  applyAggregatesToCoveringDraft,
  calculateAssemblyRowTotal,
  type CoveringAssemblyRow,
  type FlooringAssemblyTarget,
} from "./flooring-assembly";
import type {
  FlooringCoveringDraft,
  FlooringLayoutDraft,
  FlooringPreparationDraft,
} from "./api/flooring-types";

export class FlooringPackageProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlooringPackageProjectionError";
  }
}

export type FlooringPackageFlatProjection = {
  materialPricePerM2?: number;
  laborPricePerM2: number;
  adhesivePricePerM2?: number;
  primerPricePerM2?: number;
  svpPricePerM2?: number;
  groutPricePerM2?: number;
  toolConsumablesPerM2?: number;
};

export type ApplyAssemblyProjectionResult<T> =
  | { status: "unchanged"; draft: T }
  | { status: "projected"; draft: T }
  | { status: "error"; message: string };

export function hasEnabledAssemblyRows(rows: CoveringAssemblyRow[]): boolean {
  return rows.some((row) => row.enabled);
}

function enabledAssemblyRows(rows: CoveringAssemblyRow[]): CoveringAssemblyRow[] {
  return rows.filter((row) => row.enabled);
}

function projectionErrorMessage(cause: unknown): string {
  if (cause instanceof FlooringPackageProjectionError) {
    return cause.message;
  }
  if (cause instanceof Error && cause.message.trim()) {
    return cause.message;
  }
  return "Не удалось рассчитать плоские ставки из состава.";
}

export function validateAssemblyRowsForTarget(
  targetKind: FlooringAssemblyTarget,
  rows: CoveringAssemblyRow[],
): void {
  const enabled = enabledAssemblyRows(rows);
  if (enabled.length === 0) {
    return;
  }

  for (const row of enabled) {
    if (targetKind === "covering") {
      if (row.kind === "work") {
        throw new FlooringPackageProjectionError("Invalid flooring package row kind for covering");
      }
      if (row.kind !== "material" && row.kind !== "consumable" && row.kind !== "tool") {
        throw new FlooringPackageProjectionError("Invalid flooring package row kind for covering");
      }
      continue;
    }

    if (row.kind !== "work") {
      throw new FlooringPackageProjectionError(`Invalid flooring package row kind for ${targetKind}`);
    }
  }
}

export function buildFlooringPackageFlatProjection(
  targetKind: FlooringAssemblyTarget,
  rows: CoveringAssemblyRow[],
): FlooringPackageFlatProjection | null {
  validateAssemblyRowsForTarget(targetKind, rows);
  const enabled = enabledAssemblyRows(rows);
  if (enabled.length === 0) {
    return null;
  }

  if (targetKind === "covering") {
    const aggregates = aggregateCoveringAssembly(rows);
    const flat = aggregates.recommendedFlatFields;
    return {
      materialPricePerM2: flat.materialPricePerM2,
      laborPricePerM2: flat.laborPricePerM2,
      adhesivePricePerM2: flat.adhesivePricePerM2,
      primerPricePerM2: flat.primerPricePerM2,
      svpPricePerM2: flat.svpPricePerM2,
      groutPricePerM2: flat.groutPricePerM2,
      toolConsumablesPerM2: flat.toolConsumablesPerM2,
    };
  }

  const laborPricePerM2 = enabled.reduce((sum, row) => sum + calculateAssemblyRowTotal(row), 0);
  if (targetKind === "preparation") {
    return {
      laborPricePerM2,
      materialPricePerM2: 0,
    };
  }

  return { laborPricePerM2 };
}

export function layoutLaborFactorFromAssemblyRows(rows: CoveringAssemblyRow[]): number {
  const enabledWork = enabledAssemblyRows(rows).filter((row) => row.kind === "work");
  const coefficient = enabledWork.find((row) => row.consumptionPerM2 > 0)?.consumptionPerM2 ?? 1;
  return coefficient > 0 ? coefficient : 1;
}

export function prepareCoveringDraftForCatalogSave(
  draft: FlooringCoveringDraft,
  assemblyRows: CoveringAssemblyRow[],
): ApplyAssemblyProjectionResult<FlooringCoveringDraft> {
  if (!hasEnabledAssemblyRows(assemblyRows)) {
    return { status: "unchanged", draft };
  }

  try {
    validateAssemblyRowsForTarget("covering", assemblyRows);
    const aggregates = aggregateCoveringAssembly(assemblyRows);
    return {
      status: "projected",
      draft: applyAggregatesToCoveringDraft(aggregates, draft),
    };
  } catch (cause) {
    return { status: "error", message: projectionErrorMessage(cause) };
  }
}

export function preparePreparationDraftForCatalogSave(
  draft: FlooringPreparationDraft,
  assemblyRows: CoveringAssemblyRow[],
): ApplyAssemblyProjectionResult<FlooringPreparationDraft> {
  if (!hasEnabledAssemblyRows(assemblyRows)) {
    return { status: "unchanged", draft };
  }

  try {
    const flat = buildFlooringPackageFlatProjection("preparation", assemblyRows);
    if (!flat) {
      return { status: "unchanged", draft };
    }
    return {
      status: "projected",
      draft: {
        ...draft,
        laborPricePerM2: flat.laborPricePerM2,
        materialPricePerM2: flat.materialPricePerM2 ?? 0,
      },
    };
  } catch (cause) {
    return { status: "error", message: projectionErrorMessage(cause) };
  }
}

export function prepareLayoutDraftForCatalogSave(
  draft: FlooringLayoutDraft,
  assemblyRows: CoveringAssemblyRow[],
): ApplyAssemblyProjectionResult<FlooringLayoutDraft> {
  if (!hasEnabledAssemblyRows(assemblyRows)) {
    return { status: "unchanged", draft };
  }

  try {
    const flat = buildFlooringPackageFlatProjection("layout", assemblyRows);
    if (!flat) {
      return { status: "unchanged", draft };
    }
    return {
      status: "projected",
      draft: {
        ...draft,
        laborPricePerM2: flat.laborPricePerM2,
        laborFactor: layoutLaborFactorFromAssemblyRows(assemblyRows),
      },
    };
  } catch (cause) {
    return { status: "error", message: projectionErrorMessage(cause) };
  }
}
