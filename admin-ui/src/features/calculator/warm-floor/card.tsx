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
    <div className={selected ? "dense-row dense-row-active flooring-room-card" : "dense-row flooring-room-card"}>
      <div
        className="flooring-room-header"
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
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              setWarmFloorState((current) => ({
                ...current,
                rooms: current.rooms.map((item) =>
                  item.room_id === room.room_id ? { ...item, selected: event.target.checked } : item,
                ),
              }))
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flooring-room-title">{room.room_name}</div>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-400">
              <span className="stat-chip">Основа: {formatArea(room.base_floor_area_m2)}</span>
              <span className="stat-chip">ТП: {formatArea(room.effective_area_m2)}</span>
              <span className="stat-chip">Труба: {formatMeters(room.pipe_m)}</span>
              <span className="stat-chip">Контуры: {room.contours}</span>
              {room.zone_label ? <span className="slot-chip">{room.zone_label}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flooring-room-amount">{formatMoney(room.work_total)}</div>
          <span className={expanded ? "flooring-room-chevron flooring-room-chevron-open" : "flooring-room-chevron"}>⌄</span>
        </div>
      </div>

      <div className={expanded ? "flooring-room-body flooring-room-body-open" : "flooring-room-body"}>
        <div className="flooring-room-body-inner">
          <div className="grid gap-2 md:grid-cols-2">
            <TextField
              label="Площадь ТП вручную, м²"
              value={edit?.area_m2_override ?? ""}
              onChange={(value) =>
                setWarmFloorState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, area_m2_override: value } : item,
                  ),
                }))
              }
              placeholder="Пусто = брать площадь комнаты"
            />
            <TextField
              label="Примечание"
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
