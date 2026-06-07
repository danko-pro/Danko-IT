import {
  createFlooringCovering,
  createFlooringLayout,
  createFlooringPreparation,
  fetchFlooringSnapshot,
  listFlooringCoverings,
  listFlooringLayouts,
  listFlooringPreparations,
} from "./api/flooring-client";
import {
  coveringDraftToPayload,
  layoutDraftToPayload,
  preparationDraftToPayload,
} from "./api/flooring-mappers";
import type {
  FlooringCoveringDto,
  FlooringLayoutDto,
  FlooringPreparationDto,
  PublicFlooringSnapshotResponse,
} from "./api/flooring-types";
import type { CoveringAssemblyAggregates, CoveringAssemblyRow, FlooringAssemblyTarget } from "./flooring-assembly";
import {
  prepareCoveringDraftForCatalogSave,
  prepareLayoutDraftForCatalogSave,
  preparePreparationDraftForCatalogSave,
} from "./flooring-package-projection";
import {
  emptyCoveringDraft,
  emptyLayoutDraft,
  emptyPreparationDraft,
  getAssemblyDefaultTitle,
} from "./flooring-catalog-model";
import {
  finalizeAssemblyTargetRowCreate,
  type AssemblyTargetSnapshotSection,
} from "./flooring-catalog-assembly-save";

const ASSEMBLY_TARGET_CREATE_ERRORS: Record<FlooringAssemblyTarget, string> = {
  covering: "Не удалось создать покрытие из сборки.",
  preparation: "Не удалось создать подготовку из сборки.",
  layout: "Не удалось создать укладку из сборки.",
};

function assemblyTargetSnapshotSection(target: FlooringAssemblyTarget): AssemblyTargetSnapshotSection {
  if (target === "covering") return "coverings";
  if (target === "preparation") return "preparations";
  return "layouts";
}

export type FlooringCatalogAssemblyCreateRowDeps = {
  setSnapshot: (snapshot: PublicFlooringSnapshotResponse) => void;
  setCoveringCatalog: (items: FlooringCoveringDto[]) => void;
  setPreparationCatalog: (items: FlooringPreparationDto[]) => void;
  setLayoutCatalog: (items: FlooringLayoutDto[]) => void;
  setError: (message: string | null) => void;
  setStatusMessage: (message: string | null) => void;
  setWarningMessage: (message: string | null) => void;
};

async function reloadAssemblyTargetCatalogPanel(
  target: FlooringAssemblyTarget,
  deps: FlooringCatalogAssemblyCreateRowDeps,
) {
  const snapshot = await fetchFlooringSnapshot();
  if (target === "covering") {
    const catalog = await listFlooringCoverings();
    deps.setSnapshot(snapshot);
    deps.setCoveringCatalog(catalog);
    return { snapshot, catalog };
  }
  if (target === "preparation") {
    const catalog = await listFlooringPreparations();
    deps.setSnapshot(snapshot);
    deps.setPreparationCatalog(catalog);
    return { snapshot, catalog };
  }
  const catalog = await listFlooringLayouts();
  deps.setSnapshot(snapshot);
  deps.setLayoutCatalog(catalog);
  return { snapshot, catalog };
}

export async function createFlooringCatalogRowFromAssembly(
  deps: FlooringCatalogAssemblyCreateRowDeps,
  target: FlooringAssemblyTarget,
  rawTitle: string,
  _aggregates: CoveringAssemblyAggregates,
  rows: CoveringAssemblyRow[],
): Promise<boolean> {
  const title = rawTitle.trim() || getAssemblyDefaultTitle(rows);
  if (!title) {
    deps.setError("Укажите название строки каталога.");
    return false;
  }
  if (rows.filter((row) => row.enabled).length === 0) {
    deps.setError("Добавьте хотя бы одну строку сборки.");
    return false;
  }
  deps.setError(null);
  deps.setStatusMessage(null);
  deps.setWarningMessage(null);

  try {
    let createdDto: { id?: number };
    if (target === "covering") {
      const prepared = prepareCoveringDraftForCatalogSave({ ...emptyCoveringDraft(), title }, rows);
      if (prepared.status === "error") {
        deps.setError(prepared.message);
        return false;
      }
      createdDto = await createFlooringCovering(coveringDraftToPayload(prepared.draft));
    } else if (target === "preparation") {
      const prepared = preparePreparationDraftForCatalogSave({ ...emptyPreparationDraft(), title }, rows);
      if (prepared.status === "error") {
        deps.setError(prepared.message);
        return false;
      }
      createdDto = await createFlooringPreparation(preparationDraftToPayload(prepared.draft));
    } else {
      const prepared = prepareLayoutDraftForCatalogSave(
        { ...emptyLayoutDraft(), title, additionalWastePercent: 0 },
        rows,
      );
      if (prepared.status === "error") {
        deps.setError(prepared.message);
        return false;
      }
      createdDto = await createFlooringLayout(layoutDraftToPayload(prepared.draft));
    }

    return await finalizeAssemblyTargetRowCreate({
      target,
      title,
      rows,
      createdDto,
      snapshotSection: assemblyTargetSnapshotSection(target),
      reload: () => reloadAssemblyTargetCatalogPanel(target, deps),
      setStatusMessage: deps.setStatusMessage,
      setWarningMessage: deps.setWarningMessage,
    });
  } catch (cause) {
    deps.setError(cause instanceof Error ? cause.message : ASSEMBLY_TARGET_CREATE_ERRORS[target]);
    return false;
  }
}
