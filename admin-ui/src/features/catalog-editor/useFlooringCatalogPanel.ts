import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createFlooringAssemblyItem,
  fetchFlooringSnapshot,
  listFlooringAssemblyItems,
  listFlooringCoverings,
  listFlooringLayouts,
  listFlooringPreparations,
  updateFlooringAssemblyItem,
  updateFlooringCovering,
  updateFlooringLayout,
  updateFlooringPreparation,
} from "./api/flooring-client";
import {
  assemblyItemDraftToPayload,
  attachCatalogIdsToDisplayRows,
  coveringDraftToUpdatePayload,
  dtoToFlooringAssemblyItemDraft,
  dtoToFlooringCoveringDraft,
  dtoToFlooringLayoutDraft,
  dtoToFlooringPreparationDraft,
  layoutDraftToUpdatePayload,
  preparationDraftToUpdatePayload,
  snapshotToDisplayRows,
} from "./api/flooring-mappers";
import type {
  FlooringAssemblyItemDto,
  FlooringCoveringDraft,
  FlooringCoveringDto,
  FlooringLayoutDraft,
  FlooringLayoutDto,
  FlooringPreparationDraft,
  FlooringPreparationDto,
  FlooringSnapshotDisplayRow,
  PublicFlooringSnapshotResponse,
} from "./api/flooring-types";
import {
  createAssemblyLibraryItemFromCatalogItem,
  type CoveringAssemblyAggregates,
  type CoveringAssemblyRow,
  type FlooringAssemblyTarget,
} from "./flooring-assembly";
import { createFlooringCatalogRowFromAssembly } from "./flooring-catalog-assembly-create-row";
import { finalizeFlooringCatalogAssemblyAfterFlatSave } from "./flooring-catalog-assembly-edit-save";
import {
  SNAPSHOT_MAPPING_DELAY_STATUS,
  SNAPSHOT_MISSING_WARNING,
  consumablesSummaryPerM2,
  emptyAssemblyItemDraft,
  emptyCoveringDraft,
  emptyLayoutDraft,
  emptyPreparationDraft,
  filterRows,
  formatMoney,
  formatPercent,
  snapshotHasTitle,
  snapshotRatesMatchRow,
} from "./flooring-catalog-model";
import { createFlooringCatalogDeleteActions } from "./flooring-delete-actions";
import { useFlooringAssemblyEditLoad } from "./useFlooringAssemblyEditLoad";
import { resolveCatalogEditItem } from "./flooring-catalog-row-edit";

