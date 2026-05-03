import { memo, type Dispatch, type SetStateAction } from "react";

import { formatArea, formatMoney, toInteger } from "./";
import type {
  CalculatorWallFinishCovering,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishRoom,
  WallFinishEditState,
} from "./";

type WallFinishRoomEdit = WallFinishEditState["rooms"][number];

type WallFinishRoomCardProps = {
  room: CalculatorWallFinishRoom;
  edit: WallFinishRoomEdit | undefined;
  expanded: boolean;
  coverings: CalculatorWallFinishCovering[];
  preparations: CalculatorWallFinishPreparation[];
  layouts: CalculatorWallFinishLayout[];
  coveringById: Map<number, CalculatorWallFinishCovering>;
  preparationById: Map<number, CalculatorWallFinishPreparation>;
  layoutById: Map<number, CalculatorWallFinishLayout>;
  setExpandedRoomId: Dispatch<SetStateAction<number | null>>;
  setWallFinishState: Dispatch<SetStateAction<WallFinishEditState>>;
  openWallFinishRoomPanel: () => void;
  openWallFinishSummaryPanel: () => void;
};

export const WallFinishRoomCard = memo(function WallFinishRoomCard(props: WallFinishRoomCardProps) {
  const {
    room,
    edit,
    expanded,
    coveringById,
    preparationById,
    layoutById,
    setExpandedRoomId,
    setWallFinishState,
    openWallFinishRoomPanel,
    openWallFinishSummaryPanel,
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

  function selectRoom() {
    if (expanded) {
      setExpandedRoomId(null);
      openWallFinishSummaryPanel();
      return;
    }
    setExpandedRoomId(room.room_id);
    openWallFinishRoomPanel();
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
                setWallFinishState((current) => ({
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
          <span>Стены {formatArea(room.base_area_m2)}</span>
          <span>Расчет {formatArea(room.effective_area_m2)}</span>
          {coveringPreviewTitle ? <span>{coveringPreviewTitle}</span> : null}
          {layoutPreviewTitle ? <span>{layoutPreviewTitle}</span> : null}
          {preparationPreviewTitle ? <span>{preparationPreviewTitle}</span> : null}
        </div>

        <div className="flooring-room-parameter-chips" aria-label="Включенные параметры помещения">
          <span className={coveringPreviewTitle ? "" : "flooring-room-parameter-chip-muted"}>
            {coveringPreviewTitle ?? "Отделка не выбрана"}
          </span>
          <span className={preparationPreviewTitle ? "" : "flooring-room-parameter-chip-muted"}>
            {preparationPreviewTitle ?? "Без подготовки"}
          </span>
          <span className={layoutPreviewTitle ? "" : "flooring-room-parameter-chip-muted"}>
            {layoutPreviewTitle ?? "Базовый монтаж"}
          </span>
          {edit?.area_m2_override ? <span>Ручная площадь</span> : null}
        </div>

        <div className="warmfloor-room-actions">
          <div className="flooring-room-amount">{formatMoney(room.total_cost)}</div>
          <span className={expanded ? "flooring-room-active-dot flooring-room-active-dot-on" : "flooring-room-active-dot"} />
        </div>
      </div>
    </div>
  );
}, areWallFinishRoomCardPropsEqual);

function areWallFinishRoomCardPropsEqual(prev: Readonly<WallFinishRoomCardProps>, next: Readonly<WallFinishRoomCardProps>) {
  return (
    prev.expanded === next.expanded &&
    prev.coverings === next.coverings &&
    prev.preparations === next.preparations &&
    prev.layouts === next.layouts &&
    prev.coveringById === next.coveringById &&
    prev.preparationById === next.preparationById &&
    prev.layoutById === next.layoutById &&
    prev.room.room_id === next.room.room_id &&
    prev.room.room_name === next.room.room_name &&
    prev.room.selected === next.room.selected &&
    prev.room.covering_title === next.room.covering_title &&
    prev.room.preparation_title === next.room.preparation_title &&
    prev.room.layout_title === next.room.layout_title &&
    prev.room.base_area_m2 === next.room.base_area_m2 &&
    prev.room.effective_area_m2 === next.room.effective_area_m2 &&
    prev.room.total_cost === next.room.total_cost &&
    prev.edit?.selected === next.edit?.selected &&
    prev.edit?.covering_id === next.edit?.covering_id &&
    prev.edit?.preparation_id === next.edit?.preparation_id &&
    prev.edit?.layout_id === next.edit?.layout_id &&
    prev.edit?.area_m2_override === next.edit?.area_m2_override &&
    prev.edit?.note === next.edit?.note
  );
}
