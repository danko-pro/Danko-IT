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
import { FlooringAssemblyBlock, type FlooringAssemblyTarget } from "./FlooringAssemblyBlock";
import {
  applyAggregatesToCoveringDraft,
  createAssemblyLibraryItemFromCatalogItem,
  FLOORING_ASSEMBLY_LIBRARY_SECTIONS,
  FLOORING_ASSEMBLY_FORMULAS,
  formatCoveringSaveFeedback,
  getAssemblyFormulaCompactLabel,
  getAssemblyFormulaLabel,
  getAssemblyKindLabel,
  getFlooringAssemblyLibrarySectionLabel,
  inferDefaultFormula,
  type CoveringAssemblyAggregates,
  type CoveringAssemblyRow,
  type CoveringAssemblyRowKind,
  type FlooringAssemblyLibrarySection,
  type FlooringAssemblyFormula,
} from "./flooring-assembly";

const SNAPSHOT_MISSING_WARNING =
  "Позиция создана в БД. В public snapshot она появится после backend mapping/F5c/F6.";

const SNAPSHOT_MAPPING_DELAY_STATUS =
  "Изменение сохранено в БД. Public snapshot обновится после reload/build, если строка входит в public mapping.";

const ASSEMBLY_ROW_KINDS: CoveringAssemblyRowKind[] = ["work", "material", "consumable", "tool"];

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

type CatalogFormProps = {
  title: string;
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
};

function CatalogForm({ title, mode, submitting, onSubmit, onCancel, children }: CatalogFormProps) {
  const submitLabel =
    mode === "edit"
      ? submitting
        ? "Запись в БД…"
        : "Сохранить в БД"
      : submitting
        ? "Запись в БД…"
        : "Создать в БД";

  return (
    <form
      className="ce-flooring-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="ce-flooring-form-head">
        <strong>{title}</strong>
        <div className="ce-toolbar-group">
          {mode === "edit" && onCancel ? (
            <button type="button" className="ce-btn ce-btn-sm" disabled={submitting} onClick={onCancel}>
              Отмена
            </button>
          ) : null}
          <button type="submit" className="ce-btn ce-btn-primary ce-btn-sm" disabled={submitting}>
            {submitLabel}
          </button>
        </div>
      </div>
      <div className="ce-flooring-form-content">{children}</div>
    </form>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="ce-flooring-field">
      <span className="ce-flooring-field-label">{label}</span>
      {children}
    </label>
  );
}

