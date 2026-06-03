import { useEffect, useMemo, useState } from "react";

import { CatalogDecimalInput } from "./CatalogDecimalInput";
import { CatalogSegmentedControl, type CatalogSegmentedOption } from "./CatalogSegmentedControl";
import {
  aggregateCoveringAssembly,
  calculateAssemblyRowTotal,
  createAssemblyLibraryItemFromCatalogItem,
  createAssemblyRowFromLibraryItem,
  createEmptyAssemblyRow,
  FLOORING_ASSEMBLY_FORMULAS,
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
  type FlooringAssemblyTarget,
  type FlooringAssemblyFormula,
  type FlooringAssemblyLibrarySection,
} from "./flooring-assembly";

const FLOORING_ASSEMBLY_TARGETS: FlooringAssemblyTarget[] = ["covering", "preparation", "layout"];

const FLOORING_ASSEMBLY_TARGET_LABELS: Record<FlooringAssemblyTarget, string> = {
  covering: "Покрытие",
  preparation: "Подготовка",
  layout: "Укладка",
};

const FLOORING_ASSEMBLY_TARGET_OPTIONS: CatalogSegmentedOption<FlooringAssemblyTarget>[] =
  FLOORING_ASSEMBLY_TARGETS.map((target) => ({
    value: target,
    label: FLOORING_ASSEMBLY_TARGET_LABELS[target],
  }));

const FLOORING_ASSEMBLY_TARGET_LIBRARY_SECTIONS: Record<FlooringAssemblyTarget, FlooringAssemblyLibrarySection[]> = {
  covering: ["covering", "consumable", "tool"],
  preparation: ["work"],
  layout: ["work"],
};

const ASSEMBLY_APPLY_STATUS = "Строка добавлена — см. таблицу ниже.";

type CoveringAssemblyBlockProps = {
  libraryItems: ReturnType<typeof createAssemblyLibraryItemFromCatalogItem>[];
  target: FlooringAssemblyTarget;
  onTargetChange: (target: FlooringAssemblyTarget) => void;
  onCreateFromAssembly: (
    target: FlooringAssemblyTarget,
    title: string,
    aggregates: CoveringAssemblyAggregates,
    rows: CoveringAssemblyRow[],
  ) => Promise<boolean>;
  onRowsChange?: (rows: CoveringAssemblyRow[]) => void;
  formatMoney: (value: number) => string;
  initialRows?: CoveringAssemblyRow[];
  initialTitle?: string;
  resetKey?: string;
  loadingAssembly?: boolean;
};