export function useFlooringCatalogPanel() {
  const [snapshot, setSnapshot] = useState<PublicFlooringSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [coveringDraft, setCoveringDraft] = useState(emptyCoveringDraft);
  const [preparationDraft, setPreparationDraft] = useState(emptyPreparationDraft);
  const [layoutDraft, setLayoutDraft] = useState(emptyLayoutDraft);
  const [assemblyDraft, setAssemblyDraft] = useState(emptyAssemblyItemDraft);

  const [assemblyCatalog, setAssemblyCatalog] = useState<FlooringAssemblyItemDto[]>([]);
  const [coveringCatalog, setCoveringCatalog] = useState<FlooringCoveringDto[]>([]);
  const [preparationCatalog, setPreparationCatalog] = useState<FlooringPreparationDto[]>([]);
  const [layoutCatalog, setLayoutCatalog] = useState<FlooringLayoutDto[]>([]);

  const [editingCoveringId, setEditingCoveringId] = useState<number | null>(null);
  const [editingPreparationId, setEditingPreparationId] = useState<number | null>(null);
  const [editingLayoutId, setEditingLayoutId] = useState<number | null>(null);
  const [editingAssemblyId, setEditingAssemblyId] = useState<number | null>(null);

  const [creatingAssembly, setCreatingAssembly] = useState(false);
  const [savingCovering, setSavingCovering] = useState(false);
  const [savingPreparation, setSavingPreparation] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [savingAssembly, setSavingAssembly] = useState(false);
  const [assemblyRowsSnapshot, setAssemblyRowsSnapshot] = useState<CoveringAssemblyRow[]>([]);
  const [assemblyTarget, setAssemblyTarget] = useState<FlooringAssemblyTarget>("covering");
  const {
    assemblyResetKey,
    assemblyInitialRows,
    assemblyInitialTitle,
    assemblyLoading,
    assemblyHadOnLoad,
    clearAssemblyEditLoad,
    loadAssemblyForEdit,
  } = useFlooringAssemblyEditLoad();
  const [flooringView, setFlooringView] = useState<"catalog" | "library">("catalog");

  const reloadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarningMessage(null);
    try {
      const [data, coverings, preparations, layouts] = await Promise.all([
        fetchFlooringSnapshot(),
        listFlooringCoverings(),
        listFlooringPreparations(),
        listFlooringLayouts(),
      ]);
      setSnapshot(data);
      setCoveringCatalog(coverings);
      setPreparationCatalog(preparations);
      setLayoutCatalog(layouts);
      try {
        const assemblyItems = await listFlooringAssemblyItems();
        setAssemblyCatalog(assemblyItems);
      } catch (cause) {
        setAssemblyCatalog([]);
        const detail = cause instanceof Error ? cause.message : "неизвестная ошибка";
        setWarningMessage(
          `Библиотека кубиков не загрузилась: ${detail}. Перезапустите backend, если endpoint ещё не поднят.`,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить snapshot полов.");
      setSnapshot(null);
      setAssemblyCatalog([]);
      setCoveringCatalog([]);
      setPreparationCatalog([]);
      setLayoutCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSnapshot();
  }, [reloadSnapshot]);

  const displayRows = useMemo(() => {
    if (!snapshot) return [];
    const rows = snapshotToDisplayRows(snapshot);
    return attachCatalogIdsToDisplayRows(rows, {
      coverings: coveringCatalog,
      preparations: preparationCatalog,
      layouts: layoutCatalog,
    });
  }, [snapshot, coveringCatalog, preparationCatalog, layoutCatalog]);
  const coveringRows = useMemo(() => filterRows(displayRows, "coverings"), [displayRows]);
  const preparationRows = useMemo(() => filterRows(displayRows, "preparations"), [displayRows]);
  const layoutRows = useMemo(() => filterRows(displayRows, "layouts"), [displayRows]);
  const assemblyLibraryItems = useMemo(
    () => assemblyCatalog.map(createAssemblyLibraryItemFromCatalogItem),
    [assemblyCatalog],
  );

  const assemblyCreateDeps = {
    setSnapshot,
    setCoveringCatalog,
    setPreparationCatalog,
    setLayoutCatalog,
    setError,
    setStatusMessage,
    setWarningMessage,
  };

  function createAssemblyTargetRow(
    target: FlooringAssemblyTarget,
    rawTitle: string,
    aggregates: CoveringAssemblyAggregates,
    rows: CoveringAssemblyRow[],
  ) {
    return createFlooringCatalogRowFromAssembly(assemblyCreateDeps, target, rawTitle, aggregates, rows);
  }

  function updateCoveringNumber(field: keyof FlooringCoveringDraft, value: number) {
    setCoveringDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updatePreparationNumber(field: keyof FlooringPreparationDraft, value: number) {
    setPreparationDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateLayoutNumber(field: keyof FlooringLayoutDraft, value: number) {
    setLayoutDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateAssemblyNumber(
    field: "price" | "consumptionPerM2" | "packageSize" | "layerMm" | "sortOrder",
    value: number | null,
  ) {
    if (field === "packageSize" || field === "layerMm") {
      setAssemblyDraft((prev) => ({ ...prev, [field]: value }));
      return;
    }
    setAssemblyDraft((prev) => ({ ...prev, [field]: value ?? 0 }));
  }

  function beginEditAssemblyItem(item: FlooringAssemblyItemDto) {
    setEditingAssemblyId(item.id);
    setAssemblyDraft(dtoToFlooringAssemblyItemDraft(item));
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
  }

  function cancelAssemblyEdit() {
    setEditingAssemblyId(null);
    setAssemblyDraft(emptyAssemblyItemDraft());
  }

  async function reloadAssemblyCatalog() {
    const items = await listFlooringAssemblyItems();
    setAssemblyCatalog(items);
  }

  async function handleCreateAssemblyItem() {
    const title = assemblyDraft.title.trim();
    if (!title) {
      setError("Укажите название кубика.");
      return;
    }
    setCreatingAssembly(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringAssemblyItem(assemblyItemDraftToPayload({ ...assemblyDraft, title }));
      await reloadAssemblyCatalog();
      setStatusMessage(`Кубик «${title}» создан в библиотеке.`);
      setAssemblyDraft(emptyAssemblyItemDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать кубик.");
    } finally {
      setCreatingAssembly(false);
    }
  }

  async function handleUpdateAssemblyItem() {
    if (editingAssemblyId === null) return;
    const title = assemblyDraft.title.trim();
    if (!title) {
      setError("Укажите название кубика.");
      return;
    }
    setSavingAssembly(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await updateFlooringAssemblyItem(editingAssemblyId, assemblyItemDraftToPayload({ ...assemblyDraft, title }));
      await reloadAssemblyCatalog();
      setStatusMessage(`Кубик «${title}» сохранён в библиотеке.`);
      cancelAssemblyEdit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить кубик.");
    } finally {
      setSavingAssembly(false);
    }
  }

  function beginEditCovering(row: FlooringSnapshotDisplayRow) {
    const item = resolveCatalogEditItem(coveringCatalog, row);
    if (!item) {
      setError("Не найдена глобальная запись покрытия для редактирования.");
      return;
    }
    setEditingCoveringId(item.id);
    setCoveringDraft(dtoToFlooringCoveringDraft(item));
    setEditingPreparationId(null);
    setEditingLayoutId(null);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    void loadAssemblyForEdit("covering", item.id, setAssemblyTarget, setWarningMessage);
  }

  function beginEditPreparation(row: FlooringSnapshotDisplayRow) {
    const item = resolveCatalogEditItem(preparationCatalog, row);
    if (!item) {
      setError("Не найдена глобальная запись подготовки для редактирования.");
      return;
    }
    setEditingPreparationId(item.id);
    setPreparationDraft(dtoToFlooringPreparationDraft(item));
    setEditingCoveringId(null);
    setEditingLayoutId(null);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    void loadAssemblyForEdit("preparation", item.id, setAssemblyTarget, setWarningMessage);
  }

  function beginEditLayout(row: FlooringSnapshotDisplayRow) {
    const item = resolveCatalogEditItem(layoutCatalog, row);
    if (!item) {
      setError("Не найдена глобальная запись укладки для редактирования.");
      return;
    }
    setEditingLayoutId(item.id);
    setLayoutDraft(dtoToFlooringLayoutDraft(item));
    setEditingCoveringId(null);
    setEditingPreparationId(null);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    void loadAssemblyForEdit("layout", item.id, setAssemblyTarget, setWarningMessage);
  }

  function cancelCoveringEdit() {
    setEditingCoveringId(null);
    setCoveringDraft(emptyCoveringDraft());
    setAssemblyRowsSnapshot([]);
    clearAssemblyEditLoad();
  }

  function cancelPreparationEdit() {
    setEditingPreparationId(null);
    setPreparationDraft(emptyPreparationDraft());
    setAssemblyRowsSnapshot([]);
    clearAssemblyEditLoad();
  }

  function cancelLayoutEdit() {
    setEditingLayoutId(null);
    setLayoutDraft(emptyLayoutDraft());
    setAssemblyRowsSnapshot([]);
    clearAssemblyEditLoad();
  }

  async function applyFlatSaveAssemblyFeedback(
    target: FlooringAssemblyTarget,
    targetId: number,
    title: string,
    defaultStatusMessage: string,
    defaultWarningMessage?: string | null,
  ) {
    const feedback = await finalizeFlooringCatalogAssemblyAfterFlatSave({
      target,
      assemblyTarget,
      targetId,
      title,
      rows: assemblyRowsSnapshot,
      hadAssemblyOnLoad: assemblyHadOnLoad,
      defaultStatusMessage,
      defaultWarningMessage,
    });
    setStatusMessage(feedback.statusMessage);
    if (feedback.warningMessage) setWarningMessage(feedback.warningMessage);
  }

  async function handleUpdateCovering() {
    if (editingCoveringId === null) return;
    const title = coveringDraft.title.trim();
    if (!title) {
      setError("Укажите название покрытия.");
      return;
    }
    const draftToSave = { ...coveringDraft, title };
    setSavingCovering(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      const before = snapshot;
      await updateFlooringCovering(
        editingCoveringId,
        coveringDraftToUpdatePayload(draftToSave),
      );
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      const freshCatalog = await listFlooringCoverings();
      setCoveringCatalog(freshCatalog);
      const snapshotDelayWarning =
        before && snapshotRatesMatchRow("coverings", title, before, fresh)
          ? SNAPSHOT_MAPPING_DELAY_STATUS
          : null;
      await applyFlatSaveAssemblyFeedback(
        "covering",
        editingCoveringId,
        title,
        `Покрытие «${title}» сохранено.`,
        snapshotDelayWarning,
      );
      cancelCoveringEdit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить покрытие.");
    } finally {
      setSavingCovering(false);
    }
  }

  async function handleUpdatePreparation() {
    if (editingPreparationId === null) return;
    const title = preparationDraft.title.trim();
    if (!title) {
      setError("Укажите название подготовки.");
      return;
    }
    setSavingPreparation(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      const before = snapshot;
      await updateFlooringPreparation(
        editingPreparationId,
        preparationDraftToUpdatePayload({ ...preparationDraft, title }),
      );
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      const freshCatalog = await listFlooringPreparations();
      setPreparationCatalog(freshCatalog);
      const defaultStatus =
        before && snapshotRatesMatchRow("preparations", title, before, fresh)
          ? SNAPSHOT_MAPPING_DELAY_STATUS
          : `Подготовка «${title}» сохранена.`;
      await applyFlatSaveAssemblyFeedback("preparation", editingPreparationId, title, defaultStatus);
      cancelPreparationEdit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить подготовку.");
    } finally {
      setSavingPreparation(false);
    }
  }

  async function handleUpdateLayout() {
    if (editingLayoutId === null) return;
    const title = layoutDraft.title.trim();
    if (!title) {
      setError("Укажите название укладки.");
      return;
    }
    setSavingLayout(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      const before = snapshot;
      await updateFlooringLayout(editingLayoutId, layoutDraftToUpdatePayload({ ...layoutDraft, title }));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      const freshCatalog = await listFlooringLayouts();
      setLayoutCatalog(freshCatalog);
      const defaultStatus =
        before && snapshotRatesMatchRow("layouts", title, before, fresh)
          ? SNAPSHOT_MAPPING_DELAY_STATUS
          : `Укладка «${title}» сохранена.`;
      await applyFlatSaveAssemblyFeedback("layout", editingLayoutId, title, defaultStatus);
      cancelLayoutEdit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить укладку.");
    } finally {
      setSavingLayout(false);
    }
  }

  const {
    handleDeleteAssemblyItem,
    handleDeleteCovering,
    handleDeletePreparation,
    handleDeleteLayout,
  } = createFlooringCatalogDeleteActions({
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
  });

  return {
    snapshot,
    loading,
    error,
    statusMessage,
    warningMessage,
    coveringDraft,
    setCoveringDraft,
    preparationDraft,
    setPreparationDraft,
    layoutDraft,
    setLayoutDraft,
    assemblyDraft,
    setAssemblyDraft,
    assemblyCatalog,
    editingCoveringId,
    editingPreparationId,
    editingLayoutId,
    editingAssemblyId,
    creatingAssembly,
    savingCovering,
    savingPreparation,
    savingLayout,
    savingAssembly,
    assemblyTarget,
    setAssemblyTarget,
    assemblyResetKey,
    assemblyInitialRows,
    assemblyInitialTitle,
    assemblyLoading,
    flooringView,
    setFlooringView,
    coveringRows,
    preparationRows,
    layoutRows,
    assemblyLibraryItems,
    reloadSnapshot,
    createAssemblyTargetRow,
    updateCoveringNumber,
    updatePreparationNumber,
    updateLayoutNumber,
    updateAssemblyNumber,
    beginEditAssemblyItem,
    cancelAssemblyEdit,
    handleCreateAssemblyItem,
    handleUpdateAssemblyItem,
    handleDeleteAssemblyItem,
    beginEditCovering,
    beginEditPreparation,
    beginEditLayout,
    cancelCoveringEdit,
    cancelPreparationEdit,
    cancelLayoutEdit,
    handleUpdateCovering,
    handleUpdatePreparation,
    handleUpdateLayout,
    handleDeleteCovering,
    handleDeletePreparation,
    handleDeleteLayout,
    setAssemblyRowsSnapshot,
    formatMoney,
    formatPercent,
    consumablesSummaryPerM2,
  };
}
