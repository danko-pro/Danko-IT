import { useEffect, useState } from "react";

import {
  ZONE_SUBGROUP_LABELS,
  ZONE_SUBGROUPS,
  type CatalogItem,
  type CatalogZone,
  type ZoneSubgroup,
} from "./plumbing-seed";
import { formatMoney } from "./plumbing-catalog-model";
import { PlumbingZoneCard } from "./PlumbingZoneCard";
import { PlumbingZoneSidebar } from "./PlumbingZoneSidebar";

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

const GROUPS_LABEL = "\u0433\u0440\u0443\u043f\u043f";
const ZONES_LABEL = "\u0437\u043e\u043d";
const EMPTY_LABEL = "\u0417\u043e\u043d\u044b \u0435\u0449\u0435 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u044b";

export function PlumbingZonesView(props: PlumbingZonesViewProps) {
  const { zones, itemsById, library, zoneGrandTotal, zoneRowTotal } = props;
  const [activeZoneId, setActiveZoneId] = useState<string | null>(() => zones[0]?.id ?? null);
  const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? zones[0] ?? null;

  useEffect(() => {
    if (activeZoneId && zones.some((zone) => zone.id === activeZoneId)) return;
    setActiveZoneId(zones[0]?.id ?? null);
  }, [activeZoneId, zones]);

  function handleSelectZone(zone: CatalogZone) {
    setActiveZoneId(zone.id);
    if (props.collapsedZones.has(zone.id)) {
      props.onToggleZone(zone.id);
    }
  }

  return (
    <div className="ce-zones ce-plumbing-zones">
      <div className="ce-plumbing-zones-summary">
        <span>
          <strong>{ZONE_SUBGROUPS.length}</strong> {GROUPS_LABEL}
        </span>
        <span>
          <strong>{zones.length}</strong> {ZONES_LABEL}
        </span>
        <span className="ce-plumbing-zones-summary-total">
          {formatMoney(props.sectionTotal)} {"\u20bd"}
        </span>
      </div>

      <section className="ce-plumbing-zones-workspace">
        <aside className="ce-plumbing-zone-sidebar" aria-label={ZONES_LABEL}>
          {ZONE_SUBGROUPS.map((subgroup) => {
            const subgroupZones = zones.filter((zone) => zone.subgroup === subgroup);
            const subgroupTotal = subgroupZones.reduce((sum, zone) => sum + zoneGrandTotal(zone), 0);

            return (
              <PlumbingZoneSidebar
                key={subgroup}
                subgroup={subgroup}
                subgroupLabel={ZONE_SUBGROUP_LABELS[subgroup]}
                zones={subgroupZones}
                collapsed={props.collapsedSubgroups.has(subgroup)}
                selectedZoneId={activeZone?.id ?? null}
                subgroupTotal={subgroupTotal}
                zoneGrandTotal={zoneGrandTotal}
                onToggleSubgroup={props.onToggleSubgroup}
                onAddZone={props.onAddZone}
                onSelectZone={handleSelectZone}
              />
            );
          })}
        </aside>

        <div className="ce-plumbing-zone-detail">
          {activeZone ? (
            <PlumbingZoneCard
              zone={activeZone}
              collapsed={props.collapsedZones.has(activeZone.id)}
              itemsById={itemsById}
              library={library}
              subtotal={props.zoneSubtotal(activeZone)}
              riskAmount={props.zoneRiskAmount(activeZone)}
              grandTotal={props.zoneGrandTotal(activeZone)}
              riskPercent={props.zoneRiskPercent(activeZone)}
              zoneRowTotal={zoneRowTotal}
              onToggle={() => props.onToggleZone(activeZone.id)}
              onUpdateZone={props.onUpdateZone}
              onUpdateZoneRiskPercent={props.onUpdateZoneRiskPercent}
              onRemoveZone={props.onRemoveZone}
              onAddZoneRow={props.onAddZoneRow}
              onUpdateZoneRow={props.onUpdateZoneRow}
              onRemoveZoneRow={props.onRemoveZoneRow}
              onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
            />
          ) : (
            <div className="ce-plumbing-zone-detail-empty">{EMPTY_LABEL}</div>
          )}
        </div>
      </section>
    </div>
  );
}
