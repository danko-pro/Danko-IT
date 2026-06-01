import type { Dispatch, SetStateAction } from "react";

import {
  deleteFlooringAssemblyItem,
  deleteFlooringCovering,
  deleteFlooringLayout,
  deleteFlooringPreparation,
  fetchFlooringSnapshot,
  listFlooringCoverings,
  listFlooringLayouts,
  listFlooringPreparations,
} from "./api/flooring-client";
import type {
  FlooringAssemblyItemDto,
  FlooringCoveringDto,
  FlooringLayoutDto,
  FlooringPreparationDto,
  FlooringSnapshotDisplayRow,
  PublicFlooringSnapshotResponse,
} from "./api/flooring-types";

type StateSetter<T> = Dispatch<SetStateAction<T>>;

type DeleteActionsParams = {
  coveringCatalog: FlooringCoveringDto[];
  preparationCatalog: FlooringPreparationDto[];
  layoutCatalog: FlooringLayoutDto[];
  editingAssemblyId: number | null;
  editingCoveringId: number | null;
  editingPreparationId: number | null;
  editingLayoutId: number | null;
  setSnapshot: StateSetter<PublicFlooringSnapshotResponse | null>;
  setCoveringCatalog: StateSetter<FlooringCoveringDto[]>;
  setPreparationCatalog: StateSetter<FlooringPreparationDto[]>;
  setLayoutCatalog: StateSetter<FlooringLayoutDto[]>;
  setError: StateSetter<string | null>;
  setStatusMessage: StateSetter<string | null>;
  setWarningMessage: StateSetter<string | null>;
  reloadAssemblyCatalog: () => Promise<void>;
  cancelAssemblyEdit: () => void;
  cancelCoveringEdit: () => void;
  cancelPreparationEdit: () => void;
  cancelLayoutEdit: () => void;
};

function findCatalogItem<T extends { id: number; title: string }>(
  catalog: T[],
  row: FlooringSnapshotDisplayRow,
): T | undefined {
  return catalog.find((item) => item.title.trim().toLowerCase() === row.title.trim().toLowerCase());
}

export function createFlooringCatalogDeleteActions({
  coveringCatalog,
  preparationCatalog,
  layoutCatalog,
  editingAssemblyId,
  editingCoveringId,
  editingPreparationId,
  editingLayoutId,
  setSnapshot,
  setCoveringCatalog,
  setPreparationCatalog,
  setLayoutCatalog,
  setError,
  setStatusMessage,
  setWarningMessage,
  reloadAssemblyCatalog,
  cancelAssemblyEdit,
  cancelCoveringEdit,
  cancelPreparationEdit,
  cancelLayoutEdit,
}: DeleteActionsParams) {
  async function handleDeleteAssemblyItem(item: FlooringAssemblyItemDto) {
    if (!window.confirm(`Удалить кубик «${item.title}» из библиотеки?`)) {
      return;
    }
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await deleteFlooringAssemblyItem(item.id);
      await reloadAssemblyCatalog();
      if (editingAssemblyId === item.id) {
        cancelAssemblyEdit();
      }
      setStatusMessage(`Кубик «${item.title}» удалён из библиотеки.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить кубик.");
    }
  }

  async function handleDeleteCovering(row: FlooringSnapshotDisplayRow) {
    const item = row.catalogId
      ? coveringCatalog.find((entry) => entry.id === row.catalogId)
      : findCatalogItem(coveringCatalog, row);
    if (!item) {
      setError("Не найдена глобальная запись покрытия для удаления.");
      return;
    }
    if (!window.confirm(`Удалить покрытие «${item.title}» из каталога полов?`)) {
      return;
    }
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await deleteFlooringCovering(item.id);
      const [fresh, freshCatalog] = await Promise.all([fetchFlooringSnapshot(), listFlooringCoverings()]);
      setSnapshot(fresh);
      setCoveringCatalog(freshCatalog);
      if (editingCoveringId === item.id) {
        cancelCoveringEdit();
      }
      setStatusMessage(`Покрытие «${item.title}» удалено из каталога.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить покрытие.");
    }
  }

  async function handleDeletePreparation(row: FlooringSnapshotDisplayRow) {
    const item = row.catalogId
      ? preparationCatalog.find((entry) => entry.id === row.catalogId)
      : findCatalogItem(preparationCatalog, row);
    if (!item) {
      setError("Не найдена глобальная запись подготовки для удаления.");
      return;
    }
    if (!window.confirm(`Удалить подготовку «${item.title}» из каталога полов?`)) {
      return;
    }
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await deleteFlooringPreparation(item.id);
      const [fresh, freshCatalog] = await Promise.all([fetchFlooringSnapshot(), listFlooringPreparations()]);
      setSnapshot(fresh);
      setPreparationCatalog(freshCatalog);
      if (editingPreparationId === item.id) {
        cancelPreparationEdit();
      }
      setStatusMessage(`Подготовка «${item.title}» удалена из каталога.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить подготовку.");
    }
  }

  async function handleDeleteLayout(row: FlooringSnapshotDisplayRow) {
    const item = row.catalogId
      ? layoutCatalog.find((entry) => entry.id === row.catalogId)
      : findCatalogItem(layoutCatalog, row);
    if (!item) {
      setError("Не найдена глобальная запись укладки для удаления.");
      return;
    }
    if (!window.confirm(`Удалить укладку «${item.title}» из каталога полов?`)) {
      return;
    }
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await deleteFlooringLayout(item.id);
      const [fresh, freshCatalog] = await Promise.all([fetchFlooringSnapshot(), listFlooringLayouts()]);
      setSnapshot(fresh);
      setLayoutCatalog(freshCatalog);
      if (editingLayoutId === item.id) {
        cancelLayoutEdit();
      }
      setStatusMessage(`Укладка «${item.title}» удалена из каталога.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить укладку.");
    }
  }

  return {
    handleDeleteAssemblyItem,
    handleDeleteCovering,
    handleDeletePreparation,
    handleDeleteLayout,
  };
}