export function FlooringAssemblyBlock({
  libraryItems: libraryItemsFromCatalog,
  target,
  onTargetChange,
  onCreateFromAssembly,
  onRowsChange,
  formatMoney,
  initialRows = [],
  initialTitle = "",
  resetKey,
  loadingAssembly = false,
}: CoveringAssemblyBlockProps) {
  const [rows, setRows] = useState<CoveringAssemblyRow[]>([]);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (resetKey === undefined) {
      setRows([]);
      setEntryTitle("");
      setApplyStatus(null);
      return;
    }
    setRows(initialRows);
    setEntryTitle(initialTitle);
    setApplyStatus(null);
  }, [resetKey, initialRows, initialTitle]);

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
  const availableLibrarySections = FLOORING_ASSEMBLY_TARGET_LIBRARY_SECTIONS[target];
  const availableRowKinds: CoveringAssemblyRowKind[] =
    target === "covering" ? ["material", "consumable", "tool"] : ["work"];
  const rowLibraryDatalistId = `flooring-assembly-row-library-${target}`;
  const availableRowLibraryItems = useMemo(
    () => libraryItemsFromCatalog.filter((item) => availableLibrarySections.includes(item.section)),
    [availableLibrarySections, libraryItemsFromCatalog],
  );

  function addRow(partial: Partial<CoveringAssemblyRow>) {
    setApplyStatus(null);
    setRows((prev) => [...prev, createEmptyAssemblyRow(partial)]);
  }

  function changeTarget(nextTarget: FlooringAssemblyTarget) {
    onTargetChange(nextTarget);
    setRows([]);
    setEntryTitle("");
    setApplyStatus(null);
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

  function findLibraryItemByTitle(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return availableRowLibraryItems.find((item) => item.title.trim().toLowerCase() === normalized);
  }

  function applyLibraryItemToRow(id: string, item: ReturnType<typeof createAssemblyLibraryItemFromCatalogItem>) {
    const libraryRow = createAssemblyRowFromLibraryItem(item);
    setApplyStatus(null);
    setEntryTitle((value) => value.trim() || item.title);
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...libraryRow,
              id: row.id,
              enabled: row.enabled,
            }
          : row,
      ),
    );
  }

  function updateRowTitleFromInput(id: string, value: string) {
    const libraryItem = findLibraryItemByTitle(value);
    if (libraryItem) {
      applyLibraryItemToRow(id, libraryItem);
      return;
    }
    updateRow(id, { title: value });
  }

  function removeRow(id: string) {
    setApplyStatus(null);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateRowNumber(
    id: string,
    field: "price" | "consumptionPerM2" | "packageSize" | "layerMm",
    value: number | null,
  ) {
    if (field === "packageSize" || field === "layerMm") {
      updateRow(id, { [field]: value ?? undefined });
      return;
    }
    updateRow(id, { [field]: value ?? 0 });
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
            {availableRowKinds.map((kind) => (
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
            list={rowLibraryDatalistId}
            value={row.title}
            onChange={(event) => updateRowTitleFromInput(row.id, event.target.value)}
            placeholder="Название или кубик из базы"
          />
        </td>
        <td>
          <input
            className="ce-cell-input ce-cell-unit"
            value={row.unit}
            onChange={(event) => updateRow(row.id, { unit: event.target.value })}
          />
        </td>
        <td className="ce-num">
          <CatalogDecimalInput
            className="ce-cell-input ce-num"
            value={row.price}
            onCommit={(value) => updateRowNumber(row.id, "price", value)}
          />
        </td>
        <td className="ce-num">
          {fieldVisibility.consumption ? (
            <CatalogDecimalInput
              className="ce-cell-input ce-num"
              value={row.consumptionPerM2}
              onCommit={(value) => updateRowNumber(row.id, "consumptionPerM2", value)}
            />
          ) : showsFlatCoefficient ? (
            <CatalogDecimalInput
              className="ce-cell-input ce-num"
              value={row.consumptionPerM2}
              placeholder="1"
              title={row.kind === "material" ? "Коэффициент запаса материала" : "Коэффициент сложности работы"}
              onCommit={(value) => updateRowNumber(row.id, "consumptionPerM2", value)}
            />
          ) : (
            <span className="ce-readonly ce-na">—</span>
          )}
        </td>
        <td className="ce-num">
          {fieldVisibility.packageSize ? (
            <CatalogDecimalInput
              className="ce-cell-input ce-num"
              nullable
              value={row.packageSize}
              onCommit={(value) => updateRowNumber(row.id, "packageSize", value)}
            />
          ) : (
            <span className="ce-readonly ce-na">—</span>
          )}
        </td>
        <td className="ce-num">
          {fieldVisibility.layerMm ? (
            <CatalogDecimalInput
              className="ce-cell-input ce-num"
              nullable
              value={row.layerMm}
              onCommit={(value) => updateRowNumber(row.id, "layerMm", value)}
            />
          ) : (
            <span className="ce-readonly ce-na">—</span>
          )}
        </td>
        <td className="ce-num ce-readonly ce-total-cell">
          {formatMoney(calculateAssemblyRowTotal(row))}
        </td>
        <td className="ce-col-actions">
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
    <div className="ce-flooring-assembly" aria-busy={loadingAssembly}>
      <div className="ce-flooring-assembly-head">
        <div>
          <h4 className="ce-flooring-assembly-title">Сборка строки каталога</h4>
        </div>
        {rows.length > 0 ? (
          <div className="ce-flooring-assembly-toolbar">
            {target === "covering" ? (
              <>
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
              </>
            ) : (
              <button
                type="button"
                className="ce-btn ce-btn-sm"
                onClick={() => addRow({ kind: "work", unit: "m2", formula: "flat_per_m2", consumptionPerM2: 1 })}
              >
                + Работа
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="ce-flooring-assembly-library">
        <CatalogSegmentedControl
          options={FLOORING_ASSEMBLY_TARGET_OPTIONS}
          value={target}
          onChange={changeTarget}
          ariaLabel="Собираем"
        />
        <input
          className="ce-input ce-flooring-assembly-library-item ce-flooring-assembly-title-input"
          value={entryTitle}
          onChange={(event) => setEntryTitle(event.target.value)}
          placeholder={`Название: ${FLOORING_ASSEMBLY_TARGET_LABELS[target].toLowerCase()}`}
        />
      </div>
      <datalist id={rowLibraryDatalistId}>
        {availableRowLibraryItems.map((item) => (
          <option
            key={item.id}
            value={item.title}
            label={`${getFlooringAssemblyLibrarySectionLabel(item.section)} · ${getAssemblyFormulaCompactLabel(item.row.formula)}`}
          />
        ))}
      </datalist>

      {rows.length === 0 ? (
        <div className="ce-flooring-assembly-empty">
          <span className="ce-flooring-assembly-empty-copy">
            {target === "covering" ? "Готовый пример или строки состава" : "Новая рабочая строка"}
          </span>
          {target === "covering" ? (
            <button type="button" className="ce-btn ce-btn-sm" onClick={loadPreset}>
              Пример 120×60
            </button>
          ) : (
            <button
              type="button"
              className="ce-btn ce-btn-sm"
              onClick={() => addRow({ kind: "work", unit: "m2", formula: "flat_per_m2", consumptionPerM2: 1 })}
            >
              + Работа
            </button>
          )}
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
              {baseRows.length > 0 ? renderSectionRow("База строки") : null}
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
            <span className="ce-flooring-assembly-summary-chip">
              Раб. <strong>{formatMoney(aggregates.worksPerM2)}</strong>
            </span>
            <span className="ce-flooring-assembly-summary-chip">
              Мат. <strong>{formatMoney(aggregates.materialPerM2)}</strong>
            </span>
            <span className="ce-flooring-assembly-summary-chip">
              Расх. <strong>{formatMoney(aggregates.consumablesPerM2)}</strong>
            </span>
            <span className="ce-flooring-assembly-summary-chip">
              Инстр. <strong>{formatMoney(aggregates.toolPerM2)}</strong>
            </span>
            <span className="ce-flooring-assembly-summary-chip ce-flooring-assembly-summary-total">
              Итого <strong>{formatMoney(totalPerM2)} ₽/м²</strong>
            </span>
            {target === "covering"
              ? recommendedEntries.map((entry) => (
                  <span key={entry.label} className="ce-flooring-assembly-summary-chip ce-flooring-assembly-recommended">
                    {entry.label} <strong>{formatMoney(entry.valuePerM2)}</strong>
                  </span>
                ))
              : null}
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
              disabled={creating}
              onClick={async () => {
                setCreating(true);
                const saved = await onCreateFromAssembly(target, entryTitle, aggregates, rows);
                setCreating(false);
                if (saved) {
                  setApplyStatus(ASSEMBLY_APPLY_STATUS);
                  setRows([]);
                  setEntryTitle("");
                }
              }}
            >
              {creating ? "Запись…" : `Добавить в ${FLOORING_ASSEMBLY_TARGET_LABELS[target]}`}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
