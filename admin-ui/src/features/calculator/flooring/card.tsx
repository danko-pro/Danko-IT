import { memo, type Dispatch, type SetStateAction } from "react";

import { formatArea, formatMeters, formatMoney, toInteger } from "./";
import type {
  CalculatorFlooringCovering,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  CalculatorFlooringRoom,
  FlooringEditState,
} from "./";

type FlooringRoomEdit = FlooringEditState["rooms"][number];
type FlooringRoomZoneEdit = FlooringRoomEdit["zones"][number];
type FlooringRoomZonePreview = NonNullable<CalculatorFlooringRoom["zones"]>[number];

type FlooringRoomCardProps = {
  room: CalculatorFlooringRoom;
  edit: FlooringRoomEdit | undefined;
  expanded: boolean;
  coveringById: Map<number, CalculatorFlooringCovering>;
  preparationById: Map<number, CalculatorFlooringPreparation>;
  layoutById: Map<number, CalculatorFlooringLayout>;
  flooringState: FlooringEditState;
  setExpandedRoomId: Dispatch<SetStateAction<number | null>>;
  setFlooringState: Dispatch<SetStateAction<FlooringEditState>>;
  openFlooringRoomPanel: () => void;
  openFlooringSummaryPanel: () => void;
};

export const FlooringRoomCard = memo(function FlooringRoomCard(props: FlooringRoomCardProps) {
  const {
    room,
    edit,
    expanded,
    coveringById,
    preparationById,
    layoutById,
    flooringState,
    setExpandedRoomId,
    setFlooringState,
    openFlooringRoomPanel,
    openFlooringSummaryPanel,
  } = props;
  const selected = edit?.selected ?? room.selected;
  const coveringPreviewId = toInteger(edit?.covering_id ?? "");
  const preparationPreviewId = toInteger(edit?.preparation_id ?? "");
  const layoutPreviewId = toInteger(edit?.layout_id ?? "");
  const coveringPreviewTitle =
    (coveringPreviewId !== null ? coveringById.get(coveringPreviewId)?.title : null) ?? room.covering_title;
  const preparationPreviewTitle =
    (preparationPreviewId !== null ? preparationById.get(preparationPreviewId)?.title : null) ?? room.preparation_title;
  const layoutPreviewTitle =
    (layoutPreviewId !== null ? layoutById.get(layoutPreviewId)?.title : null) ?? room.layout_title;
  const zones = room.zones ?? [];
  const editZones = edit?.zones ?? [];
  const visibleZones = editZones.length > 0 ? editZones : zones;
  const zoneUsedArea = zones.reduce((total, zone) => total + zone.effective_area_m2, 0);
  const zoneRemainingArea = Math.max(0, room.effective_area_m2 - zoneUsedArea);
  const activeParameterChips = buildActiveParameterChips({
    room,
    edit,
    visibleZones,
    coveringById,
    preparationById,
    layoutById,
    flooringState,
    coveringPreviewTitle,
    preparationPreviewTitle,
    layoutPreviewTitle,
  });

  function selectRoom() {
    if (expanded) {
      setExpandedRoomId(null);
      openFlooringSummaryPanel();
      return;
    }
    setExpandedRoomId(room.room_id);
    openFlooringRoomPanel();
  }

  return (
    <div
      className={[
        "dense-row flooring-room-card warmfloor-room-card",
        selected ? "dense-row-active" : "",
        expanded ? "flooring-room-card-current" : "",
      ].join(" ")}
    >
      <div
        className="warmfloor-room-strip flooring-room-strip"
        role="button"
        tabIndex={0}
        onClick={selectRoom}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectRoom();
          }
        }}
      >
        <div className="warmfloor-room-identity">
          <label className="warmfloor-room-toggle" onClick={(event) => event.stopPropagation()}>
            <input
              className="warmfloor-room-toggle-input"
              type="checkbox"
              checked={selected}
              onChange={(event) =>
                setFlooringState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, selected: event.target.checked } : item,
                  ),
                }))
              }
            />
            <span className="warmfloor-room-toggle-box" aria-hidden="true">
              <span className="warmfloor-room-toggle-mark">✓</span>
            </span>
          </label>
          <div className="flooring-room-title warmfloor-room-title">{room.room_name}</div>
        </div>

        <div className="warmfloor-room-metrics flooring-room-metrics" aria-label="Показатели помещения">
          <span>Площадь {formatArea(room.base_area_m2)}</span>
          <span>Периметр {formatMeters(room.base_perimeter_m)}</span>
          {zones.length > 1 ? <span>{zones.length} зоны</span> : coveringPreviewTitle ? <span>{coveringPreviewTitle}</span> : null}
          {zones.length > 1 ? (
            <span>Остаток {formatArea(zoneRemainingArea)}</span>
          ) : layoutPreviewTitle ? (
            <span>{layoutPreviewTitle}</span>
          ) : null}
          {zones.length > 1 ? null : preparationPreviewTitle ? <span>{preparationPreviewTitle}</span> : null}
        </div>

        <div className="flooring-room-parameter-chips" aria-label="Включенные параметры помещения">
          {activeParameterChips.map((chip) => (
            <span className={chip.tone === "muted" ? "flooring-room-parameter-chip-muted" : ""} key={chip.key}>
              {chip.label}
            </span>
          ))}
        </div>

        <div className="warmfloor-room-actions">
          <div className="flooring-room-amount">{formatMoney(room.total_cost)}</div>
          <span className={expanded ? "flooring-room-active-dot flooring-room-active-dot-on" : "flooring-room-active-dot"} />
        </div>
      </div>
    </div>
  );
});

