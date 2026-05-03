import { MetricChip, SelectField, TextField, formatArea, formatMoney } from "./";
import type { WallFinishStageReadyProps } from "./";

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
            <div className="calculator-stage-section-kicker">Состав отделки</div>
            <div className="flooring-zone-balance">Покрытие, подготовка и способ монтажа для выбранного помещения</div>
          </div>
        </div>

        <div className="flooring-adaptive-grid flooring-adaptive-grid-main">
          <SelectField
            label="Отделка"
            size="compact"
            value={edit?.covering_id ?? ""}
            onChange={(value) => updateRoom(props, room.room_id, { covering_id: value })}
            options={[
              { value: "", label: "Не выбрано" },
              ...wallFinishDetail.coverings.map((item) => ({ value: String(item.id), label: item.title })),
            ]}
          />
          <SelectField
            label="Подготовка"
            size="compact"
            value={edit?.preparation_id ?? ""}
            onChange={(value) => updateRoom(props, room.room_id, { preparation_id: value })}
            options={[
              { value: "", label: "Без выбора" },
              ...wallFinishDetail.preparations.map((item) => ({ value: String(item.id), label: item.title })),
            ]}
          />
          <SelectField
            label="Способ монтажа"
            size="compact"
            value={edit?.layout_id ?? ""}
            onChange={(value) => updateRoom(props, room.room_id, { layout_id: value })}
            options={[
              { value: "", label: "Базовый" },
              ...wallFinishDetail.layouts.map((item) => ({ value: String(item.id), label: item.title })),
            ]}
          />
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
