import { useRef, useState } from "react";

import { Button, DeleteButton } from "../../../shared/controls";
import { MetricChip, SelectField, TextField, formatArea, formatMoney, toNumber } from "./";
import type { WallFinishStageReadyProps } from "./";
import { addZone, clampZoneArea, duplicateZone, removeZone, updateZone, updateZoneArea } from "./room-zone-actions";

type WallFinishRoomParametersPanelProps = Pick<
  WallFinishStageReadyProps,
  | "expandedWallFinishRoomId"
  | "wallFinishPreview"
  | "wallFinishDetail"
  | "wallFinishRoomStateById"
  | "setWallFinishState"
>;

export function WallFinishRoomParametersPanel(props: WallFinishRoomParametersPanelProps) {
  const {
    expandedWallFinishRoomId,
    wallFinishPreview,
    wallFinishDetail,
    wallFinishRoomStateById,
    setWallFinishState,
  } = props;
  const room =
    wallFinishPreview.rooms.find((item) => item.room_id === expandedWallFinishRoomId) ??
    wallFinishPreview.rooms[0] ??
    null;
  const edit = room ? wallFinishRoomStateById.get(room.room_id) : undefined;
  const [zoneAreaErrorById, setZoneAreaErrorById] = useState<Record<string, string>>({});
  const zoneAreaErrorTimerById = useRef<Record<string, number>>({});
  const zones =
    edit?.zones?.length
      ? edit.zones
      : [
          {
            id: "1",
            covering_id: edit?.covering_id ?? "",
            preparation_id: edit?.preparation_id ?? "",
            layout_id: edit?.layout_id ?? "",
            area_m2: "",
            note: edit?.note ?? "",
          },
        ];
  const usedArea = zones.reduce((total, zone) => total + Math.max(0, toNumber(zone.area_m2) ?? 0), 0);
  const remainingArea = room ? Math.max(0, room.effective_area_m2 - usedArea) : 0;
  const overusedArea = room ? Math.max(0, usedArea - room.effective_area_m2) : 0;

  if (!room) {
    return (
      <div className="subpanel calculator-stage-section p-3 flooring-room-params-empty">
        Добавьте помещение, чтобы настроить отделку стен.
      </div>
    );
  }

  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3 flooring-room-params-panel">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Параметры помещения</div>
          <div className="calculator-stage-section-title">{room.room_name}</div>
        </div>
        <div className="calculator-stage-inline-status">
          <span className="slot-chip">{formatMoney(room.total_cost)}</span>
        </div>
      </div>

      <div className="warmfloor-summary-strip flooring-adaptive-metrics">
        <MetricChip label="Стены" value={formatArea(room.base_area_m2)} />
        <MetricChip label="Расчет" value={formatArea(room.effective_area_m2)} />
        <MetricChip label="Закупка" value={formatArea(room.purchase_area_m2)} />
        <MetricChip label="Итого" value={formatMoney(room.total_cost)} />
      </div>

      <div className="flooring-zone-panel">
        <div className="flooring-zone-panel-head">
          <div>
            <div className="calculator-stage-section-kicker">Участки отделки</div>
            <div className={overusedArea > 0 ? "flooring-zone-balance flooring-zone-balance-error" : "flooring-zone-balance"}>
              Использовано {formatArea(usedArea)} из {formatArea(room.effective_area_m2)}
              {overusedArea > 0 ? ` · превышение ${formatArea(overusedArea)}` : ` · осталось ${formatArea(remainingArea)}`}
            </div>
          </div>
          <Button variant="micro" onClick={() => addZone(props, room.room_id, zones, remainingArea)}>
            + Участок
          </Button>
        </div>

        <div className="flooring-zone-list">
          {zones.map((zone, index) => (
            <div key={zone.id} className="flooring-zone-card">
              <div className="flooring-zone-card-head">
                <strong>Участок {index + 1}</strong>
                <span>{formatArea(toNumber(zone.area_m2) ?? (zones.length === 1 ? room.effective_area_m2 : 0))}</span>
              </div>
              <div className="flooring-adaptive-grid flooring-adaptive-grid-main">
                <div className="flooring-zone-input-shell">
                  <TextField
                    label="Площадь участка, м²"
                    size="compact"
                    value={zone.area_m2}
                    onChange={(value) => {
                      const result = clampZoneArea(zones, zone.id, value, room.effective_area_m2);
                      if (zoneAreaErrorTimerById.current[zone.id]) window.clearTimeout(zoneAreaErrorTimerById.current[zone.id]);
                      setZoneAreaErrorById((current) => ({
                        ...current,
                        [zone.id]: result.exceeded ? `Максимум для этого участка ${formatArea(result.maxArea)}` : "",
                      }));
                      if (result.exceeded) {
                        zoneAreaErrorTimerById.current[zone.id] = window.setTimeout(() => {
                          setZoneAreaErrorById((current) => ({ ...current, [zone.id]: "" }));
                        }, 2200);
                      }
                      updateZoneArea(props, room.room_id, zones, zone.id, value, room.effective_area_m2);
                    }}
                    placeholder={zones.length === 1 ? "Вся площадь" : "Например, 6"}
                  />
                  {zoneAreaErrorById[zone.id] ? (
                    <div className="flooring-zone-input-popover">{zoneAreaErrorById[zone.id]}</div>
                  ) : null}
                </div>
                <SelectField
                  label="Отделка"
                  size="compact"
                  value={zone.covering_id}
                  onChange={(value) => updateZone(props, room.room_id, zones, zone.id, { covering_id: value })}
                  options={[
                    { value: "", label: "Не выбрано" },
                    ...wallFinishDetail.coverings.map((item) => ({ value: String(item.id), label: item.title })),
                  ]}
                />
                <SelectField
                  label="Подготовка"
                  size="compact"
                  value={zone.preparation_id}
                  onChange={(value) => updateZone(props, room.room_id, zones, zone.id, { preparation_id: value })}
                  options={[
                    { value: "", label: "Без выбора" },
                    ...wallFinishDetail.preparations.map((item) => ({ value: String(item.id), label: item.title })),
                  ]}
                />
                <SelectField
                  label="Способ монтажа"
                  size="compact"
                  value={zone.layout_id}
                  onChange={(value) => updateZone(props, room.room_id, zones, zone.id, { layout_id: value })}
                  options={[
                    { value: "", label: "Базовый" },
                    ...wallFinishDetail.layouts.map((item) => ({ value: String(item.id), label: item.title })),
                  ]}
                />
              </div>
              <div className="flooring-zone-actions">
                <Button variant="micro" onClick={() => duplicateZone(props, room.room_id, zones, zone)}>
                  Дублировать
                </Button>
                <DeleteButton
                  onClick={() => removeZone(props, room.room_id, zones, zone.id)}
                  disabled={zones.length <= 1}
                >
                  Удалить
                </DeleteButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flooring-room-extra-panel">
        <div className="calculator-stage-section-kicker">Уточнения</div>
        <div className="flooring-plinth-grid">
          <TextField
            label="Площадь вручную, м²"
            size="compact"
            value={edit?.area_m2_override ?? ""}
            onChange={(value) => updateRoom(props, room.room_id, { area_m2_override: value })}
            placeholder="Пусто = чистая площадь стен"
          />
          <TextField
            label="Примечание"
            size="compact"
            value={edit?.note ?? ""}
            onChange={(value) => updateRoom(props, room.room_id, { note: value })}
            placeholder="Например, только акцентная стена"
          />
        </div>
      </div>
    </div>
  );
}

function updateRoom(
  props: Pick<WallFinishStageReadyProps, "setWallFinishState">,
  roomId: number,
  patch: Partial<WallFinishStageReadyProps["wallFinishState"]["rooms"][number]>,
) {
  props.setWallFinishState((current) => ({
    ...current,
    rooms: current.rooms.map((item) => (item.room_id === roomId ? { ...item, ...patch } : item)),
  }));
}
