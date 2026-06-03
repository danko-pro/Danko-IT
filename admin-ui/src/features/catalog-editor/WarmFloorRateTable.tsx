import type { PublicWarmFloorConfigDto, PublicWarmFloorRateField } from "./api/types";
import { CatalogManagedTableHeaderCell } from "./CatalogManagedTableHeaderCell";
import type { WarmFloorRateField } from "./warm-floor-rate-fields";
import {
  WARM_FLOOR_RATE_COLUMN_CLASS,
  WARM_FLOOR_RATE_COLUMN_LABELS,
  WARM_FLOOR_RATE_COLUMN_TITLES,
  WARM_FLOOR_RATE_COLUMNS,
  type WarmFloorRateColumnControls,
} from "./WarmFloorRateTableColumns";

export type WarmFloorRateTableProps = {
  title: string;
  fields: WarmFloorRateField[];
  config: PublicWarmFloorConfigDto;
  controls: WarmFloorRateColumnControls;
  onUpdate: (field: PublicWarmFloorRateField, value: string) => void;
};

export function WarmFloorRateTable({
  title,
  fields,
  config,
  controls,
  onUpdate,
}: WarmFloorRateTableProps) {
  return (
    <div className="ce-table-wrap ce-warm-floor-rate-table-wrap">
      <table className="ce-table ce-warm-floor-rate-table">
        <WarmFloorRateColgroup controls={controls} />
        <WarmFloorRateHeader title={title} controls={controls} />
        <tbody>
          {fields.map((field) => (
            <tr key={field.key}>
              <td className={controls.columnClass("label", "ce-warm-floor-rate-label")} title={field.label}>
                {field.label}
              </td>
              <td className={controls.columnClass("unit", "ce-readonly ce-warm-floor-rate-unit")}>{field.unit}</td>
              <td className={controls.columnClass("value", "ce-warm-floor-rate-value")}>
                <input
                  className="ce-cell-input ce-num ce-warm-floor-rate-input"
                  type="number"
                  step="0.01"
                  value={config[field.key]}
                  onChange={(event) => onUpdate(field.key, event.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarmFloorRateColgroup({ controls }: { controls: WarmFloorRateColumnControls }) {
  return (
    <colgroup>
      {WARM_FLOOR_RATE_COLUMNS.map((columnKey) => (
        <col key={columnKey} className={`ce-warm-floor-rate-col-${columnKey}`} style={controls.columnStyle(columnKey)} />
      ))}
    </colgroup>
  );
}

function WarmFloorRateHeader({
  title,
  controls,
}: {
  title: string;
  controls: WarmFloorRateColumnControls;
}) {
  return (
    <thead>
      <tr>
        {WARM_FLOOR_RATE_COLUMNS.map((columnKey, index) => {
          const nextColumnKey = WARM_FLOOR_RATE_COLUMNS[index + 1];

          return (
            <CatalogManagedTableHeaderCell
              key={columnKey}
              columnKey={columnKey}
              nextColumnKey={nextColumnKey}
              label={columnKey === "label" ? title : WARM_FLOOR_RATE_COLUMN_LABELS[columnKey]}
              title={WARM_FLOOR_RATE_COLUMN_TITLES[columnKey]}
              columns={controls.columns}
              columnClass={controls.columnClass}
              className={WARM_FLOOR_RATE_COLUMN_CLASS[columnKey]}
              onCycleAlign={controls.cycleColumnAlign}
              onBeginResize={controls.beginColumnResize}
            />
          );
        })}
      </tr>
    </thead>
  );
}
