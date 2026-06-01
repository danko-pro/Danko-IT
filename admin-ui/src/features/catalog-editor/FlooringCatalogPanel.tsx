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
  aggregateCoveringAssembly,
  applyAggregatesToCoveringDraft,
  calculateAssemblyRowTotal,
  createAssemblyLibraryItemFromCatalogItem,
  createAssemblyRowFromLibraryItem,
  createEmptyAssemblyRow,
  FLOORING_ASSEMBLY_LIBRARY_SECTIONS,
  FLOORING_ASSEMBLY_FORMULAS,
  filterFlooringAssemblyLibraryItems,
  formatCoveringSaveFeedback,
  getAssemblyFormulaCompactLabel,
  getAssemblyFormulaLabel,
  getAssemblyKindLabel,
  getFlooringAssemblyLibrarySectionLabel,
  getFormulaFieldVisibility,
  getKeramogranit120x60Preset,
  getRecommendedFlatFieldEntries,
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

const ASSEMBLY_ROW_KINDS: CoveringAssemblyRowKind[] = ["work", "material", "consumable", "tool"];

const ASSEMBLY_APPLY_STATUS =
  "Расчёт перенесён в поля формы. Чтобы он попал в БД, нажмите «Создать покрытие в БД» или «Сохранить покрытие в БД».";

type CoveringAssemblyBlockProps = {
  libraryItems: ReturnType<typeof createAssemblyLibraryItemFromCatalogItem>[];
  onApplyAggregates: (aggregates: CoveringAssemblyAggregates) => void;
  onRowsChange?: (rows: CoveringAssemblyRow[]) => void;
  formatMoney: (value: number) => string;
};

