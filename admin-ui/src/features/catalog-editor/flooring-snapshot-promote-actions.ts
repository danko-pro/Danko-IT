import type { Dispatch, SetStateAction } from "react";

import {
  createFlooringCovering,
  createFlooringLayout,
  createFlooringPreparation,
  listFlooringCoverings,
  listFlooringLayouts,
  listFlooringPreparations,
} from "./api/flooring-client";
import type {
  FlooringCoveringDto,
  FlooringLayoutDto,
  FlooringPreparationDto,
  FlooringSnapshotDisplayRow,
  PublicFlooringSnapshotResponse,
} from "./api/flooring-types";
import {
  FLOORING_SNAPSHOT_PROMOTE_STATUS,
  promoteSnapshotRowToCatalog,
} from "./flooring-snapshot-promote";

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type FlooringSnapshotReloadResult = {
  snapshot: PublicFlooringSnapshotResponse;
  coverings: FlooringCoveringDto[];
  preparations: FlooringPreparationDto[];
  layouts: FlooringLayoutDto[];
};

export type FlooringSnapshotRowEditFns = {
  beginEditCovering: (row: FlooringSnapshotDisplayRow, catalog?: FlooringCoveringDto[]) => void;
  beginEditPreparation: (row: FlooringSnapshotDisplayRow, catalog?: FlooringPreparationDto[]) => void;
  beginEditLayout: (row: FlooringSnapshotDisplayRow, catalog?: FlooringLayoutDto[]) => void;
};

export function openSnapshotRowForEdit(
  row: FlooringSnapshotDisplayRow,
  catalogId: number,
  catalogs: Pick<FlooringSnapshotReloadResult, "coverings" | "preparations" | "layouts">,
  edits: FlooringSnapshotRowEditFns,
): void {
  const rowWithId = { ...row, catalogId };
  if (row.section === "coverings") {
    edits.beginEditCovering(rowWithId, catalogs.coverings);
    return;
  }
  if (row.section === "preparations") {
    edits.beginEditPreparation(rowWithId, catalogs.preparations);
    return;
  }
  if (row.section === "layouts") {
    edits.beginEditLayout(rowWithId, catalogs.layouts);
  }
}

export function createFlooringSnapshotPromoteActions(options: {
  setError: StateSetter<string | null>;
  setStatusMessage: StateSetter<string | null>;
  setWarningMessage: StateSetter<string | null>;
  reloadSnapshot: () => Promise<FlooringSnapshotReloadResult | null>;
  edits: FlooringSnapshotRowEditFns;
}) {
  async function promoteSnapshotRowToCatalogHandler(row: FlooringSnapshotDisplayRow): Promise<void> {
    options.setError(null);
    options.setStatusMessage(null);
    options.setWarningMessage(null);
    try {
      const result = await promoteSnapshotRowToCatalog(row, {
        createCovering: createFlooringCovering,
        createPreparation: createFlooringPreparation,
        createLayout: createFlooringLayout,
        reloadCatalog: async () => {
          const [coverings, preparations, layouts] = await Promise.all([
            listFlooringCoverings(),
            listFlooringPreparations(),
            listFlooringLayouts(),
          ]);
          return { coverings, preparations, layouts };
        },
      });

      if (result.action === "error") {
        options.setError(result.message);
        return;
      }

      const fresh = await options.reloadSnapshot();
      if (!fresh) {
        options.setError("Не удалось перезагрузить каталог после создания.");
        return;
      }

      const catalogId = result.action === "edit_existing" ? result.catalogId : result.id;
      openSnapshotRowForEdit(row, catalogId, fresh, options.edits);

      if (result.action === "created") {
        options.setStatusMessage(FLOORING_SNAPSHOT_PROMOTE_STATUS[result.section](result.title));
      }
    } catch (cause) {
      options.setError(cause instanceof Error ? cause.message : "Не удалось добавить строку в каталог.");
    }
  }

  return { promoteSnapshotRowToCatalog: promoteSnapshotRowToCatalogHandler };
}
