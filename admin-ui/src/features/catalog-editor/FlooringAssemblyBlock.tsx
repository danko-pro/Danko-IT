import { useEffect, useMemo, useState } from "react";

import { normalizeNum } from "./api/flooring-mappers";
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

const FLOORING_ASSEMBLY_TARGET_LIBRARY_SECTIONS: Record<FlooringAssemblyTarget, FlooringAssemblyLibrarySection[]> = {
  covering: ["covering", "consumable", "tool"],
  preparation: ["work"],
  layout: ["work"],
};

const ASSEMBLY_APPLY_STATUS =
  "Строка создана в выбранном разделе. Проверьте её в таблице ниже.";

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
  const [libraryItemId, setLibraryItemId] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (resetKey === undefined) {
      setRows([]);
      setEntryTitle("");
      setApplyStatus(null);
      setLibraryItemId("");
      return;
    }
    setRows(initialRows);
    setEntryTitle(initialTitle);
    setApplyStatus(null);
    setLibraryItemId("");
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
  const selectedLibraryItem =
    availableRowLibraryItems.find((item) => item.id === libraryItemId) ?? availableRowLibraryItems[0];

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
    setEntryTitle((value) => value.trim() || selectedLibraryItem.title);
    setRows((prev) => [...prev, createAssemblyRowFromLibraryItem(selectedLibraryItem)]);
  }

  function changeTarget(nextTarget: FlooringAssemblyTarget) {
    onTargetChange(nextTarget);
    setLibraryItemId("");
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
          <h4 className="ce-flooring-assembly-title">Сборка строки каталога</h4>
          <p className="ce-flooring-assembly-hint">
            Выберите, что собираем: покрытие, подготовку или укладку. Кубики остаются в библиотеке, итог переносится в форму ниже.
            {loadingAssembly ? " Загрузка состава…" : null}
          </p>
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
        <span className="ce-flooring-assembly-library-label">Собираем</span>
        <select
          className="ce-input ce-flooring-assembly-library-select"
          value={target}
          onChange={(event) => changeTarget(event.target.value as FlooringAssemblyTarget)}
        >
          {FLOORING_ASSEMBLY_TARGETS.map((item) => (
            <option key={item} value={item}>
              {FLOORING_ASSEMBLY_TARGET_LABELS[item]}
            </option>
          ))}
        </select>
        <input
          className="ce-input ce-flooring-assembly-library-item"
          value={entryTitle}
          onChange={(event) => setEntryTitle(event.target.value)}
          placeholder={`Название: ${FLOORING_ASSEMBLY_TARGET_LABELS[target].toLowerCase()}`}
        />
        <span className="ce-flooring-assembly-library-label">Кубик</span>
        <select
          className="ce-input ce-flooring-assembly-library-item"
          value={selectedLibraryItem?.id ?? ""}
          onChange={(event) => setLibraryItemId(event.target.value)}
        >
          {availableRowLibraryItems.map((item) => (
            <option key={item.id} value={item.id}>
              {getFlooringAssemblyLibrarySectionLabel(item.section)} · {item.title}
            </option>
          ))}
        </select>
        <button type="button" className="ce-btn ce-btn-sm" onClick={addLibraryItem} disabled={!selectedLibraryItem}>
          Добавить в состав
        </button>
        <span className="ce-flooring-assembly-library-hint">После добавления строку можно править в таблице.</span>
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
          <p>
            {target === "covering"
              ? "Добавьте материал, работу и расходники покрытия или загрузите пример."
              : "Добавьте рабочую строку из библиотеки или вручную."}
          </p>
          {target === "covering" ? (
            <button type="button" className="ce-btn ce-btn-sm" onClick={loadPreset}>
              Загрузить пример Керамогранит 120×60
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
              <span className="ce-flooring-assembly-summary-label">Итого сборки</span>
              <span className="ce-flooring-assembly-summary-value">{formatMoney(totalPerM2)} ₽/м²</span>
            </div>
          </div>

          {target === "covering" ? (
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
          ) : null}

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
