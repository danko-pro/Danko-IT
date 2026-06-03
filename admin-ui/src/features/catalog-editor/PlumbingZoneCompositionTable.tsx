import type { CatalogItem, ZoneCompositionRow } from "./plumbing-seed";
import { compositionQtyHint, formatMoney, itemUnitPrice } from "./plumbing-catalog-model";

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

export type PlumbingZoneCompositionTableProps = {
  rows: ZoneCompositionRow[];
  zoneId: string;
  scope: "base" | "variant";
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  zoneRowTotal: (row: { atomicItemId: string; quantity: number; coefficient?: number }) => number;
  onUpdateZoneRow: (
    zoneId: string,
    atomicItemId: string,
    field: "quantity" | "coefficient",
    value: string,
    scope?: "base" | "variant",
  ) => void;
  onRemoveZoneRow: (zoneId: string, atomicItemId: string) => void;
  onReplaceZoneVariantRow: (zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) => void;
  removable?: boolean;
};

export function PlumbingZoneCompositionTable(props: PlumbingZoneCompositionTableProps) {
  const {
    rows,
    zoneId,
    scope,
    itemsById,
    library,
    zoneRowTotal,
    onUpdateZoneRow,
    onRemoveZoneRow,
    onReplaceZoneVariantRow,
    removable = true,
  } = props;

  return rows.map((row) => {
    const item = itemsById.get(row.atomicItemId);
    const qtyHint = compositionQtyHint(row.atomicItemId, row.quantity, item?.unit);
    return (
      <tr key={`${scope}-${row.atomicItemId}`} className={item ? "" : "ce-row-missing"}>
        <td className="ce-col-id ce-mono ce-readonly">{row.atomicItemId}</td>
        <td>
          {scope === "variant" ? (
            <select
              className="ce-cell-input"
              value={row.atomicItemId}
              title="Заменить позицию в пакете"
              onChange={(event) => onReplaceZoneVariantRow(zoneId, row.atomicItemId, event.target.value)}
            >
              {variantReplacementCandidates(library, row.atomicItemId).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.publicTitle} — {formatMoney(itemUnitPrice(candidate))} ₽/{candidate.unit}
                </option>
              ))}
            </select>
          ) : (
            <span className="ce-readonly">{item ? item.publicTitle : "⚠ позиция не найдена в библиотеке"}</span>
          )}
        </td>
        <td className="ce-readonly">{item ? item.unit : "—"}</td>
        <td className="ce-num ce-readonly">{item ? formatMoney(itemUnitPrice(item)) : "0"}</td>
        <td>
          <input
            className="ce-cell-input ce-num"
            type="number"
            min={0}
            step={item?.unit === "м.п." ? "0.1" : item?.unit === "шт" ? "0.01" : "1"}
            value={row.quantity}
            onChange={(event) => onUpdateZoneRow(zoneId, row.atomicItemId, "quantity", event.target.value, scope)}
          />
          {qtyHint && <span className="ce-qty-hint">{qtyHint}</span>}
        </td>
        <td>
          <input
            className="ce-cell-input ce-num"
            type="number"
            step="0.01"
            placeholder="1"
            value={row.coefficient ?? ""}
            onChange={(event) =>
              onUpdateZoneRow(zoneId, row.atomicItemId, "coefficient", event.target.value, scope)
            }
          />
        </td>
        <td className="ce-num ce-readonly ce-total-cell">{formatMoney(zoneRowTotal(row))}</td>
        <td className="ce-col-actions">
          {removable && (
            <button
              type="button"
              className="ce-row-delete"
              title="Убрать из состава"
              onClick={() => onRemoveZoneRow(zoneId, row.atomicItemId)}
            >
              ✕
            </button>
          )}
        </td>
      </tr>
    );
  });
}