type ActiveParameterChip = {
  key: string;
  label: string;
  tone?: "muted";
};

function buildActiveParameterChips(props: {
  room: CalculatorFlooringRoom;
  edit: FlooringRoomEdit | undefined;
  visibleZones: Array<FlooringRoomZoneEdit | FlooringRoomZonePreview>;
  coveringById: Map<number, CalculatorFlooringCovering>;
  preparationById: Map<number, CalculatorFlooringPreparation>;
  layoutById: Map<number, CalculatorFlooringLayout>;
  flooringState: FlooringEditState;
  coveringPreviewTitle: string | null;
  preparationPreviewTitle: string | null;
  layoutPreviewTitle: string | null;
}): ActiveParameterChip[] {
  const chips: ActiveParameterChip[] = [];
  const zoneCount = props.visibleZones.length;

  if (zoneCount > 1) {
    const zoneCoverings = uniqueZoneTitles(props.visibleZones, "covering_id", "covering_title", props.coveringById);
    const zonePreparations = uniqueZoneTitles(
      props.visibleZones,
      "preparation_id",
      "preparation_title",
      props.preparationById,
    );
    const zoneLayouts = uniqueZoneTitles(props.visibleZones, "layout_id", "layout_title", props.layoutById);
    chips.push({ key: "zones", label: `${zoneCount} зоны` });
    chips.push({ key: "covering", label: zoneCoverings.length > 1 ? `${zoneCoverings.length} покрытия` : zoneCoverings[0] ?? "Покрытие не выбрано" });
    chips.push({ key: "preparation", label: zonePreparations.length > 1 ? `${zonePreparations.length} подготовки` : zonePreparations[0] ?? "Без подготовки" });
    chips.push({ key: "layout", label: zoneLayouts.length > 1 ? `${zoneLayouts.length} укладки` : zoneLayouts[0] ?? "Прямая укладка" });
  } else {
    chips.push({ key: "covering", label: props.coveringPreviewTitle ?? "Покрытие не выбрано", tone: props.coveringPreviewTitle ? undefined : "muted" });
    chips.push({ key: "preparation", label: props.preparationPreviewTitle ?? "Без подготовки", tone: props.preparationPreviewTitle ? undefined : "muted" });
    chips.push({ key: "layout", label: props.layoutPreviewTitle ?? "Прямая укладка", tone: props.layoutPreviewTitle ? undefined : "muted" });
  }

  if (isEnabled(props.flooringState.include_demolition)) chips.push({ key: "demolition", label: "Демонтаж" });
  if (isEnabled(props.flooringState.include_underlay) && props.room.underlay_cost > 0) {
    chips.push({ key: "underlay", label: `Подложка ${formatArea(props.room.underlay_qty)}` });
  }
  if (isEnabled(props.flooringState.include_plinth) && props.room.plinth_m > 0) {
    chips.push({ key: "plinth", label: `Плинтус ${formatMeters(props.room.plinth_m)}` });
  }
  if (props.edit?.area_m2_override || props.edit?.perimeter_m_override || props.edit?.plinth_m_override) {
    chips.push({ key: "manual", label: "Ручные метры" });
  }

  return chips.slice(0, 8);
}

function uniqueZoneTitles<T extends CalculatorFlooringCovering | CalculatorFlooringPreparation | CalculatorFlooringLayout>(
  zones: Array<FlooringRoomZoneEdit | FlooringRoomZonePreview>,
  idKey: "covering_id" | "preparation_id" | "layout_id",
  titleKey: "covering_title" | "preparation_title" | "layout_title",
  sourceById: Map<number, T>,
): string[] {
  const titles = new Set<string>();
  zones.forEach((zone) => {
    const rawId = zone[idKey];
    const id = typeof rawId === "string" ? toInteger(rawId) : rawId;
    const title = id !== null ? sourceById.get(id)?.title : undefined;
    const fallbackTitle = getZoneFallbackTitle(zone, titleKey);
    if (title || fallbackTitle) titles.add(title ?? String(fallbackTitle));
  });
  return Array.from(titles);
}

function getZoneFallbackTitle(
  zone: FlooringRoomZoneEdit | FlooringRoomZonePreview,
  titleKey: "covering_title" | "preparation_title" | "layout_title",
): string | null {
  if ("covering_title" in zone && titleKey === "covering_title") return zone.covering_title;
  if ("preparation_title" in zone && titleKey === "preparation_title") return zone.preparation_title;
  if ("layout_title" in zone && titleKey === "layout_title") return zone.layout_title;
  return null;
}

const isEnabled = (value: boolean | number) => value === true || value === 1;
