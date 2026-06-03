import { consumablePricePerM2 } from "./api/flooring-mappers";
import { CatalogDecimalInput } from "./CatalogDecimalInput";
import { CatalogManagedTableHeaderCell } from "./CatalogManagedTableHeaderCell";
import {
  useCatalogTableColumns,
  type CatalogTableColumnState,
} from "./useCatalogTableColumns";

type ConsumablesColumnKey = "label" | "consumption" | "unit" | "unitPrice" | "perM2";

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

const DEFAULT_COLUMNS: Record<ConsumablesColumnKey, CatalogTableColumnState> = {
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

export function FlooringConsumablesTable({ rows }: FlooringConsumablesTableProps) {
  const { columns, beginColumnResize, columnClass, columnStyle, cycleColumnAlign } = useCatalogTableColumns({
    defaultColumns: DEFAULT_COLUMNS,
    minColumnWidths: MIN_COLUMN_WIDTH,
    storageKey: "flooring:consumables-columns",
  });

  return (
    <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-consumables-table-wrap">
      <table className="ce-table ce-flooring-table ce-flooring-consumables-table">
        <colgroup>
          {COLUMN_ORDER.map((columnKey) => (
            <col key={columnKey} style={columnStyle(columnKey)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMN_ORDER.map((columnKey, index) => (
              <CatalogManagedTableHeaderCell
                key={columnKey}
                columnKey={columnKey}
                nextColumnKey={COLUMN_ORDER[index + 1]}
                label={COLUMN_LABELS[columnKey]}
                columns={columns}
                columnClass={columnClass}
                className="ce-consumables-cell ce-consumables-header-cell"
                onCycleAlign={cycleColumnAlign}
                onBeginResize={beginColumnResize}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pricePerM2 = consumablePricePerM2(row.consumption, row.pricePerUnit);

            return (
              <tr key={row.label}>
                <td className={columnClass("label", "ce-consumables-cell ce-readonly")}>
                  {row.label}
                </td>
                <td className={columnClass("consumption", "ce-consumables-cell")}>
                  <CatalogDecimalInput
                    className="ce-cell-input"
                    value={row.consumption}
                    onCommit={(value) => row.onConsumptionCommit(value ?? 0)}
                  />
                </td>
                <td className={columnClass("unit", "ce-consumables-cell")}>
                  <input
                    className="ce-cell-input"
                    value={row.unit}
                    onChange={(event) => row.onUnitChange(event.target.value)}
                  />
                </td>
                <td className={columnClass("unitPrice", "ce-consumables-cell")}>
                  <CatalogDecimalInput
                    className="ce-cell-input"
                    value={row.pricePerUnit}
                    onCommit={(value) => row.onPriceCommit(value ?? 0)}
                  />
                </td>
                <td
                  className={columnClass("perM2", "ce-consumables-cell ce-readonly ce-flooring-consumable-per-m2")}
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
