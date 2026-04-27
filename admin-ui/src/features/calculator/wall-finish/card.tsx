import { memo, type Dispatch, type SetStateAction } from "react";

import { SelectField, TextField, formatArea, formatMoney, toInteger } from "./";
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
};

export const WallFinishRoomCard = memo(function WallFinishRoomCard(props: WallFinishRoomCardProps) {
  const {
    room,
    edit,
    expanded,
    coverings,
    preparations,
    layouts,
    coveringById,
    preparationById,
    layoutById,
    setExpandedRoomId,
    setWallFinishState,
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
              setWallFinishState((current) => ({
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
              <span className="stat-chip">Стены: {formatArea(room.base_area_m2)}</span>
              {coveringPreviewTitle ? <span className="stat-chip">{coveringPreviewTitle}</span> : null}
              {layoutPreviewTitle ? <span className="stat-chip">{layoutPreviewTitle}</span> : null}
              {preparationPreviewTitle ? <span className="stat-chip">{preparationPreviewTitle}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flooring-room-amount">{formatMoney(room.total_cost)}</div>
          <span className={expanded ? "flooring-room-chevron flooring-room-chevron-open" : "flooring-room-chevron"}>⌄</span>
        </div>
      </div>

      <div className={expanded ? "flooring-room-body flooring-room-body-open" : "flooring-room-body"}>
        <div className="flooring-room-body-inner">
          <div className="grid gap-2 xl:grid-cols-3">
            <SelectField
              label="Отделка"
              value={edit?.covering_id ?? ""}
              onChange={(value) =>
                setWallFinishState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, covering_id: value } : item,
                  ),
                }))
              }
              options={[
                { value: "", label: "Не выбрано" },
                ...coverings.map((item) => ({ value: String(item.id), label: item.title })),
              ]}
            />
            <SelectField
              label="Подготовка"
              value={edit?.preparation_id ?? ""}
              onChange={(value) =>
                setWallFinishState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, preparation_id: value } : item,
                  ),
                }))
              }
              options={[
                { value: "", label: "Без выбора" },
                ...preparations.map((item) => ({ value: String(item.id), label: item.title })),
              ]}
            />
            <SelectField
              label="Способ монтажа"
              value={edit?.layout_id ?? ""}
              onChange={(value) =>
                setWallFinishState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, layout_id: value } : item,
                  ),
                }))
              }
              options={[
                { value: "", label: "Базовый" },
                ...layouts.map((item) => ({ value: String(item.id), label: item.title })),
              ]}
            />
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <TextField
              label="Площадь вручную, м²"
              value={edit?.area_m2_override ?? ""}
              onChange={(value) =>
                setWallFinishState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) =>
                    item.room_id === room.room_id ? { ...item, area_m2_override: value } : item,
                  ),
                }))
              }
              placeholder="Пусто = чистая площадь стен"
            />
            <TextField
              label="Примечание"
              value={edit?.note ?? ""}
              onChange={(value) =>
                setWallFinishState((current) => ({
                  ...current,
                  rooms: current.rooms.map((item) => (item.room_id === room.room_id ? { ...item, note: value } : item)),
                }))
              }
              placeholder="Например, только акцентная стена"
            />
          </div>
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
    prev.room.total_cost === next.room.total_cost &&
    prev.edit?.selected === next.edit?.selected &&
    prev.edit?.covering_id === next.edit?.covering_id &&
    prev.edit?.preparation_id === next.edit?.preparation_id &&
    prev.edit?.layout_id === next.edit?.layout_id &&
    prev.edit?.area_m2_override === next.edit?.area_m2_override &&
    prev.edit?.note === next.edit?.note
  );
}