export function FlooringCatalogPanel() {
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

  if (loading && !snapshot) {
    return <div className="ce-empty">Загрузка snapshot полов…</div>;
  }

  if (!snapshot) {
    return (
      <div className="ce-stub-panel">
        <h2>Полы</h2>
        <p>{error ?? "Не удалось получить snapshot каталога полов."}</p>
        <button type="button" className="ce-btn" onClick={() => void reloadSnapshot()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="ce-toolbar">
        <div className="ce-toolbar-group">
          <button type="button" className="ce-btn" onClick={() => void reloadSnapshot()} disabled={loading}>
            {loading ? "Обновление…" : "Обновить snapshot"}
          </button>
          <button
            type="button"
            className={flooringView === "library" ? "ce-btn ce-btn-primary" : "ce-btn"}
            onClick={() => setFlooringView((view) => (view === "library" ? "catalog" : "library"))}
          >
            {flooringView === "library" ? "К каталогу полов" : "Библиотека кубиков"}
          </button>
        </div>
        {statusMessage ? (
          <div className="ce-save-status">
            <span className="ce-dot" aria-hidden="true" />
            {statusMessage}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {error}
        </div>
      ) : null}

      {warningMessage ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Snapshot</span>
          {warningMessage}
        </div>
      ) : null}

      <div className="ce-note">
        <span className="ce-note-tag">Модель</span>
        Каталог полов читается из public snapshot (<code>/api/public/catalog/flooring/snapshot</code>).
        Создание и редактирование глобальных строк — через REST API (без удаления и reorder).
      </div>

      <div className="ce-meta">
        Версия snapshot: <strong>{snapshot.version}</strong> · Покрытий:{" "}
        <strong>{coveringRows.length}</strong> · Подготовок: <strong>{preparationRows.length}</strong> · Укладок:{" "}
        <strong>{layoutRows.length}</strong>
      </div>

      {flooringView === "library" ? (
      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Библиотека кубиков</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th>Отдел</th>
                <th>Тип</th>
                <th>Формула</th>
                <th>Ед.</th>
                <th className="ce-col-num">Цена</th>
                <th className="ce-col-num">Расход</th>
                <th className="ce-col-num">Фас./база</th>
                <th className="ce-col-num">Слой</th>
                <th className="ce-col-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {assemblyCatalog.length === 0 ? (
                <tr>
                  <td colSpan={11} className="ce-empty">
                    Кубики ещё не добавлены.
                  </td>
                </tr>
              ) : (
                assemblyCatalog.map((item) => (
                  <tr key={item.id}>
                    <td className="ce-col-id ce-mono ce-readonly">{item.source_code}</td>
                    <td className="ce-readonly">{item.title}</td>
                    <td className="ce-readonly">{getFlooringAssemblyLibrarySectionLabel(item.section)}</td>
                    <td className="ce-readonly">{getAssemblyKindLabel(item.kind)}</td>
                    <td className="ce-readonly">{getAssemblyFormulaCompactLabel(item.formula)}</td>
                    <td className="ce-readonly">{item.unit}</td>
                    <td className="ce-num ce-readonly">{formatMoney(normalizeNum(item.price))}</td>
                    <td className="ce-num ce-readonly">{normalizeNum(item.consumption_per_m2)}</td>
                    <td className="ce-num ce-readonly">{item.package_size ?? "—"}</td>
                    <td className="ce-num ce-readonly">{item.layer_mm ?? "—"}</td>
                    <td>
                      <button type="button" className="ce-btn ce-btn-sm" onClick={() => beginEditAssemblyItem(item)}>
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form
          className="ce-flooring-library-form"
          onSubmit={(event) => {
            event.preventDefault();
            void (editingAssemblyId ? handleUpdateAssemblyItem() : handleCreateAssemblyItem());
          }}
        >
          <div className="ce-table-wrap ce-flooring-table-wrap">
            <table className="ce-table ce-flooring-table">
              <thead>
                <tr>
                  <th className="ce-col-id">Режим</th>
                  <th className="ce-col-title">Название</th>
                  <th>Отдел</th>
                  <th>Тип</th>
                  <th>Формула</th>
                  <th>Ед.</th>
                  <th className="ce-col-num">Цена</th>
                  <th className="ce-col-num">Расход</th>
                  <th className="ce-col-num">Фас./база</th>
                  <th className="ce-col-num">Слой</th>
                  <th className="ce-col-actions">Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ce-readonly">{editingAssemblyId ? "Редактирование" : "Новый кубик"}</td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={assemblyDraft.title}
                      onChange={(event) => setAssemblyDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Клей плиточный"
                    />
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={assemblyDraft.section}
                      onChange={(event) =>
                        setAssemblyDraft((prev) => ({
                          ...prev,
                          section: event.target.value as FlooringAssemblyLibrarySection,
                        }))
                      }
                    >
                      {FLOORING_ASSEMBLY_LIBRARY_SECTIONS.map((section) => (
                        <option key={section} value={section}>
                          {getFlooringAssemblyLibrarySectionLabel(section)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={assemblyDraft.kind}
                      onChange={(event) => {
                        const kind = event.target.value as CoveringAssemblyRowKind;
                        setAssemblyDraft((prev) => ({ ...prev, kind, formula: inferDefaultFormula(kind, { title: prev.title }) }));
                      }}
                    >
                      {ASSEMBLY_ROW_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {getAssemblyKindLabel(kind)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={assemblyDraft.formula}
                      onChange={(event) =>
                        setAssemblyDraft((prev) => ({
                          ...prev,
                          formula: event.target.value as FlooringAssemblyFormula,
                        }))
                      }
                    >
                      {FLOORING_ASSEMBLY_FORMULAS.map((formula) => (
                        <option key={formula} value={formula}>
                          {getAssemblyFormulaLabel(formula)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={assemblyDraft.unit}
                      onChange={(event) => setAssemblyDraft((prev) => ({ ...prev, unit: event.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      step="0.01"
                      value={assemblyDraft.price || ""}
                      onChange={(event) => updateAssemblyNumber("price", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      step="0.01"
                      value={assemblyDraft.consumptionPerM2 || ""}
                      onChange={(event) => updateAssemblyNumber("consumptionPerM2", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      step="0.01"
                      value={assemblyDraft.packageSize ?? ""}
                      onChange={(event) => updateAssemblyNumber("packageSize", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      step="0.01"
                      value={assemblyDraft.layerMm ?? ""}
                      onChange={(event) => updateAssemblyNumber("layerMm", event.target.value)}
                    />
                  </td>
                  <td>
                    <div className="ce-toolbar-group ce-flooring-library-actions">
                      {editingAssemblyId ? (
                        <button type="button" className="ce-btn ce-btn-sm" disabled={savingAssembly} onClick={cancelAssemblyEdit}>
                          Отмена
                        </button>
                      ) : null}
                      <button
                        type="submit"
                        className="ce-btn ce-btn-primary ce-btn-sm"
                        disabled={editingAssemblyId ? savingAssembly : creatingAssembly}
                      >
                        {editingAssemblyId ? (savingAssembly ? "Запись…" : "Сохранить") : creatingAssembly ? "Запись…" : "Создать"}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </form>
      </section>
      ) : null}

      {flooringView === "catalog" ? (
        <>
      <FlooringAssemblyBlock
        libraryItems={assemblyLibraryItems}
        target={assemblyTarget}
        onTargetChange={setAssemblyTarget}
        formatMoney={formatMoney}
        onRowsChange={(rows) => setAssemblyRowsCount(rows.length)}
        onCreateFromAssembly={createAssemblyTargetRow}
      />

      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Покрытия</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th className="ce-col-num">Материал ₽/м²</th>
                <th className="ce-col-num">Работа ₽/м²</th>
                <th className="ce-col-num">Отход %</th>
                <th className="ce-col-tech">Расходники</th>
                <th className="ce-col-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {coveringRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ce-empty">
                    Покрытия не найдены в snapshot.
                  </td>
                </tr>
              ) : (
                coveringRows.map((row) => (
                  <tr key={row.code}>
                    <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                    <td className="ce-readonly">{row.title}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.materialPricePerM2)}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                    <td className="ce-num ce-readonly">{formatPercent(row.rates.baseWastePercent)}</td>
                    <td className="ce-readonly">{consumablesSummaryPerM2(row.rates)}</td>
                    <td>
                      <button
                        type="button"
                        className="ce-btn ce-btn-sm"
                        disabled={!row.catalogId}
                        onClick={() => beginEditCovering(row)}
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editingCoveringId !== null ? (
        <CatalogForm
          title="Редактировать покрытие"
          mode="edit"
          submitting={savingCovering}
          onSubmit={() => void handleUpdateCovering()}
          onCancel={cancelCoveringEdit}
        >
          <div className="ce-flooring-form-fields">
            <FormField label="Название">
              <input
                className="ce-input"
                value={coveringDraft.title}
                onChange={(event) => setCoveringDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Керамогранит"
              />
            </FormField>
            <FormField label="Материал ₽/м²">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={coveringDraft.materialPricePerM2 || ""}
                onChange={(event) => updateCoveringNumber("materialPricePerM2", event.target.value)}
              />
            </FormField>
            <FormField label="Работа ₽/м²">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={coveringDraft.laborPricePerM2 || ""}
                onChange={(event) => updateCoveringNumber("laborPricePerM2", event.target.value)}
              />
            </FormField>
            <FormField label="Отход %">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={coveringDraft.baseWastePercent || ""}
                onChange={(event) => updateCoveringNumber("baseWastePercent", event.target.value)}
              />
            </FormField>
            <FormField label="Инструмент ₽/м²">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={coveringDraft.instrumentPricePerM2 || ""}
                onChange={(event) => updateCoveringNumber("instrumentPricePerM2", event.target.value)}
              />
            </FormField>
            <FormField label="Нужен плинтус">
              <select
                className="ce-input"
                value={coveringDraft.needsPlinth ? "1" : "0"}
                onChange={(event) =>
                  setCoveringDraft((prev) => ({ ...prev, needsPlinth: event.target.value === "1" }))
                }
              >
                <option value="1">Да</option>
                <option value="0">Нет</option>
              </select>
            </FormField>
          </div>
        </CatalogForm>
        ) : null}
      </section>

      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Подготовка</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th className="ce-col-num">Работа ₽/м²</th>
                <th className="ce-col-num">Материал ₽/м²</th>
                <th className="ce-col-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {preparationRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ce-empty">
                    Подготовки не найдены в snapshot.
                  </td>
                </tr>
              ) : (
                preparationRows.map((row) => (
                  <tr key={row.code}>
                    <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                    <td className="ce-readonly">{row.title}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.materialPricePerM2)}</td>
                    <td>
                      <button
                        type="button"
                        className="ce-btn ce-btn-sm"
                        disabled={!row.catalogId}
                        onClick={() => beginEditPreparation(row)}
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editingPreparationId !== null ? (
        <CatalogForm
          title="Редактировать подготовку"
          mode="edit"
          submitting={savingPreparation}
          onSubmit={() => void handleUpdatePreparation()}
          onCancel={cancelPreparationEdit}
        >
          <div className="ce-flooring-form-fields">
          <FormField label="Название">
            <input
              className="ce-input"
              value={preparationDraft.title}
              onChange={(event) => setPreparationDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Грунтование"
            />
          </FormField>
          <FormField label="Работа ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={preparationDraft.laborPricePerM2 || ""}
              onChange={(event) => updatePreparationNumber("laborPricePerM2", event.target.value)}
            />
          </FormField>
          <FormField label="Материал ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={preparationDraft.materialPricePerM2 || ""}
              onChange={(event) => updatePreparationNumber("materialPricePerM2", event.target.value)}
            />
          </FormField>
          </div>
        </CatalogForm>
        ) : null}
      </section>

      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Укладка</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th className="ce-col-num">Коэф. работы</th>
                <th className="ce-col-num">Доп. отход %</th>
                <th className="ce-col-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {layoutRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ce-empty">
                    Укладки не найдены в snapshot.
                  </td>
                </tr>
              ) : (
                layoutRows.map((row) => (
                  <tr key={row.code}>
                    <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                    <td className="ce-readonly">{row.title}</td>
                    <td className="ce-num ce-readonly">{row.rates.laborFactor}</td>
                    <td className="ce-num ce-readonly">{formatPercent(row.rates.additionalWastePercent)}</td>
                    <td>
                      <button
                        type="button"
                        className="ce-btn ce-btn-sm"
                        disabled={!row.catalogId}
                        onClick={() => beginEditLayout(row)}
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editingLayoutId !== null ? (
        <CatalogForm
          title="Редактировать укладку"
          mode="edit"
          submitting={savingLayout}
          onSubmit={() => void handleUpdateLayout()}
          onCancel={cancelLayoutEdit}
        >
          <div className="ce-flooring-form-fields">
          <FormField label="Название">
            <input
              className="ce-input"
              value={layoutDraft.title}
              onChange={(event) => setLayoutDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Прямая"
            />
          </FormField>
          <FormField label="Коэф. работы">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              min={0}
              value={layoutDraft.laborFactor || ""}
              onChange={(event) => updateLayoutNumber("laborFactor", event.target.value)}
            />
          </FormField>
          <FormField label="Доп. отход %">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={layoutDraft.additionalWastePercent || ""}
              onChange={(event) => updateLayoutNumber("additionalWastePercent", event.target.value)}
            />
          </FormField>
          </div>
        </CatalogForm>
        ) : null}
      </section>
        </>
      ) : null}
    </>
  );
}
