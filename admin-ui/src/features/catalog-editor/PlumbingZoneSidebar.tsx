import { PlusIcon } from "./CatalogEditorIcons";
import { CatalogIconAction } from "./CatalogIconAction";
import type { CatalogZone, ZoneSubgroup } from "./plumbing-seed";
import { formatMoney, zoneCompositionRows, zoneRiskPercent } from "./plumbing-catalog-model";

export type PlumbingZoneSidebarProps = {
  zones: CatalogZone[];
  subgroup: ZoneSubgroup;
  subgroupLabel: string;
  collapsed: boolean;
  selectedZoneId: string | null;
  subgroupTotal: number;
  zoneGrandTotal: (zone: CatalogZone) => number;
  onToggleSubgroup: (subgroup: string) => void;
  onAddZone: (subgroup: ZoneSubgroup) => void;
  onSelectZone: (zone: CatalogZone) => void;
};

const ADD_ZONE_TITLE = "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0437\u043e\u043d\u0443";
const EMPTY_LABEL = "\u041d\u0435\u0442 \u0437\u043e\u043d";
const POSITIONS_LABEL = "\u043f\u043e\u0437.";
const RISK_LABEL = "\u0440\u0435\u0437.";

export function PlumbingZoneSidebar({
  zones,
  subgroup,
  subgroupLabel,
  collapsed,
  selectedZoneId,
  subgroupTotal,
  zoneGrandTotal,
  onToggleSubgroup,
  onAddZone,
  onSelectZone,
}: PlumbingZoneSidebarProps) {
  return (
    <section className="ce-plumbing-zone-sidebar-section">
      <header className="ce-plumbing-zone-sidebar-head">
        <button
          type="button"
          className="ce-plumbing-zone-sidebar-toggle"
          onClick={() => onToggleSubgroup(subgroup)}
          aria-expanded={!collapsed}
        >
          <span className={`ce-chevron${collapsed ? "" : " is-open"}`}>{"\u25b6"}</span>
          <span className="ce-plumbing-zone-sidebar-title">{subgroupLabel}</span>
          <span className="ce-plumbing-zone-sidebar-count">{zones.length}</span>
        </button>
        <span className="ce-plumbing-zone-sidebar-total">{formatMoney(subgroupTotal)} {"\u20bd"}</span>
        <CatalogIconAction
          variant="primary"
          className="ce-plumbing-zone-add-btn"
          icon={<PlusIcon className="ce-action-icon" />}
          title={ADD_ZONE_TITLE}
          ariaLabel={`${ADD_ZONE_TITLE}: ${subgroupLabel}`}
          onClick={() => onAddZone(subgroup)}
        />
      </header>

      {!collapsed ? (
        <div className="ce-plumbing-zone-card-list" role="listbox" aria-label={subgroupLabel}>
          {zones.length === 0 ? (
            <div className="ce-plumbing-zone-sidebar-empty">{EMPTY_LABEL}</div>
          ) : (
            zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                role="option"
                aria-selected={zone.id === selectedZoneId}
                className={`ce-plumbing-zone-card${zone.id === selectedZoneId ? " is-selected" : ""}`}
                onClick={() => onSelectZone(zone)}
              >
                <span className="ce-plumbing-zone-card-copy">
                  <span className="ce-plumbing-zone-card-title" title={zone.title}>
                    {zone.title}
                  </span>
                  <span className="ce-plumbing-zone-card-desc" title={zone.description || zone.id}>
                    {zone.description || zone.id}
                  </span>
                </span>
                <span className="ce-plumbing-zone-card-metrics">
                  <span title={POSITIONS_LABEL}>
                    {zoneCompositionRows(zone).length} {POSITIONS_LABEL}
                  </span>
                  <span title={`${RISK_LABEL} ${zoneRiskPercent(zone)}%`}>
                    {RISK_LABEL} {zoneRiskPercent(zone)}%
                  </span>
                  <strong>{formatMoney(zoneGrandTotal(zone))} {"\u20bd"}</strong>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