function CoveringAssemblyBlock({ libraryItems: libraryItemsFromCatalog, onApplyAggregates, onRowsChange, formatMoney }: CoveringAssemblyBlockProps) {
  const [rows, setRows] = useState<CoveringAssemblyRow[]>([]);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [librarySection, setLibrarySection] = useState<FlooringAssemblyLibrarySection>("covering");
  const [libraryItemId, setLibraryItemId] = useState("");

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const aggregates = useMemo(() => aggregateCoveringAssembly(rows), [rows]);
  const recommendedEntries = useMemo(
    () => getRecommendedFlatFieldEntries(aggregates.recommendedFlatFields),
    [aggregates.recommendedFlatFields],
  );
  const totalPerM2 =
    aggregates.worksPerM2 +
    aggregates.materialPerM2 +
    aggregates.consumablesPerM2 +
    aggregates.toolPerM2;
  const baseRows = useMemo(
    () => rows.filter((row) => row.kind === "material" || row.kind === "work"),
    [rows],
  );
  const accessoryRows = useMemo(
    () => rows.filter((row) => row.kind === "consumable" || row.kind === "tool"),
    [rows],
  );
  const libraryItems = useMemo(
    () => filterFlooringAssemblyLibraryItems(libraryItemsFromCatalog, librarySection),
    [libraryItemsFromCatalog, librarySection],
  );
  const selectedLibraryItem = libraryItems.find((item) => item.id === libraryItemId) ?? libraryItems[0];

  useEffect(() => {
    if (selectedLibraryItem && selectedLibraryItem.id !== libraryItemId) {
      setLibraryItemId(selectedLibraryItem.id);
    }
    if (!selectedLibraryItem && libraryItemId) {
      setLibraryItemId("");
    }
  }, [libraryItemId, selectedLibraryItem]);

  function addRow(partial: Partial<CoveringAssemblyRow>) {
    setApplyStatus(null);
    setRows((prev) => [...prev, createEmptyAssemblyRow(partial)]);
  }

  function addLibraryItem() {
    if (!selectedLibraryItem) return;
    setApplyStatus(null);
    setRows((prev) => [...prev, createAssemblyRowFromLibraryItem(selectedLibraryItem)]);
  }

  function changeLibrarySection(section: FlooringAssemblyLibrarySection) {
    const items = filterFlooringAssemblyLibraryItems(libraryItemsFromCatalog, section);
    setLibrarySection(section);
    setLibraryItemId(items[0]?.id ?? "");
  }

  function updateRow(id: string, patch: Partial<CoveringAssemblyRow>) {
    setApplyStatus(null);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.kind !== undefined && patch.formula === undefined) {
          next.formula = inferDefaultFormula(patch.kind, { title: next.title });
        }
        return next;
      }),
    );
  }

  function removeRow(id: string) {
    setApplyStatus(null);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateRowNumber(id: string, field: "price" | "consumptionPerM2" | "packageSize" | "layerMm", value: string) {
    updateRow(id, { [field]: normalizeNum(value) });
  }

  function loadPreset() {
    setApplyStatus(null);
    setRows(getKeramogranit120x60Preset());
  }

  function renderSectionRow(label: string) {
    return (
      <tr key={`section-${label}`} className="ce-flooring-assembly-section-row">
        <td colSpan={11}>{label}</td>
      </tr>
    );
  }

  function renderAssemblyRow(row: CoveringAssemblyRow) {
    const fieldVisibility = getFormulaFieldVisibility(row.formula);
    const showsFlatCoefficient =
      row.formula === "flat_per_m2" && (row.kind === "material" || row.kind === "work");
    return (
      <tr key={row.id} className={row.enabled ? undefined : "ce-flooring-assembly-row-off"}>
        <td className="ce-flooring-assembly-check">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => updateRow(row.id, { enabled: event.target.checked })}
            aria-label={`Включить ${row.title || "строку"}`}
          />
        </td>
        <td>
          <select
            className="ce-cell-input ce-cell-select"
            value={row.kind}
            onChange={(event) =>
              updateRow(row.id, { kind: event.target.value as CoveringAssemblyRowKind })
            }
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
            className="ce-cell-input ce-cell-select ce-cell-formula"
            value={row.formula}
            onChange={(event) =>
              updateRow(row.id, { formula: event.target.value as FlooringAssemblyFormula })
            }
            title={getAssemblyFormulaLabel(row.formula)}
          >
            {FLOORING_ASSEMBLY_FORMULAS.map((formula) => (
              <option key={formula} value={formula}>
                {getAssemblyFormulaCompactLabel(formula)}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input
            className="ce-cell-input"
            value={row.title}
            onChange={(event) => updateRow(row.id, { title: event.target.value })}
            placeholder="Название"
          />
        </td>
        <td>
          <input
            className="ce-cell-input ce-cell-unit"
            value={row.unit}
            onChange={(event) => updateRow(row.id, { unit: event.target.value })}
          />
        </td>
        <td>
          <input
            className="ce-cell-input ce-num"
            type="number"
            step="0.01"
            value={row.price || ""}
            onChange={(event) => updateRowNumber(row.id, "price", event.target.value)}
          />
        </td>
        <td>
          {fieldVisibility.consumption ? (
            <input
              className="ce-cell-input ce-num"
              type="number"
              step="0.01"
              value={row.consumptionPerM2 || ""}
              onChange={(event) => updateRowNumber(row.id, "consumptionPerM2", event.target.value)}
            />
          ) : showsFlatCoefficient ? (
            <input
              className="ce-cell-input ce-num"
              type="number"
              step="0.01"
              value={row.consumptionPerM2 || ""}
              placeholder="1"
              title={row.kind === "material" ? "Коэффициент запаса материала" : "Коэффициент сложности работы"}
              onChange={(event) => updateRowNumber(row.id, "consumptionPerM2", event.target.value)}
            />
          ) : (
            <span className="ce-readonly ce-na">—</span>
          )}
        </td>
        <td>
          {fieldVisibility.packageSize ? (
            <input
              className="ce-cell-input ce-num"
              type="number"
              step="0.01"
              value={row.packageSize ?? ""}
              onChange={(event) => updateRowNumber(row.id, "packageSize", event.target.value)}
            />
          ) : (
            <span className="ce-readonly ce-na">—</span>
          )}
        </td>
        <td>
          {fieldVisibility.layerMm ? (
            <input
              className="ce-cell-input ce-num"
              type="number"
              step="0.01"
              value={row.layerMm ?? ""}
              onChange={(event) => updateRowNumber(row.id, "layerMm", event.target.value)}
            />
          ) : (
            <span className="ce-readonly ce-na">—</span>
          )}
        </td>
        <td className="ce-num ce-readonly ce-total-cell">
          {formatMoney(calculateAssemblyRowTotal(row))}
        </td>
        <td>
          <button
            type="button"
            className="ce-row-delete"
            title="Удалить строку"
            onClick={() => removeRow(row.id)}
          >
            ×
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="ce-flooring-assembly">
      <div className="ce-flooring-assembly-head">
        <div>
          <h4 className="ce-flooring-assembly-title">Состав покрытия</h4>
          <p className="ce-flooring-assembly-hint">
            Локальный черновик: строки не сохраняются отдельно, расчёт переносится в поля формы покрытия.
          </p>
        </div>
        {rows.length > 0 ? (
          <div className="ce-flooring-assembly-toolbar">
            <button
              type="button"
              className="ce-btn ce-btn-sm"
              onClick={() => addRow({ kind: "material", unit: "m2", formula: "flat_per_m2", consumptionPerM2: 1 })}
            >
              + Материал
            </button>
            <button
              type="button"
              className="ce-btn ce-btn-sm"
              onClick={() => addRow({ kind: "work", unit: "m2", formula: "flat_per_m2", consumptionPerM2: 1 })}
            >
              + Работа
            </button>
            <button
              type="button"
              className="ce-btn ce-btn-sm"
              onClick={() => addRow({ kind: "consumable", unit: "pcs" })}
            >
              + Расходник
            </button>
            <button
              type="button"
              className="ce-btn ce-btn-sm"
              onClick={() => addRow({ kind: "tool", unit: "m2", formula: "flat_per_m2" })}
            >
              + Инструмент
            </button>
          </div>
        ) : null}
      </div>

      <div className="ce-flooring-assembly-library">
        <span className="ce-flooring-assembly-library-label">Библиотека кубиков</span>
        <select
          className="ce-input ce-flooring-assembly-library-select"
          value={librarySection}
          onChange={(event) => changeLibrarySection(event.target.value as FlooringAssemblyLibrarySection)}
        >
          {FLOORING_ASSEMBLY_LIBRARY_SECTIONS.map((section) => (
            <option key={section} value={section}>
              {getFlooringAssemblyLibrarySectionLabel(section)}
            </option>
          ))}
        </select>
        <select
          className="ce-input ce-flooring-assembly-library-item"
          value={selectedLibraryItem?.id ?? ""}
          onChange={(event) => setLibraryItemId(event.target.value)}
        >
          {libraryItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <button type="button" className="ce-btn ce-btn-sm" onClick={addLibraryItem} disabled={!selectedLibraryItem}>
          Добавить в состав
        </button>
        <span className="ce-flooring-assembly-library-hint">После добавления строку можно править в таблице.</span>
      </div>

      {rows.length === 0 ? (
        <div className="ce-flooring-assembly-empty">
          <p>Добавьте строки состава или загрузите пример.</p>
          <button type="button" className="ce-btn ce-btn-sm" onClick={loadPreset}>
            Загрузить пример Керамогранит 120×60
          </button>
        </div>
      ) : (
      <div className="ce-table-wrap ce-flooring-assembly-table-wrap">
        <table className="ce-table ce-flooring-assembly-table">
          <thead>
            <tr>
              <th className="ce-col-check">Вкл.</th>
              <th className="ce-col-kind">Тип</th>
              <th className="ce-col-formula">Формула</th>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-unit">Ед.</th>
              <th className="ce-col-num">Цена</th>
              <th className="ce-col-num">Коэф./расх.</th>
              <th className="ce-col-num">Фас./база</th>
              <th className="ce-col-num">Слой/слои</th>
              <th className="ce-col-total">Итого</th>
              <th className="ce-col-actions">×</th>
            </tr>
          </thead>
          <tbody>
              {baseRows.length > 0 ? renderSectionRow("База покрытия") : null}
              {baseRows.map(renderAssemblyRow)}
              {accessoryRows.length > 0 ? renderSectionRow("Расходники и инструмент") : null}
              {accessoryRows.map(renderAssemblyRow)}
          </tbody>
        </table>
      </div>
      )}

      {rows.length > 0 ? (
        <>
          <div className="ce-flooring-assembly-summary">
            <div className="ce-flooring-assembly-summary-item">
              <span className="ce-flooring-assembly-summary-label">Работы</span>
              <span className="ce-flooring-assembly-summary-value">
                {formatMoney(aggregates.worksPerM2)} ₽/м²
              </span>
            </div>
            <div className="ce-flooring-assembly-summary-item">
              <span className="ce-flooring-assembly-summary-label">Материалы</span>
              <span className="ce-flooring-assembly-summary-value">
                {formatMoney(aggregates.materialPerM2)} ₽/м²
              </span>
            </div>
            <div className="ce-flooring-assembly-summary-item">
              <span className="ce-flooring-assembly-summary-label">Расходники</span>
              <span className="ce-flooring-assembly-summary-value">
                {formatMoney(aggregates.consumablesPerM2)} ₽/м²
              </span>
            </div>
            <div className="ce-flooring-assembly-summary-item">
              <span className="ce-flooring-assembly-summary-label">Инструмент</span>
              <span className="ce-flooring-assembly-summary-value">
                {formatMoney(aggregates.toolPerM2)} ₽/м²
              </span>
            </div>
            <div className="ce-flooring-assembly-summary-item ce-flooring-assembly-summary-total">
              <span className="ce-flooring-assembly-summary-label">Итого покрытия</span>
              <span className="ce-flooring-assembly-summary-value">{formatMoney(totalPerM2)} ₽/м²</span>
            </div>
          </div>

          <div className="ce-flooring-assembly-summary ce-flooring-assembly-recommended">
            {recommendedEntries.map((entry) => (
              <div key={entry.label} className="ce-flooring-assembly-summary-item">
                <span className="ce-flooring-assembly-summary-label">{entry.label}</span>
                <span className="ce-flooring-assembly-summary-value">
                  {formatMoney(entry.valuePerM2)} ₽/m²
                </span>
              </div>
            ))}
          </div>

          <div className="ce-flooring-assembly-actions">
            {applyStatus ? (
              <div className="ce-flooring-assembly-status">
                <span className="ce-dot" aria-hidden="true" />
                {applyStatus}
              </div>
            ) : null}
            <button
              type="button"
              className="ce-btn ce-btn-primary ce-btn-sm"
              onClick={() => {
                onApplyAggregates(aggregates);
                setApplyStatus(ASSEMBLY_APPLY_STATUS);
              }}
            >
              Перенести расчёт в поля формы
            </button>
          </div>
        </>
      ) : null}
    </div>
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
  const [creatingCovering, setCreatingCovering] = useState(false);
  const [creatingPreparation, setCreatingPreparation] = useState(false);
  const [creatingLayout, setCreatingLayout] = useState(false);
  const [savingCovering, setSavingCovering] = useState(false);
  const [savingPreparation, setSavingPreparation] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [savingAssembly, setSavingAssembly] = useState(false);
  const [assemblyRowsCount, setAssemblyRowsCount] = useState(0);

  const reloadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, assemblyItems, coverings, preparations, layouts] = await Promise.all([
        fetchFlooringSnapshot(),
        listFlooringAssemblyItems(),
        listFlooringCoverings(),
        listFlooringPreparations(),
        listFlooringLayouts(),
      ]);
      setSnapshot(data);
      setAssemblyCatalog(assemblyItems);
      setCoveringCatalog(coverings);
      setPreparationCatalog(preparations);
      setLayoutCatalog(layouts);
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

  async function handleCreateCovering() {
    const title = coveringDraft.title.trim();
    if (!title) {
      setError("Укажите название покрытия.");
      return;
    }
    const draftToSave = { ...coveringDraft, title };
    const assemblyRemain = assemblyRowsCount > 0;
    setCreatingCovering(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringCovering(coveringDraftToPayload(draftToSave));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      const saveFeedback = formatCoveringSaveFeedback(title, draftToSave, "create", {
        assemblyRowsRemain: assemblyRemain,
      });
      if (!snapshotHasTitle(fresh, "coverings", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
        setStatusMessage(saveFeedback);
      } else {
        setStatusMessage(saveFeedback);
      }
      setCoveringDraft(emptyCoveringDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать покрытие.");
    } finally {
      setCreatingCovering(false);
    }
  }

  async function handleCreatePreparation() {
    const title = preparationDraft.title.trim();
    if (!title) {
      setError("Укажите название подготовки.");
      return;
    }
    setCreatingPreparation(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringPreparation(preparationDraftToPayload({ ...preparationDraft, title }));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      if (!snapshotHasTitle(fresh, "preparations", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
      } else {
        setStatusMessage(`Подготовка «${title}» создана.`);
      }
      setPreparationDraft(emptyPreparationDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать подготовку.");
    } finally {
      setCreatingPreparation(false);
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
        assemblyRowsRemain: assemblyRowsCount > 0,
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

  async function handleCreateLayout() {
    const title = layoutDraft.title.trim();
    if (!title) {
      setError("Укажите название укладки.");
      return;
    }
    setCreatingLayout(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringLayout(layoutDraftToPayload({ ...layoutDraft, title }));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      if (!snapshotHasTitle(fresh, "layouts", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
      } else {
        setStatusMessage(`Укладка «${title}» создана.`);
      }
      setLayoutDraft(emptyLayoutDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать укладку.");
    } finally {
      setCreatingLayout(false);
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
                  <td colSpan={10} className="ce-empty">
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

        <CatalogForm
          title={editingAssemblyId ? "Редактировать кубик" : "Добавить кубик"}
          mode={editingAssemblyId ? "edit" : "create"}
          submitting={editingAssemblyId ? savingAssembly : creatingAssembly}
          onSubmit={() => void (editingAssemblyId ? handleUpdateAssemblyItem() : handleCreateAssemblyItem())}
          onCancel={editingAssemblyId ? cancelAssemblyEdit : undefined}
        >
          <div className="ce-flooring-form-fields">
            <FormField label="Название">
              <input
                className="ce-input"
                value={assemblyDraft.title}
                onChange={(event) => setAssemblyDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Клей плиточный"
              />
            </FormField>
            <FormField label="Отдел">
              <select
                className="ce-input"
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
            </FormField>
            <FormField label="Тип">
              <select
                className="ce-input"
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
            </FormField>
            <FormField label="Формула">
              <select
                className="ce-input"
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
            </FormField>
            <FormField label="Ед.">
              <input
                className="ce-input"
                value={assemblyDraft.unit}
                onChange={(event) => setAssemblyDraft((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </FormField>
            <FormField label="Цена">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={assemblyDraft.price || ""}
                onChange={(event) => updateAssemblyNumber("price", event.target.value)}
              />
            </FormField>
            <FormField label="Расход/коэф.">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={assemblyDraft.consumptionPerM2 || ""}
                onChange={(event) => updateAssemblyNumber("consumptionPerM2", event.target.value)}
              />
            </FormField>
            <FormField label="Фас./база">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={assemblyDraft.packageSize ?? ""}
                onChange={(event) => updateAssemblyNumber("packageSize", event.target.value)}
              />
            </FormField>
            <FormField label="Слой/слои">
              <input
                className="ce-input ce-num"
                type="number"
                step="0.01"
                value={assemblyDraft.layerMm ?? ""}
                onChange={(event) => updateAssemblyNumber("layerMm", event.target.value)}
              />
            </FormField>
          </div>
        </CatalogForm>
      </section>

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

        <CatalogForm
          title={editingCoveringId ? "Редактировать покрытие" : "Добавить покрытие"}
          mode={editingCoveringId ? "edit" : "create"}
          submitting={editingCoveringId ? savingCovering : creatingCovering}
          onSubmit={() => void (editingCoveringId ? handleUpdateCovering() : handleCreateCovering())}
          onCancel={editingCoveringId ? cancelCoveringEdit : undefined}
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
          <CoveringAssemblyBlock
            libraryItems={assemblyLibraryItems}
            formatMoney={formatMoney}
            onRowsChange={(rows) => setAssemblyRowsCount(rows.length)}
            onApplyAggregates={(aggregates) =>
              setCoveringDraft((prev) => applyAggregatesToCoveringDraft(aggregates, prev))
            }
          />
        </CatalogForm>
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

        <CatalogForm
          title={editingPreparationId ? "Редактировать подготовку" : "Добавить подготовку"}
          mode={editingPreparationId ? "edit" : "create"}
          submitting={editingPreparationId ? savingPreparation : creatingPreparation}
          onSubmit={() => void (editingPreparationId ? handleUpdatePreparation() : handleCreatePreparation())}
          onCancel={editingPreparationId ? cancelPreparationEdit : undefined}
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

        <CatalogForm
          title={editingLayoutId ? "Редактировать укладку" : "Добавить укладку"}
          mode={editingLayoutId ? "edit" : "create"}
          submitting={editingLayoutId ? savingLayout : creatingLayout}
          onSubmit={() => void (editingLayoutId ? handleUpdateLayout() : handleCreateLayout())}
          onCancel={editingLayoutId ? cancelLayoutEdit : undefined}
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
      </section>
    </>
  );
}
