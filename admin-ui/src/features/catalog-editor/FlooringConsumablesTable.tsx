import { useState, type MouseEvent as ReactMouseEvent } from "react";

import { consumablePricePerM2 } from "./api/flooring-mappers";
import { CatalogDecimalInput } from "./CatalogDecimalInput";

type ConsumablesColumnKey = "label" | "consumption" | "unit" | "unitPrice" | "perM2";
type ColumnAlign = "left" | "center" | "right";

type ColumnState = {
  align: ColumnAlign;
  width: number;
};

type ConsumableRow = {
  label: string;
  consumption: number;
  unit: string;
  pricePerUnit: number;
  onConsumptionCommit: (value: number) => void;
  onUnitChange: (value: string) => void;
  onPriceCommit: (value: number) => void;
};

type FlooringConsumablesTableProps = {
  rows: ConsumableRow[];
};

const COLUMN_ORDER: ConsumablesColumnKey[] = ["label", "consumption", "unit", "unitPrice", "perM2"];

const COLUMN_LABELS: Record<ConsumablesColumnKey, string> = {
  label: "Расходник",
  consumption: "Расход/м²",
  unit: "Ед.",
  unitPrice: "₽/ед.",
  perM2: "₽/м²",
};

const DEFAULT_COLUMNS: Record<ConsumablesColumnKey, ColumnState> = {
  label: { align: "left", width: 30 },
  consumption: { align: "right", width: 17 },
  unit: { align: "center", width: 12 },
  unitPrice: { align: "right", width: 18 },
  perM2: { align: "right", width: 23 },
};

const MIN_COLUMN_WIDTH: Record<ConsumablesColumnKey, number> = {
  label: 18,
  consumption: 12,
  unit: 8,
  unitPrice: 12,
  perM2: 12,
};

const ALIGN_ORDER: ColumnAlign[] = ["left", "center", "right"];
const ALIGN_ICON: Record<ColumnAlign, string> = {
  left: "⇤",
  center: "↔",
  right: "⇥",
};

function nextAlign(current: ColumnAlign): ColumnAlign {
  return ALIGN_ORDER[(ALIGN_ORDER.indexOf(current) + 1) % ALIGN_ORDER.length];
}

function cellClass(column: ColumnState, className = ""): string {
  return `ce-consumables-cell is-align-${column.align}${className ? ` ${className}` : ""}`;
}

export function FlooringConsumablesTable({ rows }: FlooringConsumablesTableProps) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  function cycleColumnAlign(columnKey: ConsumablesColumnKey) {
    setColumns((current) => ({
      ...current,
      [columnKey]: { ...current[columnKey], align: nextAlign(current[columnKey].align) },
    }));
  }

  function beginColumnResize(
    columnKey: ConsumablesColumnKey,
    nextColumnKey: ConsumablesColumnKey,
    event: ReactMouseEvent<HTMLSpanElement>,
  ) {
    event.preventDefault();

    const startX = event.clientX;
    const startColumnWidth = columns[columnKey].width;
    const startNextColumnWidth = columns[nextColumnKey].width;
    const totalWidth = startColumnWidth + startNextColumnWidth;
    const tableWidth = event.currentTarget.closest("table")?.getBoundingClientRect().width ?? 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPercent = ((moveEvent.clientX - startX) / tableWidth) * 100;
      const nextWidth = Math.max(
        MIN_COLUMN_WIDTH[columnKey],
        Math.min(totalWidth - MIN_COLUMN_WIDTH[nextColumnKey], startColumnWidth + deltaPercent),
      );

      setColumns((current) => ({
        ...current,
        [columnKey]: { ...current[columnKey], width: nextWidth },
        [nextColumnKey]: { ...current[nextColumnKey], width: totalWidth - nextWidth },
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  }

  return (
    <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-consumables-table-wrap">
      <table className="ce-table ce-flooring-table ce-flooring-consumables-table">
        <colgroup>
          {COLUMN_ORDER.map((columnKey) => (
            <col key={columnKey} style={{ width: `${columns[columnKey].width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMN_ORDER.map((columnKey, index) => (
              <th
                key={columnKey}
                className={cellClass(columns[columnKey], "ce-consumables-header-cell")}
              >
                <span className="ce-consumables-header-inner">
                  <span className="ce-consumables-header-label">{COLUMN_LABELS[columnKey]}</span>
                  <span className="ce-consumables-header-tools">
                    <button
                      type="button"
                      className="ce-consumables-header-tool"
                      title="Сменить выравнивание"
                      onClick={() => cycleColumnAlign(columnKey)}
                    >
                      {ALIGN_ICON[columns[columnKey].align]}
                    </button>
                  </span>
                </span>
                {index < COLUMN_ORDER.length - 1 ? (
                  <span
                    className="ce-consumables-column-resizer"
                    aria-hidden="true"
                    onMouseDown={(event) => beginColumnResize(columnKey, COLUMN_ORDER[index + 1], event)}
                  />
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pricePerM2 = consumablePricePerM2(row.consumption, row.pricePerUnit);

            return (
              <tr key={row.label}>
                <td className={cellClass(columns.label, "ce-readonly")}>
                  {row.label}
                </td>
                <td className={cellClass(columns.consumption)}>
                  <CatalogDecimalInput
                    className="ce-cell-input"
                    value={row.consumption}
                    onCommit={(value) => row.onConsumptionCommit(value ?? 0)}
                  />
                </td>
                <td className={cellClass(columns.unit)}>
                  <input
                    className="ce-cell-input"
                    value={row.unit}
                    onChange={(event) => row.onUnitChange(event.target.value)}
                  />
                </td>
                <td className={cellClass(columns.unitPrice)}>
                  <CatalogDecimalInput
                    className="ce-cell-input"
                    value={row.pricePerUnit}
                    onCommit={(value) => row.onPriceCommit(value ?? 0)}
                  />
                </td>
                <td
                  className={cellClass(columns.perM2, "ce-readonly ce-flooring-consumable-per-m2")}
                >
                  {pricePerM2.toLocaleString("ru-RU")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
