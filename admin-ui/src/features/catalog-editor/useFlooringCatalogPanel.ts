import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createFlooringAssemblyItem,
  createFlooringCovering,
  createFlooringLayout,
  createFlooringPreparation,
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
  coveringDraftToPayload,
  coveringDraftToUpdatePayload,
  dtoToFlooringAssemblyItemDraft,
  dtoToFlooringCoveringDraft,
  dtoToFlooringLayoutDraft,
  dtoToFlooringPreparationDraft,
  layoutDraftToPayload,
  layoutDraftToUpdatePayload,
  normalizeNum,
  preparationDraftToPayload,
  preparationDraftToUpdatePayload,
  snapshotToDisplayRows,
} from "./api/flooring-mappers";
import type {
  FlooringAssemblyItemDraft,
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
  applyAggregatesToCoveringDraft,
  createAssemblyLibraryItemFromCatalogItem,
  formatCoveringSaveFeedback,
  type CoveringAssemblyAggregates,
  type CoveringAssemblyRow,
  type FlooringAssemblyTarget,
} from "./flooring-assembly";

const SNAPSHOT_MISSING_WARNING =
  "Позиция создана в БД. В public snapshot она появится после backend mapping/F5c/F6.";

const SNAPSHOT_MAPPING_DELAY_STATUS =
  "Изменение сохранено в БД. Public snapshot обновится после reload/build, если строка входит в public mapping.";

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("ru-RU")}%`;
}

function consumablesSummaryPerM2(rates: Record<string, number>): string {
  const total =
    normalizeNum(rates.underlayPricePerM2) +
    normalizeNum(rates.adhesivePricePerM2) +
    normalizeNum(rates.primerPricePerM2) +
    normalizeNum(rates.svpPricePerM2) +
    normalizeNum(rates.groutPricePerM2) +
    normalizeNum(rates.toolConsumablesPerM2);
  return `${formatMoney(total)} ₽/м²`;
}

function filterRows(
  rows: FlooringSnapshotDisplayRow[],
  section: FlooringSnapshotDisplayRow["section"],
): FlooringSnapshotDisplayRow[] {
  return rows.filter((row) => row.section === section);
}

function emptyCoveringDraft(): FlooringCoveringDraft {
  return {
    id: 0,
    title: "",
    materialPricePerM2: 0,
    laborPricePerM2: 0,
    baseWastePercent: 0,
    underlayMode: "none",
    underlayConsumptionPerM2: 0,
    glueConsumptionPerM2: 0,
    glueUnit: "kg",
    gluePricePerUnit: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    svpConsumptionPerM2: 0,
    svpUnit: "pcs",
    svpPricePerUnit: 0,
    groutConsumptionPerM2: 0,
    groutUnit: "kg",
    groutPricePerUnit: 0,
    customConsumables: [],
    needsPlinth: true,
    instrumentPricePerM2: 0,
    note: "",
  };
}

function emptyPreparationDraft(): FlooringPreparationDraft {
  return {
    id: 0,
    title: "",
    laborPricePerM2: 0,
    materialPricePerM2: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    note: "",
  };
}

function emptyLayoutDraft(): FlooringLayoutDraft {
  return {
    id: 0,
    title: "",
    laborFactor: 1,
    additionalWastePercent: 0,
    note: "",
  };
}

function emptyAssemblyItemDraft(): FlooringAssemblyItemDraft {
  return {
    id: 0,
    sourceCode: "",
    section: "consumable",
    title: "",
    kind: "consumable",
    formula: "unit_consumption",
    unit: "pcs",
    price: 0,
    consumptionPerM2: 0,
    packageSize: null,
    layerMm: null,
    note: "",
    sortOrder: 100,
  };
}

function snapshotHasTitle(
  snapshot: PublicFlooringSnapshotResponse,
  section: "coverings" | "preparations" | "layouts",
  title: string,
): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  const list =
    section === "coverings"
      ? snapshot.coverings
      : section === "preparations"
        ? snapshot.preparations
        : snapshot.layouts;
  return list.some((item) => item.title.trim().toLowerCase() === normalized);
}

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
  const [assemblyRowsCount, setAssemblyRowsCount] = useState(0);
  const [assemblyTarget, setAssemblyTarget] = useState<FlooringAssemblyTarget>("covering");
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

  function getAssemblyDefaultTitle(rows: CoveringAssemblyRow[]): string {
    const enabledRows = rows.filter((row) => row.enabled);
    return (
      enabledRows.find((row) => row.kind === "material")?.title.trim() ||
      enabledRows.find((row) => row.kind === "work")?.title.trim() ||
      enabledRows[0]?.title.trim() ||
      ""
    );
  }

  async function createAssemblyTargetRow(
    target: FlooringAssemblyTarget,
    rawTitle: string,
    aggregates: CoveringAssemblyAggregates,
    rows: CoveringAssemblyRow[],
  ): Promise<boolean> {
    const title = rawTitle.trim() || getAssemblyDefaultTitle(rows);
    if (!title) {
      setError("Укажите название строки каталога.");
      return false;
    }
    if (rows.filter((row) => row.enabled).length === 0) {
      setError("Добавьте хотя бы одну строку сборки.");
      return false;
    }
    if (target !== "covering" && rows.some((row) => row.enabled && row.kind !== "work")) {
      setError("Для подготовки и укладки можно использовать только рабочие строки.");
      return false;
    }

    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);

    if (target === "covering") {
      try {
        const draft = applyAggregatesToCoveringDraft(aggregates, {
          ...emptyCoveringDraft(),
          title,
        });
        await createFlooringCovering(coveringDraftToPayload(draft));
        const [fresh, freshCatalog] = await Promise.all([fetchFlooringSnapshot(), listFlooringCoverings()]);
        setSnapshot(fresh);
        setCoveringCatalog(freshCatalog);
        if (!snapshotHasTitle(fresh, "coverings", title)) {
          setWarningMessage(SNAPSHOT_MISSING_WARNING);
        }
        setStatusMessage(`Покрытие «${title}» создано из сборки.`);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Не удалось создать покрытие из сборки.");
        return false;
      }
    }

    if (target === "preparation") {
      try {
        await createFlooringPreparation(
          preparationDraftToPayload({
            ...emptyPreparationDraft(),
            title,
            laborPricePerM2: aggregates.worksPerM2,
            materialPricePerM2: 0,
          }),
        );
        const [fresh, freshCatalog] = await Promise.all([fetchFlooringSnapshot(), listFlooringPreparations()]);
        setSnapshot(fresh);
        setPreparationCatalog(freshCatalog);
        if (!snapshotHasTitle(fresh, "preparations", title)) {
          setWarningMessage(SNAPSHOT_MISSING_WARNING);
        }
        setStatusMessage(`Подготовка «${title}» создана из рабочей строки.`);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Не удалось создать подготовку из сборки.");
        return false;
      }
    }

    const enabledRows = rows.filter((row) => row.enabled && row.kind === "work");
    const coefficient = enabledRows.find((row) => row.consumptionPerM2 > 0)?.consumptionPerM2 ?? 1;
    try {
      await createFlooringLayout(
        layoutDraftToPayload({
          ...emptyLayoutDraft(),
          title,
          laborFactor: coefficient,
          additionalWastePercent: 0,
        }),
      );
      const [fresh, freshCatalog] = await Promise.all([fetchFlooringSnapshot(), listFlooringLayouts()]);
      setSnapshot(fresh);
      setLayoutCatalog(freshCatalog);
      if (!snapshotHasTitle(fresh, "layouts", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
      }
      setStatusMessage(`Укладка «${title}» создана из рабочей строки. По текущему snapshot-контракту сохраняется коэффициент ${coefficient}.`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать укладку из сборки.");
      return false;
    }
  }

  function updateCoveringNumber(field: keyof FlooringCoveringDraft, value: string) {
    setCoveringDraft((prev) => ({ ...prev, [field]: normalizeNum(value) }));
  }

  function updatePreparationNumber(field: keyof FlooringPreparationDraft, value: string) {
    setPreparationDraft((prev) => ({ ...prev, [field]: normalizeNum(value) }));
  }

  function updateLayoutNumber(field: keyof FlooringLayoutDraft, value: string) {
    setLayoutDraft((prev) => ({ ...prev, [field]: normalizeNum(value) }));
  }

  function updateAssemblyNumber(
    field: "price" | "consumptionPerM2" | "packageSize" | "layerMm" | "sortOrder",
    value: string,
  ) {
    setAssemblyDraft((prev) => ({ ...prev, [field]: value === "" ? null : normalizeNum(value) }));
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

  function findCatalogItem<T extends { id: number; title: string }>(
    catalog: T[],
    row: FlooringSnapshotDisplayRow,
  ): T | undefined {
    return catalog.find((item) => item.title.trim().toLowerCase() === row.title.trim().toLowerCase());
  }

  function beginEditCovering(row: FlooringSnapshotDisplayRow) {
    const item = row.catalogId
      ? coveringCatalog.find((entry) => entry.id === row.catalogId)
      : findCatalogItem(coveringCatalog, row);
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
  }

  function beginEditPreparation(row: FlooringSnapshotDisplayRow) {
    const item = row.catalogId
      ? preparationCatalog.find((entry) => entry.id === row.catalogId)
      : findCatalogItem(preparationCatalog, row);
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
  }

  function beginEditLayout(row: FlooringSnapshotDisplayRow) {
    const item = row.catalogId
      ? layoutCatalog.find((entry) => entry.id === row.catalogId)
      : findCatalogItem(layoutCatalog, row);
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
  }

  function cancelCoveringEdit() {
    setEditingCoveringId(null);
    setCoveringDraft(emptyCoveringDraft());
  }

  function cancelPreparationEdit() {
    setEditingPreparationId(null);
    setPreparationDraft(emptyPreparationDraft());
  }

  function cancelLayoutEdit() {
    setEditingLayoutId(null);
    setLayoutDraft(emptyLayoutDraft());
  }

  function snapshotRatesMatchRow(
    section: "coverings" | "preparations" | "layouts",
    title: string,
    before: PublicFlooringSnapshotResponse,
    after: PublicFlooringSnapshotResponse,
  ): boolean {
    const normalized = title.trim().toLowerCase();
    const list =
      section === "coverings"
        ? { before: before.coverings, after: after.coverings }
        : section === "preparations"
          ? { before: before.preparations, after: after.preparations }
          : { before: before.layouts, after: after.layouts };
    const prev = list.before.find((item) => item.title.trim().toLowerCase() === normalized);
    const next = list.after.find((item) => item.title.trim().toLowerCase() === normalized);
    if (!prev || !next) return false;
    return JSON.stringify(prev) === JSON.stringify(next);
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
      const saveFeedback = formatCoveringSaveFeedback(title, draftToSave, "update", {
        assemblyRowsRemain: assemblyTarget === "covering" && assemblyRowsCount > 0,
      });
      if (before && snapshotRatesMatchRow("coverings", title, before, fresh)) {
        setWarningMessage(SNAPSHOT_MAPPING_DELAY_STATUS);
      }
      setStatusMessage(saveFeedback);
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
      if (before && snapshotRatesMatchRow("preparations", title, before, fresh)) {
        setStatusMessage(SNAPSHOT_MAPPING_DELAY_STATUS);
      } else {
        setStatusMessage(`Подготовка «${title}» сохранена.`);
      }
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
      if (before && snapshotRatesMatchRow("layouts", title, before, fresh)) {
        setStatusMessage(SNAPSHOT_MAPPING_DELAY_STATUS);
      } else {
        setStatusMessage(`Укладка «${title}» сохранена.`);
      }
      cancelLayoutEdit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить укладку.");
    } finally {
      setSavingLayout(false);
    }
  }

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
    beginEditCovering,
    beginEditPreparation,
    beginEditLayout,
    cancelCoveringEdit,
    cancelPreparationEdit,
    cancelLayoutEdit,
    handleUpdateCovering,
    handleUpdatePreparation,
    handleUpdateLayout,
    setAssemblyRowsCount,
    formatMoney,
    formatPercent,
    consumablesSummaryPerM2,
  };
}
