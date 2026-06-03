import { useState } from "react";

import { DEFAULT_ZONE_RISK_PERCENT, type CatalogItem, type CatalogZone } from "./plumbing-seed";
import { formatMoney, itemUnitPrice, zoneCompositionRows } from "./plumbing-catalog-model";
import { PlumbingZoneCompositionTable } from "./PlumbingZoneCompositionTable";

export type PlumbingZoneCardProps = {
  zone: CatalogZone;
  collapsed: boolean;
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  subtotal: number;
  riskAmount: number;
  grandTotal: number;
  riskPercent: number;
  zoneRowTotal: (row: { atomicItemId: string; quantity: number; coefficient?: number }) => number;
  onToggle: () => void;
  onUpdateZone: (id: string, patch: Partial<CatalogZone>) => void;
  onUpdateZoneRiskPercent: (zoneId: string, value: string) => void;
  onRemoveZone: (id: string, title: string) => void;
  onAddZoneRow: (zoneId: string, atomicItemId: string) => void;
  onUpdateZoneRow: (
    zoneId: string,
    atomicItemId: string,
    field: "quantity" | "coefficient",
    value: string,
    scope?: "base" | "variant",
  ) => void;
  onRemoveZoneRow: (zoneId: string, atomicItemId: string) => void;
  onReplaceZoneVariantRow: (zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) => void;
};

export function PlumbingZoneCard({
  zone,
  collapsed,
  itemsById,
  library,
  subtotal,
  riskAmount,
  grandTotal,
  riskPercent,
  zoneRowTotal,
  onToggle,
  onUpdateZone,
  onUpdateZoneRiskPercent,
  onRemoveZone,
  onAddZoneRow,
  onUpdateZoneRow,
  onRemoveZoneRow,
  onReplaceZoneVariantRow,
}: PlumbingZoneCardProps) {
  const [pickValue, setPickValue] = useState("");

  function handlePick(value: string) {
    if (!value) return;
    onAddZoneRow(zone.id, value);
    setPickValue("");
  }

  return (
    <div className="ce-zone">
      <header className="ce-zone-head">
        <button type="button" className="ce-disclosure" onClick={onToggle} aria-expanded={!collapsed}>
          <span className={`ce-chevron${collapsed ? "" : " is-open"}`}>▶</span>
        </button>
        <input
          className="ce-zone-title"
          value={zone.title}
          onChange={(event) => onUpdateZone(zone.id, { title: event.target.value })}
          placeholder="Название зоны"
        />
        <span className="ce-zone-count">{zoneCompositionRows(zone).length} поз.</span>
        <span className="ce-zone-total" title="Итого с резервом">
          {formatMoney(grandTotal)} ₽
        </span>
        <button
          type="button"
          className="ce-row-delete"
          title="Удалить зону"
          onClick={() => onRemoveZone(zone.id, zone.title)}
        >
          ×
        </button>
      </header>

      {!collapsed && (
        <div className="ce-zone-body">
          <input
            className="ce-zone-desc"
            value={zone.description ?? ""}
            onChange={(event) => onUpdateZone(zone.id, { description: event.target.value })}
            placeholder="Описание зоны"
          />

          {zone.priceClassVariants && zone.priceClassVariants.length > 0 && (
            <div className="ce-price-classes">
              <span className="ce-price-classes-label">Пакет</span>
              <div className="ce-price-class-tabs">
                {zone.priceClassVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={`ce-price-class-tab${
                      (zone.activePriceClassId ?? zone.priceClassVariants![0].id) === variant.id ? " is-active" : ""
                    }`}
                    onClick={() => onUpdateZone(zone.id, { activePriceClassId: variant.id })}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ce-zone-risk-field">
            <label className="ce-zone-risk-label">
              Резерв, %
              <input
                className="ce-input ce-zone-risk-input"
                type="number"
                min={0}
                step="0.1"
                value={zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT}
                onChange={(event) => onUpdateZoneRiskPercent(zone.id, event.target.value)}
              />
            </label>
          </div>

          <PlumbingZoneCompositionTable
            zone={zone}
            itemsById={itemsById}
            library={library}
            subtotal={subtotal}
            riskAmount={riskAmount}
            grandTotal={grandTotal}
            riskPercent={riskPercent}
            zoneRowTotal={zoneRowTotal}
            onUpdateZoneRow={onUpdateZoneRow}
            onRemoveZoneRow={onRemoveZoneRow}
            onReplaceZoneVariantRow={onReplaceZoneVariantRow}
          />

          <div className="ce-zone-add">
            <select
              className="ce-input ce-zone-pick"
              value={pickValue}
              onChange={(event) => handlePick(event.target.value)}
            >
              <option value="">+ Добавить позицию в состав...</option>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.group}] {item.publicTitle} — {formatMoney(itemUnitPrice(item))} ₽/{item.unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
