import type { CatalogItem, CatalogZone } from "./plumbing-seed";
import { activePriceClassVariant, formatMoney } from "./plumbing-catalog-model";
import {
  PlumbingZoneCompositionRows,
  type PlumbingZoneRowTotal,
  type PlumbingZoneUpdateRow,
} from "./PlumbingZoneCompositionRows";

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

  return (
    <div className="ce-zone-table-wrap">
      <table className="ce-table ce-zone-table ce-zone-composition-table">
        <colgroup>
          <col className="ce-zone-col-id" />
          <col className="ce-zone-col-title" />
          <col className="ce-zone-col-unit" />
          <col className="ce-zone-col-price" />
          <col className="ce-zone-col-qty" />
          <col className="ce-zone-col-coef" />
          <col className="ce-zone-col-total" />
          <col className="ce-zone-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th className="ce-zone-table-id">ID</th>
            <th>Позиция</th>
            <th className="ce-zone-table-unit">Ед.</th>
            <th className="ce-num" title="Цена за единицу">
              Цена
            </th>
            <th className="ce-num">Кол-во</th>
            <th className="ce-num" title="Коэффициент">
              К
            </th>
            <th className="ce-num ce-col-total">Итого</th>
            <th className="ce-col-actions" aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={8} className="ce-empty">
                Состав пуст. Добавьте позицию из библиотеки ниже.
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
              />
              {activeVariant && activeVariant.items.length > 0 && (
                <>
                  <tr className="ce-variant-separator">
                    <td colSpan={8}>{activeVariant.label}: смеситель и мойка</td>
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
                    removable={false}
                  />
                </>
              )}
            </>
          )}
          <tr className="ce-zone-summary-row">
            <td colSpan={6} className="ce-readonly ce-zone-summary-label">
              Атомы
            </td>
            <td className="ce-num ce-readonly">{formatMoney(subtotal)}</td>
            <td />
          </tr>
          <tr className="ce-zone-summary-row ce-zone-summary-risk">
            <td colSpan={6} className="ce-readonly ce-zone-summary-label">
              Резерв {riskPercent}%
            </td>
            <td className="ce-num ce-readonly">{formatMoney(riskAmount)}</td>
            <td />
          </tr>
          <tr className="ce-zone-summary-row ce-zone-summary-total">
            <td colSpan={6} className="ce-readonly ce-zone-summary-label">
              Итого
            </td>
            <td className="ce-num ce-readonly ce-total-cell">{formatMoney(grandTotal)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
