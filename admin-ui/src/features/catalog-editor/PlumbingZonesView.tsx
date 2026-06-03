import {
  ZONE_SUBGROUP_LABELS,
  ZONE_SUBGROUPS,
  type CatalogItem,
  type CatalogZone,
  type ZoneSubgroup,
} from "./plumbing-seed";
import { formatMoney } from "./plumbing-catalog-model";
import { PlumbingZoneCard } from "./PlumbingZoneCard";

export type PlumbingZonesViewProps = {
  zones: CatalogZone[];
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  collapsedSubgroups: Set<string>;
  collapsedZones: Set<string>;
  sectionTotal: number;
  zoneSubtotal: (zone: CatalogZone) => number;
  zoneRiskAmount: (zone: CatalogZone) => number;
  zoneGrandTotal: (zone: CatalogZone) => number;
  zoneRiskPercent: (zone: CatalogZone) => number;
  zoneRowTotal: (row: { atomicItemId: string; quantity: number; coefficient?: number }) => number;
  onToggleSubgroup: (subgroup: string) => void;
  onToggleZone: (zoneId: string) => void;
  onAddZone: (subgroup: ZoneSubgroup) => void;
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

export function PlumbingZonesView(props: PlumbingZonesViewProps) {
  const { zones, itemsById, library, zoneGrandTotal, zoneRowTotal } = props;

  return (
    <div className="ce-zones">
      <div className="ce-meta">
        Подгрупп: <strong>{ZONE_SUBGROUPS.length}</strong> · Зон: <strong>{zones.length}</strong> · Итог раздела
        «Сантехника» (с резервом): <strong>{formatMoney(props.sectionTotal)} ₽</strong>
      </div>

      {ZONE_SUBGROUPS.map((subgroup) => {
        const subgroupZones = zones.filter((zone) => zone.subgroup === subgroup);
        const subgroupTotal = subgroupZones.reduce((sum, zone) => sum + zoneGrandTotal(zone), 0);
        const collapsed = props.collapsedSubgroups.has(subgroup);
        return (
          <section key={subgroup} className="ce-subgroup">
            <header className="ce-subgroup-head">
              <button
                type="button"
                className="ce-disclosure"
                onClick={() => props.onToggleSubgroup(subgroup)}
                aria-expanded={!collapsed}
              >
                <span className={`ce-chevron${collapsed ? "" : " is-open"}`}>▶</span>
                <span className="ce-subgroup-title">{ZONE_SUBGROUP_LABELS[subgroup]}</span>
                <span className="ce-subgroup-count">{subgroupZones.length} зон</span>
              </button>
              <div className="ce-subgroup-right">
                <span className="ce-subgroup-total">{formatMoney(subgroupTotal)} ₽</span>
                <button type="button" className="ce-btn ce-btn-primary ce-btn-sm" onClick={() => props.onAddZone(subgroup)}>
                  + Добавить зону
                </button>
              </div>
            </header>

            {!collapsed && (
              <div className="ce-subgroup-body">
                {subgroupZones.length === 0 ? (
                  <div className="ce-zone-empty">В подгруппе пока нет зон. Нажмите «Добавить зону».</div>
                ) : (
                  subgroupZones.map((zone) => (
                    <PlumbingZoneCard
                      key={zone.id}
                      zone={zone}
                      collapsed={props.collapsedZones.has(zone.id)}
                      itemsById={itemsById}
                      library={library}
                      subtotal={props.zoneSubtotal(zone)}
                      riskAmount={props.zoneRiskAmount(zone)}
                      grandTotal={props.zoneGrandTotal(zone)}
                      riskPercent={props.zoneRiskPercent(zone)}
                      zoneRowTotal={zoneRowTotal}
                      onToggle={() => props.onToggleZone(zone.id)}
                      onUpdateZone={props.onUpdateZone}
                      onUpdateZoneRiskPercent={props.onUpdateZoneRiskPercent}
                      onRemoveZone={props.onRemoveZone}
                      onAddZoneRow={props.onAddZoneRow}
                      onUpdateZoneRow={props.onUpdateZoneRow}
                      onRemoveZoneRow={props.onRemoveZoneRow}
                      onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
