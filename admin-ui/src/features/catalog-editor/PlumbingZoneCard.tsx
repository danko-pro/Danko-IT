import { useState } from "react";

import { TrashIcon } from "./CatalogEditorIcons";
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

const TITLE_PLACEHOLDER = "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0437\u043e\u043d\u044b";
const DESC_PLACEHOLDER = "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435";
const PACKAGE_LABEL = "\u041f\u0430\u043a\u0435\u0442";
const RISK_LABEL = "\u0420\u0435\u0437\u0435\u0440\u0432";
const ADD_ROW_LABEL =
  "+ \u041f\u043e\u0437\u0438\u0446\u0438\u044f";
const DELETE_TITLE = "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u043e\u043d\u0443";
const POSITIONS_LABEL = "\u043f\u043e\u0437.";
const TOTAL_TITLE = "\u0418\u0442\u043e\u0433\u043e \u0441 \u0440\u0435\u0437\u0435\u0440\u0432\u043e\u043c";

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
    <div className="ce-zone ce-plumbing-zone-detail-card">
      <header className="ce-zone-head">
        <button type="button" className="ce-disclosure ce-zone-detail-toggle" onClick={onToggle} aria-expanded={!collapsed}>
          <span className={`ce-chevron${collapsed ? "" : " is-open"}`}>{"\u25b6"}</span>
        </button>
        <input
          className="ce-zone-title"
          value={zone.title}
          onChange={(event) => onUpdateZone(zone.id, { title: event.target.value })}
          placeholder={TITLE_PLACEHOLDER}
        />
        <span className="ce-zone-count">{zoneCompositionRows(zone).length} {POSITIONS_LABEL}</span>
        <span className="ce-zone-total" title={TOTAL_TITLE}>
          {formatMoney(grandTotal)} {"\u20bd"}
        </span>
        <button
          type="button"
          className="ce-icon-action ce-icon-action-danger"
          title={DELETE_TITLE}
          aria-label={`${DELETE_TITLE}: ${zone.title}`}
          onClick={() => onRemoveZone(zone.id, zone.title)}
        >
          <TrashIcon className="ce-action-icon" />
        </button>
      </header>

      {!collapsed && (
        <div className="ce-zone-body">
          <div className="ce-zone-detail-controls">
            <input
              className="ce-zone-desc"
              value={zone.description ?? ""}
              onChange={(event) => onUpdateZone(zone.id, { description: event.target.value })}
              placeholder={DESC_PLACEHOLDER}
            />

            {zone.priceClassVariants && zone.priceClassVariants.length > 0 ? (
              <div className="ce-price-classes">
                <span className="ce-price-classes-label">{PACKAGE_LABEL}</span>
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
            ) : null}

            <label className="ce-zone-risk-label">
              {RISK_LABEL}
              <input
                className="ce-input ce-zone-risk-input"
                type="number"
                min={0}
                step="0.1"
                value={zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT}
                onChange={(event) => onUpdateZoneRiskPercent(zone.id, event.target.value)}
              />
            </label>

            <select className="ce-input ce-zone-pick" value={pickValue} onChange={(event) => handlePick(event.target.value)}>
              <option value="">{ADD_ROW_LABEL}</option>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.group}] {item.publicTitle} - {formatMoney(itemUnitPrice(item))} {"\u20bd"}/{item.unit}
                </option>
              ))}
            </select>
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
        </div>
      )}
    </div>
  );
}
