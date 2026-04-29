import { memo, type Dispatch, type SetStateAction } from "react";

import { TextField, formatArea, formatMeters, formatMoney } from "./";
import type { CalculatorWarmFloorRoom, WarmFloorEditState } from "./";
import type { WarmFloorRoomEdit } from "./";

type WarmFloorRoomCardProps = {
  room: CalculatorWarmFloorRoom;
  edit: WarmFloorRoomEdit | undefined;
  expanded: boolean;
  setExpandedRoomId: Dispatch<SetStateAction<number | null>>;
  setWarmFloorState: Dispatch<SetStateAction<WarmFloorEditState>>;
};

export const WarmFloorRoomCard = memo(function WarmFloorRoomCard(props: WarmFloorRoomCardProps) {
  const { room, edit, expanded, setExpandedRoomId, setWarmFloorState } = props;
  const selected = edit?.selected ?? room.selected;

  return (
    <div
      className={
        selected
          ? "dense-row dense-row-active flooring-room-card warmfloor-room-card"
          : "dense-row flooring-room-card warmfloor-room-card"
      }
    >
      <div
        className="warmfloor-room-strip"
        role="button"
        tabIndex={0}
        onClick={() => setExpandedRoomId((current) => (current === room.room_id ? null : room.room_id))}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpandedRoomId((current) => (current === room.room_id ? null : room.room_id));
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
                setWarmFloorState((current) => ({
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

        <div className="warmfloor-room-metrics" aria-label="Показатели помещения">
          <span>Основа {formatArea(room.base_floor_area_m2)}</span>
          <span>ТП {formatArea(room.effective_area_m2)}</span>
          <span>{formatMeters(room.pipe_m)}</span>
          <span>{room.contours} конт.</span>
          {room.zone_label ? <span>{room.zone_label}</span> : null}
        </div>

        <div className="warmfloor-room-actions">
          <div className="flooring-room-amount">{formatMoney(room.work_total)}</div>
          <span
            className={
              expanded
                ? "flooring-room-chevron flooring-room-chevron-open warmfloor-room-edit"
                : "flooring-room-chevron warmfloor-room-edit"
            }
          >
            ⌄
          </span>
        </div>
      </div>

      <div className={expanded ? "flooring-room-body flooring-room-body-open" : "flooring-room-body"}>
        <div className="flooring-room-body-inner">
          <div className="warmfloor-room-editor">
            <TextField
              label="Площадь ТП вручную, м²"
              size="compact"
              value={edit?.area_m2_override ?? ""}
              onChange={(value) =>
                setWarmFloorState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, area_m2_override: value } : item,
                  ),
                }))
              }
              placeholder="Пусто = площадь комнаты"
            />
            <TextField
              label="Примечание"
              size="compact"
              value={edit?.note ?? ""}
              onChange={(value) =>
                setWarmFloorState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) => (item.room_id === room.room_id ? { ...item, note: value } : item)),
                }))
              }
              placeholder="Например, только свободная зона"
            />
          </div>
        </div>
      </div>
    </div>
  );
}, areWarmFloorRoomCardPropsEqual);

function areWarmFloorRoomCardPropsEqual(prev: Readonly<WarmFloorRoomCardProps>, next: Readonly<WarmFloorRoomCardProps>) {
  return (
    prev.expanded === next.expanded &&
    prev.room.room_id === next.room.room_id &&
    prev.room.room_name === next.room.room_name &&
    prev.room.selected === next.room.selected &&
    prev.room.base_floor_area_m2 === next.room.base_floor_area_m2 &&
    prev.room.effective_area_m2 === next.room.effective_area_m2 &&
    prev.room.pipe_m === next.room.pipe_m &&
    prev.room.contours === next.room.contours &&
    prev.room.zone_label === next.room.zone_label &&
    prev.room.work_total === next.room.work_total &&
    prev.edit?.selected === next.edit?.selected &&
    prev.edit?.area_m2_override === next.edit?.area_m2_override &&
    prev.edit?.note === next.edit?.note
  );
}
