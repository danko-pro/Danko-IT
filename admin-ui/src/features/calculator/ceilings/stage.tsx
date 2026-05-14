import type { CalculatorProjectDetail } from "../model/types";
import {
  CalculatorStageEmptyState,
  CalculatorStageSectionHeader,
  formatArea,
  formatMeters,
  formatMoney,
  MetricChip,
  trimFloat,
} from "../shared";
import { CalculatorStageShell } from "../stage/shell";
import type {
  CalculatorCeilingRoom,
  CalculatorCeilingSpecificationItem,
  CalculatorProjectCeilingItem,
} from "./model";

export type CeilingsStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
};

export function CeilingsStageSection(props: CeilingsStageSectionProps) {
  const ceilings = props.projectDetail?.ceilings ?? null;
  const summary = ceilings?.summary;
  const hasCeilingData = Boolean(ceilings && (ceilings.items.length > 0 || ceilings.rooms.length > 0));

  return (
    <CalculatorStageShell
      className="ceilings-stage"
      eyebrow="Потолки"
      title="Потолочный калькулятор"
      isReady={Boolean(props.projectDetail)}
    >
      {!ceilings ? (
        <CalculatorStageEmptyState>Сначала выберите объект калькулятора.</CalculatorStageEmptyState>
      ) : (
        <div className="space-y-4">
          <section className="subpanel calculator-stage-section warmfloor-summary-panel flooring-summary-panel p-3">
            <CalculatorStageSectionHeader
              kicker="Сводка"
              title="Потолки по объекту"
              note={
                ceilings.config?.package_code
                  ? `Пакет: ${ceilings.config.package_code}`
                  : "Пакет потолков не выбран"
              }
            />
            {summary ? (
              <>
                <div className="warmfloor-summary-total">
                  <div>
                    <div className="warmfloor-summary-label">Итого по потолкам</div>
                    <div className="warmfloor-summary-value">{formatMoney(summary.grand_total)}</div>
                  </div>
                  <div className="warmfloor-summary-rate">
                    {summary.enabled_items_count} / {summary.items_count} позиций включено
                  </div>
                </div>
                <div className="warmfloor-summary-strip">
                  <MetricChip label="Работы" value={formatMoney(summary.work_total)} />
                  <MetricChip label="Материалы" value={formatMoney(summary.material_total)} />
                  <MetricChip label="Оборудование" value={formatMoney(summary.equipment_total)} />
                  <MetricChip label="Расходники" value={formatMoney(summary.consumables_total)} />
                </div>
              </>
            ) : null}
            {!hasCeilingData ? (
              <CalculatorStageEmptyState>Потолочные позиции пока не добавлены.</CalculatorStageEmptyState>
            ) : null}
          </section>

          <CeilingRoomsList rooms={ceilings.rooms} />
          <CeilingItemsList items={ceilings.items} />
          <CeilingSpecificationList specification={ceilings.specification} />
        </div>
      )}
    </CalculatorStageShell>
  );
}

function CeilingRoomsList(props: { rooms: CalculatorCeilingRoom[] }) {
  return (
    <section className="subpanel calculator-stage-section p-3">
      <CalculatorStageSectionHeader
        kicker="Помещения"
        title="Потолочные настройки по комнатам"
        note={`${props.rooms.length} помещений`}
      />
      {props.rooms.length ? (
        <div className="warmfloor-estimate-list">
          {props.rooms.map((room) => (
            <article className="warmfloor-estimate-row-shell" key={room.room_id}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{room.is_enabled ? "Включено" : "Выключено"}</span>
                  <span>{room.room_name || `Помещение #${room.room_id}`}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>{formatArea(room.ceiling_area_m2)}</span>
                  <span>{formatMeters(room.perimeter_m)}</span>
                  <span>{room.package_code_snapshot || "Пакет не задан"}</span>
                </div>
              </div>
              {room.note ? <div className="warmfloor-estimate-children">{room.note}</div> : null}
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>По потолкам пока нет настроек помещений.</CalculatorStageEmptyState>
      )}
    </section>
  );
}

function CeilingItemsList(props: { items: CalculatorProjectCeilingItem[] }) {
  return (
    <section className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader kicker="Позиции" title="Потолочная ведомость" note={`${props.items.length} строк`} />
      {props.items.length ? (
        <div className="warmfloor-estimate-list">
          {props.items.map((item) => (
            <article className="warmfloor-estimate-row-shell" key={item.id}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{item.category_snapshot || "Потолки"}</span>
                  <span>{item.title_snapshot}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>
                    {trimFloat(item.quantity)} {item.unit_snapshot}
                  </span>
                  <span>{formatMoney(item.total)}</span>
                </div>
              </div>
              <div className="warmfloor-estimate-children">
                <CeilingMoneyBreakdown item={item} />
                {!item.is_enabled ? <span>Позиция выключена из итогов.</span> : null}
                {item.note_snapshot ? <span>{item.note_snapshot}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>Потолочные позиции пока не добавлены.</CalculatorStageEmptyState>
      )}
    </section>
  );
}

function CeilingSpecificationList(props: { specification: CalculatorCeilingSpecificationItem[] }) {
  return (
    <section className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader
        kicker="Спецификация"
        title="Сгруппированные потолочные позиции"
        note={`${props.specification.length} групп`}
      />
      {props.specification.length ? (
        <div className="warmfloor-estimate-list">
          {props.specification.map((item) => (
            <article className="warmfloor-estimate-row-shell" key={`${item.category}-${item.title}-${item.unit}`}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{item.category || "Потолки"}</span>
                  <span>{item.title}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>
                    {trimFloat(item.quantity)} {item.unit}
                  </span>
                  <span>{formatMoney(item.total)}</span>
                </div>
              </div>
              <div className="warmfloor-estimate-children">
                <CeilingMoneyBreakdown item={item} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>Спецификация по потолкам пока пустая.</CalculatorStageEmptyState>
      )}
    </section>
  );
}

function CeilingMoneyBreakdown(props: {
  item: Pick<
    CalculatorProjectCeilingItem | CalculatorCeilingSpecificationItem,
    "work_total" | "material_total" | "equipment_total" | "consumables_total"
  >;
}) {
  return (
    <>
      <span>Работы: {formatMoney(props.item.work_total)}</span>
      <span>Материалы: {formatMoney(props.item.material_total)}</span>
      <span>Оборудование: {formatMoney(props.item.equipment_total)}</span>
      <span>Расходники: {formatMoney(props.item.consumables_total)}</span>
    </>
  );
}
