import type { CatalogItem, CatalogZone } from "./plumbing-seed";
import { CatalogManagedTableHeaderCell } from "./CatalogManagedTableHeaderCell";
import {
  PLUMBING_ZONE_ATOMS_LABEL,
  PLUMBING_ZONE_COLUMN_HEADER_CLASS,
  PLUMBING_ZONE_COLUMN_LABELS,
  PLUMBING_ZONE_COLUMN_TITLES,
  PLUMBING_ZONE_COMPOSITION_COLUMNS,
  PLUMBING_ZONE_DEFAULT_COLUMNS,
  PLUMBING_ZONE_EMPTY_MESSAGE,
  PLUMBING_ZONE_MIN_COLUMN_WIDTH,
  PLUMBING_ZONE_RISK_LABEL,
  PLUMBING_ZONE_TOTAL_LABEL,
  PLUMBING_ZONE_VARIANT_SUFFIX,
} from "./PlumbingZoneCompositionColumns";
import { activePriceClassVariant, formatMoney } from "./plumbing-catalog-model";
import {
  PlumbingZoneCompositionRows,
  type PlumbingZoneRowTotal,
  type PlumbingZoneUpdateRow,
} from "./PlumbingZoneCompositionRows";
import { useCatalogTableColumns } from "./useCatalogTableColumns";

export type PlumbingZoneCompositionTableProps = {
  zone: CatalogZone;
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  subtotal: number;
  riskAmount: number;
  grandTotal: number;
  riskPercent: number;
  zoneRowTotal: PlumbingZoneRowTotal;
  onUpdateZoneRow: PlumbingZoneUpdateRow;
  onRemoveZoneRow: (zoneId: string, atomicItemId: string) => void;
  onReplaceZoneVariantRow: (zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) => void;
};

export function PlumbingZoneCompositionTable({
  zone,
  itemsById,
  library,
  subtotal,
  riskAmount,
  grandTotal,
  riskPercent,
  zoneRowTotal,
  onUpdateZoneRow,
  onRemoveZoneRow,
  onReplaceZoneVariantRow,
}: PlumbingZoneCompositionTableProps) {
  const activeVariant = activePriceClassVariant(zone);
  const isEmpty = zone.items.length === 0 && !activeVariant?.items.length;
  const { columns, beginColumnResize, columnClass, columnStyle, cycleColumnAlign } = useCatalogTableColumns({
    defaultColumns: PLUMBING_ZONE_DEFAULT_COLUMNS,
    minColumnWidths: PLUMBING_ZONE_MIN_COLUMN_WIDTH,
    storageKey: "plumbing:zone-composition-columns",
  });

  return (
    <div className="ce-zone-table-wrap">
      <table className="ce-table ce-zone-table ce-zone-composition-table">
        <colgroup>
          {PLUMBING_ZONE_COMPOSITION_COLUMNS.map((columnKey) => (
            <col key={columnKey} className={`ce-zone-col-${columnKey}`} style={columnStyle(columnKey)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {PLUMBING_ZONE_COMPOSITION_COLUMNS.map((columnKey, index) => {
              const nextColumnKey = PLUMBING_ZONE_COMPOSITION_COLUMNS[index + 1];
              const canEditColumn = columnKey !== "actions";

              return (
                <CatalogManagedTableHeaderCell
                  key={columnKey}
                  columnKey={columnKey}
                  nextColumnKey={nextColumnKey}
                  label={PLUMBING_ZONE_COLUMN_LABELS[columnKey]}
                  title={PLUMBING_ZONE_COLUMN_TITLES[columnKey]}
                  columns={columns}
                  columnClass={columnClass}
                  className={PLUMBING_ZONE_COLUMN_HEADER_CLASS[columnKey]}
                  canAlign={canEditColumn}
                  canResize={canEditColumn && nextColumnKey !== "actions"}
                  onCycleAlign={cycleColumnAlign}
                  onBeginResize={beginColumnResize}
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={PLUMBING_ZONE_COMPOSITION_COLUMNS.length} className="ce-empty">
                {PLUMBING_ZONE_EMPTY_MESSAGE}
              </td>
            </tr>
          ) : (
            <>
              <PlumbingZoneCompositionRows
                rows={zone.items}
                zoneId={zone.id}
                scope="base"
                itemsById={itemsById}
                library={library}
                zoneRowTotal={zoneRowTotal}
                onUpdateZoneRow={onUpdateZoneRow}
                onRemoveZoneRow={onRemoveZoneRow}
                onReplaceZoneVariantRow={onReplaceZoneVariantRow}
                columnClass={columnClass}
              />
              {activeVariant && activeVariant.items.length > 0 && (
                <>
                  <tr className="ce-variant-separator">
                    <td colSpan={PLUMBING_ZONE_COMPOSITION_COLUMNS.length}>
                      {activeVariant.label}: {PLUMBING_ZONE_VARIANT_SUFFIX}
                    </td>
                  </tr>
                  <PlumbingZoneCompositionRows
                    rows={activeVariant.items}
                    zoneId={zone.id}
                    scope="variant"
                    itemsById={itemsById}
                    library={library}
                    zoneRowTotal={zoneRowTotal}
                    onUpdateZoneRow={onUpdateZoneRow}
                    onRemoveZoneRow={onRemoveZoneRow}
                    onReplaceZoneVariantRow={onReplaceZoneVariantRow}
                    columnClass={columnClass}
                    removable={false}
                  />
                </>
              )}
            </>
          )}
          <tr className="ce-zone-summary-row">
            <td colSpan={6} className="ce-readonly ce-zone-summary-label">
              {PLUMBING_ZONE_ATOMS_LABEL}
            </td>
            <td className={columnClass("total", "ce-readonly")}>{formatMoney(subtotal)}</td>
            <td className={columnClass("actions", "ce-col-actions")} />
          </tr>
          <tr className="ce-zone-summary-row ce-zone-summary-risk">
            <td colSpan={6} className="ce-readonly ce-zone-summary-label">
              {PLUMBING_ZONE_RISK_LABEL} {riskPercent}%
            </td>
            <td className={columnClass("total", "ce-readonly")}>{formatMoney(riskAmount)}</td>
            <td className={columnClass("actions", "ce-col-actions")} />
          </tr>
          <tr className="ce-zone-summary-row ce-zone-summary-total">
            <td colSpan={6} className="ce-readonly ce-zone-summary-label">
              {PLUMBING_ZONE_TOTAL_LABEL}
            </td>
            <td className={columnClass("total", "ce-readonly ce-total-cell")}>{formatMoney(grandTotal)}</td>
            <td className={columnClass("actions", "ce-col-actions")} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
