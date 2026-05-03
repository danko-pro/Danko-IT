import { formatArea, formatMoney, trimFloat } from "./";
import type { CalculatorWallFinishRoom, CalculatorWallFinishSpecItem, WallFinishStageReadyProps } from "./";

type WallFinishEstimatePanelProps = Pick<WallFinishStageReadyProps, "wallFinishPreview">;

export function WallFinishEstimatePanel(props: WallFinishEstimatePanelProps) {
  const { wallFinishPreview } = props;
  const estimateTotal = wallFinishPreview.specification.reduce((sum, item) => sum + item.amount, 0);
  const workItems = wallFinishPreview.specification.filter((item) => item.kind === "work");
  const materialItems = wallFinishPreview.specification.filter((item) => item.kind === "material");
  const selectedRooms = wallFinishPreview.rooms.filter((room) => room.selected);

  return (
    <div className="space-y-3">
      <div className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
        <div className="calculator-stage-section-head">
          <div>
            <div className="calculator-stage-section-kicker">Сметная ведомость</div>
            <div className="calculator-stage-section-title">Работы и материалы по отделке стен</div>
          </div>
          <div className="calculator-stage-section-note">
            {wallFinishPreview.specification.length
              ? `${wallFinishPreview.specification.length} позиций · ${formatMoney(estimateTotal)}`
              : "Пока нет выбранных помещений или отделки стен."}
          </div>
        </div>

        {wallFinishPreview.specification.length ? (
          <div className="flooring-estimate-document">
            <EstimateGroup title="Работы" items={workItems} />
            <EstimateGroup title="Материалы" items={materialItems} />
            <div className="flooring-estimate-grand-total">
              <span>Итого по ведомости</span>
              <strong>{formatMoney(estimateTotal)}</strong>
            </div>
          </div>
        ) : (
          <div className="warmfloor-estimate-empty">Выберите помещения и отделку, чтобы собрать ведомость.</div>
        )}
      </div>

      {selectedRooms.length ? (
        <div className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
          <div className="calculator-stage-section-head">
            <div>
              <div className="calculator-stage-section-kicker">Детализация</div>
              <div className="calculator-stage-section-title">Разбивка по помещениям</div>
            </div>
            <div className="calculator-stage-section-note">
              Площади, закупка, отделка, подготовка, монтаж и состав стоимости по каждой комнате.
            </div>
          </div>
          <div className="warmfloor-estimate-list">
            {selectedRooms.map((room) => (
              <RoomEstimateRow key={room.room_id} room={room} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EstimateGroup(props: { title: string; items: CalculatorWallFinishSpecItem[] }) {
  if (!props.items.length) {
    return null;
  }
  const total = props.items.reduce((sum, item) => sum + item.amount, 0);
  return (
    <section className="flooring-estimate-section">
      <div className="flooring-estimate-section-head">
        <strong>{props.title}</strong>
        <span>{props.items.length} позиций</span>
      </div>
      <div className="flooring-estimate-table">
        <div className="flooring-estimate-table-head">
          <span>Позиция</span>
          <span>Кол-во</span>
          <span>Ед.</span>
          <span>Сумма</span>
        </div>
        {props.items.map((item, index) => (
          <EstimateRow item={item} key={`${item.kind}-${item.title}-${index}`} />
        ))}
      </div>
      <div className="flooring-estimate-section-total">
        <span>Подытог раздела</span>
        <strong>{formatMoney(total)}</strong>
      </div>
    </section>
  );
}

function EstimateRow(props: { item: CalculatorWallFinishSpecItem }) {
  const { item } = props;
  return (
    <div className="flooring-estimate-table-row">
      <span>{item.title}</span>
      <span>{trimFloat(item.quantity)}</span>
      <span>{item.unit}</span>
      <strong>{formatMoney(item.amount)}</strong>
    </div>
  );
}

function RoomEstimateRow(props: { room: CalculatorWallFinishRoom }) {
  const { room } = props;
  return (
    <div className="warmfloor-estimate-row-shell">
      <div className="warmfloor-estimate-row">
        <div className="warmfloor-estimate-main">
          <span className="warmfloor-estimate-kind">
            {formatArea(room.effective_area_m2)} · закупка {formatArea(room.purchase_area_m2)}
          </span>
          <strong>{room.room_name}</strong>
          <span className="calculator-stage-note-line">
            {[room.covering_title, room.preparation_title, room.layout_title].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="warmfloor-estimate-meta">
          <span>Итого</span>
          <strong>{formatMoney(room.total_cost)}</strong>
        </div>
      </div>
      <div className="warmfloor-estimate-children">
        <CostChild title="Отделка" amount={room.material_cost} detail={`${trimFloat(room.purchase_area_m2)} м²`} />
        <CostChild title="Монтаж" amount={room.installation_cost} detail={`${trimFloat(room.effective_area_m2)} м²`} />
        <CostChild title="Подготовка" amount={room.preparation_total_cost} />
        <CostChild title="Клей" amount={room.glue_cost} detail={`${trimFloat(room.glue_qty)} ${room.glue_unit}`} />
        <CostChild title="Грунт" amount={room.primer_cost} detail={`${trimFloat(room.primer_qty)} ${room.primer_unit}`} />
        <CostChild title="Шпаклевка" amount={room.putty_cost} detail={`${trimFloat(room.putty_qty)} ${room.putty_unit}`} />
        <CostChild title="Сетка" amount={room.mesh_cost} detail={`${trimFloat(room.mesh_qty)} ${room.mesh_unit}`} />
        <CostChild title="Инструмент" amount={room.instrument_cost} />
        <CostChild title="Демонтаж" amount={room.demolition_cost} />
      </div>
    </div>
  );
}

function CostChild(props: { title: string; amount: number; detail?: string }) {
  if (props.amount <= 0) {
    return null;
  }
  return (
    <div className="warmfloor-estimate-child">
      <span>{props.detail ? `${props.title} · ${props.detail}` : props.title}</span>
      <strong>{formatMoney(props.amount)}</strong>
    </div>
  );
}
