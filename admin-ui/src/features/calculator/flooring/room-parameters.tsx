import { useRef, useState } from "react";

import { Button, DeleteButton } from "../../../shared/controls";
import { MetricChip, SelectField, TextField, formatArea, formatMeters, formatMoney, toNumber } from "./";
import type { FlooringStageReadyProps } from "./";
import { addZone, clampZoneArea, duplicateZone, removeZone, updateZone, updateZoneArea } from "./room-zone-actions";

type FlooringRoomParametersPanelProps = Pick<
  FlooringStageReadyProps,
  | "expandedFlooringRoomId"
  | "flooringPreview"
  | "flooringDetail"
  | "flooringRoomStateById"
  | "setFlooringState"
>;

export function FlooringRoomParametersPanel(props: FlooringRoomParametersPanelProps) {
  const { expandedFlooringRoomId, flooringPreview, flooringDetail, flooringRoomStateById, setFlooringState } = props;
  const room =
    flooringPreview.rooms.find((item) => item.room_id === expandedFlooringRoomId) ?? flooringPreview.rooms[0] ?? null;
  const edit = room ? flooringRoomStateById.get(room.room_id) : undefined;
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
  const plinthAuto = edit?.plinth_m_override === "";
  const displayPlinthMeters = room?.plinth_m ?? 0;

  if (!room) {
    return (
      <div className="subpanel calculator-stage-section p-3 flooring-room-params-empty">
        Добавьте помещение, чтобы настроить напольное покрытие.
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
        <MetricChip label="Площадь" value={formatArea(room.effective_area_m2)} />
        <MetricChip label="Закупка" value={formatArea(room.purchase_area_m2)} />
        <MetricChip label="Периметр" value={formatMeters(room.effective_perimeter_m)} />
        <MetricChip label="Плинтус" value={formatMeters(displayPlinthMeters)} />
      </div>

      <div className="flooring-zone-panel">
        <div className="flooring-zone-panel-head">
          <div>
            <div className="calculator-stage-section-kicker">Зоны покрытия</div>
            <div className={overusedArea > 0 ? "flooring-zone-balance flooring-zone-balance-error" : "flooring-zone-balance"}>
              Использовано {formatArea(usedArea)} из {formatArea(room.effective_area_m2)}
              {overusedArea > 0 ? ` · превышение ${formatArea(overusedArea)}` : ` · осталось ${formatArea(remainingArea)}`}
            </div>
          </div>
          <Button variant="micro" onClick={() => addZone(props, room.room_id, zones, remainingArea)}>
            + Зона
          </Button>
        </div>

        <div className="flooring-zone-list">
          {zones.map((zone, index) => (
            <div key={zone.id} className="flooring-zone-card">
              <div className="flooring-zone-card-head">
                <strong>Зона {index + 1}</strong>
                <span>{formatArea(toNumber(zone.area_m2) ?? (zones.length === 1 ? room.effective_area_m2 : 0))}</span>
              </div>
              <div className="flooring-adaptive-grid flooring-adaptive-grid-main">
                <div className="flooring-zone-input-shell">
                  <TextField
                    label="Площадь зоны, м2"
                    size="compact"
                    value={zone.area_m2}
                    onChange={(value) => {
                      const result = clampZoneArea(zones, zone.id, value, room.effective_area_m2);
                      if (zoneAreaErrorTimerById.current[zone.id]) window.clearTimeout(zoneAreaErrorTimerById.current[zone.id]);
                      setZoneAreaErrorById((current) => ({
                        ...current,
                        [zone.id]: result.exceeded ? `Максимум для этой зоны ${formatArea(result.maxArea)}` : "",
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
                  label="Покрытие"
                  size="compact"
                  value={zone.covering_id}
                  onChange={(value) => updateZone(props, room.room_id, zones, zone.id, { covering_id: value })}
                  options={[
                    { value: "", label: "Не выбрано" },
                    ...flooringDetail.coverings.map((item) => ({ value: String(item.id), label: item.title })),
                  ]}
                />
                <SelectField
                  label="Подготовка"
                  size="compact"
                  value={zone.preparation_id}
                  onChange={(value) => updateZone(props, room.room_id, zones, zone.id, { preparation_id: value })}
                  options={[
                    { value: "", label: "Без выбора" },
                    ...flooringDetail.preparations.map((item) => ({ value: String(item.id), label: item.title })),
                  ]}
                />
                <SelectField
                  label="Способ укладки"
                  size="compact"
                  value={zone.layout_id}
                  onChange={(value) => updateZone(props, room.room_id, zones, zone.id, { layout_id: value })}
                  options={[
                    { value: "", label: "Прямая / по умолчанию" },
                    ...flooringDetail.layouts.map((item) => ({ value: String(item.id), label: item.title })),
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
        <div className="calculator-stage-section-kicker">Плинтус</div>
        <div className="flooring-plinth-grid">
          <div className="flooring-plinth-column">
            <TextField
              label="Примечание"
              size="compact"
              value={edit?.note ?? ""}
              onChange={(value) => updateRoom(props, room.room_id, { note: value })}
              placeholder="Например, без подложки"
            />
          </div>
          <div className="flooring-plinth-meter-group">
            <label className="block">
              <div className="field-label field-label-compact">Расчет плинтуса</div>
              <span className="flooring-plinth-toggle">
                <input
                  type="checkbox"
                  checked={plinthAuto}
                  onChange={(event) => updateRoom(props, room.room_id, { plinth_m_override: event.target.checked ? "" : "0" })}
                />
                <span>Авторасчет по периметру помещения</span>
              </span>
            </label>
            <label className="block">
              <div className="field-label field-label-compact">Плинтус вручную, м.п.</div>
              <input
                className="text-input text-input-compact"
                value={plinthAuto ? formatMeters(room.effective_perimeter_m) : edit?.plinth_m_override ?? ""}
                disabled={plinthAuto}
                onChange={(event) => updateRoom(props, room.room_id, { plinth_m_override: event.target.value })}
                placeholder="Отдельный метраж"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function updateRoom(
  props: Pick<FlooringStageReadyProps, "setFlooringState">,
  roomId: number,
  patch: Partial<FlooringStageReadyProps["flooringState"]["rooms"][number]>,
) {
  props.setFlooringState((current) => ({
    ...current,
    rooms: current.rooms.map((item) => (item.room_id === roomId ? { ...item, ...patch } : item)),
  }));
}
