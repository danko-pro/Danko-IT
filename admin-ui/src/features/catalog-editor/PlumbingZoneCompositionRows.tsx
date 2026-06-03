import type { CatalogItem, ZoneCompositionRow } from "./plumbing-seed";
import { compositionQtyHint, formatMoney, itemUnitPrice } from "./plumbing-catalog-model";
import type { PlumbingZoneCompositionColumnKey } from "./PlumbingZoneCompositionColumns";

export type PlumbingZoneRowTotal = (row: {
  atomicItemId: string;
  quantity: number;
  coefficient?: number;
}) => number;

export type PlumbingZoneUpdateRow = (
  zoneId: string,
  atomicItemId: string,
  field: "quantity" | "coefficient",
  value: string,
  scope?: "base" | "variant",
) => void;

export type PlumbingZoneCompositionRowsProps = {
  rows: ZoneCompositionRow[];
  zoneId: string;
  scope: "base" | "variant";
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  zoneRowTotal: PlumbingZoneRowTotal;
  onUpdateZoneRow: PlumbingZoneUpdateRow;
  onRemoveZoneRow: (zoneId: string, atomicItemId: string) => void;
  onReplaceZoneVariantRow: (zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) => void;
  columnClass: (columnKey: PlumbingZoneCompositionColumnKey, className?: string) => string;
  removable?: boolean;
};

function variantReplacementCandidates(library: CatalogItem[], atomicItemId: string): CatalogItem[] {
  const isFaucet = atomicItemId.includes("faucet");
  const isSink = atomicItemId.includes("sink");
  const kitchen = library.filter((item) => item.group === "Кухня");
  if (isFaucet) {
    return kitchen.filter((item) => item.id.includes("faucet") || item.publicTitle.toLowerCase().includes("смеситель"));
  }
  if (isSink) {
    return kitchen.filter((item) => item.id.includes("sink") || item.publicTitle.toLowerCase().includes("мойк"));
  }
  return kitchen.length > 0 ? kitchen : library;
}

export function PlumbingZoneCompositionRows({
  rows,
  zoneId,
  scope,
  itemsById,
  library,
  zoneRowTotal,
  onUpdateZoneRow,
  onRemoveZoneRow,
  onReplaceZoneVariantRow,
  columnClass,
  removable = true,
}: PlumbingZoneCompositionRowsProps) {
  return rows.map((row) => {
    const item = itemsById.get(row.atomicItemId);
    const qtyHint = compositionQtyHint(row.atomicItemId, row.quantity, item?.unit);

    return (
      <tr key={`${scope}-${row.atomicItemId}`} className={item ? "" : "ce-row-missing"}>
        <td className={columnClass("id", "ce-zone-table-id ce-mono ce-readonly")} title={row.atomicItemId}>
          <span className="ce-zone-id-chip">{row.atomicItemId}</span>
        </td>
        <td className={columnClass("title", "ce-zone-table-title")}>
          {scope === "variant" ? (
            <select
              className="ce-cell-input ce-zone-item-select"
              value={row.atomicItemId}
              title="Заменить позицию в пакете"
              onChange={(event) => onReplaceZoneVariantRow(zoneId, row.atomicItemId, event.target.value)}
            >
              {variantReplacementCandidates(library, row.atomicItemId).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.publicTitle} - {formatMoney(itemUnitPrice(candidate))} ₽/{candidate.unit}
                </option>
              ))}
            </select>
          ) : (
            <span className="ce-readonly ce-zone-item-title" title={item?.publicTitle ?? row.atomicItemId}>
              {item ? item.publicTitle : "Позиция не найдена"}
            </span>
          )}
        </td>
        <td className={columnClass("unit", "ce-zone-table-unit ce-readonly")}>{item ? item.unit : "-"}</td>
        <td className={columnClass("price", "ce-readonly ce-zone-table-money")}>
          {item ? formatMoney(itemUnitPrice(item)) : "0"}
        </td>
        <td className={columnClass("qty", "ce-zone-table-input-cell")} title={qtyHint ?? undefined}>
          <input
            className="ce-cell-input ce-num ce-zone-number-input"
            type="number"
            min={0}
            title={qtyHint ?? undefined}
            step={item?.unit === "м.п." ? "0.1" : item?.unit === "шт" ? "0.01" : "1"}
            value={row.quantity}
            onChange={(event) => onUpdateZoneRow(zoneId, row.atomicItemId, "quantity", event.target.value, scope)}
          />
        </td>
        <td className={columnClass("coef", "ce-zone-table-input-cell")}>
          <input
            className="ce-cell-input ce-num ce-zone-number-input"
            type="number"
            step="0.01"
            placeholder="1"
            value={row.coefficient ?? ""}
            onChange={(event) =>
              onUpdateZoneRow(zoneId, row.atomicItemId, "coefficient", event.target.value, scope)
            }
          />
        </td>
        <td className={columnClass("total", "ce-readonly ce-total-cell")}>{formatMoney(zoneRowTotal(row))}</td>
        <td className={columnClass("actions", "ce-col-actions")}>
          {removable && (
            <button
              type="button"
              className="ce-row-delete"
              title="Убрать из состава"
              onClick={() => onRemoveZoneRow(zoneId, row.atomicItemId)}
            >
              ×
            </button>
          )}
        </td>
      </tr>
    );
  });
}
