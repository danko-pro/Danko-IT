import { useState } from "react";

import { DEFAULT_ZONE_RISK_PERCENT, type CatalogItem, type CatalogZone } from "./plumbing-seed";
import {
  activePriceClassVariant,
  formatMoney,
  itemUnitPrice,
  zoneCompositionRows,
} from "./plumbing-catalog-model";
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

export function PlumbingZoneCard(props: PlumbingZoneCardProps) {
  const { zone, itemsById, library, subtotal, riskAmount, grandTotal, riskPercent } = props;
  const [pickValue, setPickValue] = useState("");
  const activeVariant = activePriceClassVariant(zone);

  function handlePick(value: string) {
    if (!value) return;
    props.onAddZoneRow(zone.id, value);
    setPickValue("");
  }

  return (
    <div className="ce-zone">
      <header className="ce-zone-head">
        <button
          type="button"
          className="ce-disclosure"
          onClick={props.onToggle}
          aria-expanded={!props.collapsed}
        >
          <span className={`ce-chevron${props.collapsed ? "" : " is-open"}`}>▶</span>
        </button>
        <input
          className="ce-zone-title"
          value={zone.title}
          onChange={(event) => props.onUpdateZone(zone.id, { title: event.target.value })}
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
          onClick={() => props.onRemoveZone(zone.id, zone.title)}
        >
          ✕
        </button>
      </header>

      {!props.collapsed && (
        <div className="ce-zone-body">
          <input
            className="ce-zone-desc"
            value={zone.description ?? ""}
            onChange={(event) => props.onUpdateZone(zone.id, { description: event.target.value })}
            placeholder="Описание зоны (опционально)"
          />

          {zone.priceClassVariants && zone.priceClassVariants.length > 0 && (
            <div className="ce-price-classes">
              <span className="ce-price-classes-label">Пакет:</span>
              <div className="ce-price-class-tabs">
                {zone.priceClassVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={`ce-price-class-tab${
                      (zone.activePriceClassId ?? zone.priceClassVariants![0].id) === variant.id ? " is-active" : ""
                    }`}
                    onClick={() => props.onUpdateZone(zone.id, { activePriceClassId: variant.id })}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ce-zone-risk-field">
            <label className="ce-zone-risk-label">
              Резерв на неопределённость, %
              <input
                className="ce-input ce-zone-risk-input"
                type="number"
                min={0}
                step="0.1"
                value={zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT}
                onChange={(event) => props.onUpdateZoneRiskPercent(zone.id, event.target.value)}
              />
            </label>
          </div>

          <table className="ce-table ce-zone-table">
            <thead>
              <tr>
                <th className="ce-col-id">ID</th>
                <th className="ce-col-title">Позиция</th>
                <th className="ce-col-select">Ед.</th>
                <th className="ce-col-num">Цена за ед. ₽</th>
                <th className="ce-col-num">Кол-во</th>
                <th className="ce-col-num">Коэф.</th>
                <th className="ce-col-num ce-col-total">Итого ₽</th>
                <th className="ce-col-actions" aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {zone.items.length === 0 && !activeVariant?.items.length ? (
                <tr>
                  <td colSpan={8} className="ce-empty">
                    Состав пуст. Добавьте позицию из библиотеки ниже.
                  </td>
                </tr>
              ) : (
                <>
                  <PlumbingZoneCompositionTable
                    rows={zone.items}
                    zoneId={zone.id}
                    scope="base"
                    itemsById={itemsById}
                    library={library}
                    zoneRowTotal={props.zoneRowTotal}
                    onUpdateZoneRow={props.onUpdateZoneRow}
                    onRemoveZoneRow={props.onRemoveZoneRow}
                    onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
                  />
                  {activeVariant && activeVariant.items.length > 0 && (
                    <>
                      <tr className="ce-variant-separator">
                        <td colSpan={8}>
                          {activeVariant.label}: смеситель и мойка — выберите другую позицию в списке или измените кол-во
                        </td>
                      </tr>
                      <PlumbingZoneCompositionTable
                        rows={activeVariant.items}
                        zoneId={zone.id}
                        scope="variant"
                        itemsById={itemsById}
                        library={library}
                        zoneRowTotal={props.zoneRowTotal}
                        onUpdateZoneRow={props.onUpdateZoneRow}
                        onRemoveZoneRow={props.onRemoveZoneRow}
                        onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
                        removable={false}
                      />
                    </>
                  )}
                </>
              )}
              <tr className="ce-zone-summary-row">
                <td colSpan={6} className="ce-readonly ce-zone-summary-label">
                  Subtotal (атомы)
                </td>
                <td className="ce-num ce-readonly">{formatMoney(subtotal)}</td>
                <td />
              </tr>
              <tr className="ce-zone-summary-row ce-zone-summary-risk">
                <td colSpan={6} className="ce-readonly ce-zone-summary-label">
                  Резерв на неопределённость ({riskPercent}%)
                </td>
                <td className="ce-num ce-readonly">{formatMoney(riskAmount)}</td>
                <td />
              </tr>
              <tr className="ce-zone-summary-row ce-zone-summary-total">
                <td colSpan={6} className="ce-readonly ce-zone-summary-label">
                  Итого зоны
                </td>
                <td className="ce-num ce-readonly ce-total-cell">{formatMoney(grandTotal)}</td>
                <td />
              </tr>
            </tbody>
          </table>

          <div className="ce-zone-add">
            <select
              className="ce-input ce-zone-pick"
              value={pickValue}
              onChange={(event) => handlePick(event.target.value)}
            >
              <option value="">+ Добавить позицию в состав…</option>
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

// =================== Представление "Библиотека" ===================
