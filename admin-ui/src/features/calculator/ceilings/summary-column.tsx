import {
  CalculatorStageEmptyState,
  CalculatorStageSectionHeader,
  formatArea,
  formatMeters,
  formatMoney,
  MetricChip,
  trimFloat,
} from "../shared";
import type {
  CalculatorCeilingRoom,
  CalculatorCeilingSpecificationItem,
  CalculatorCeilingsDetail,
  CalculatorProjectCeilingItem,
} from "./model";

export type CeilingsPanelMode = "items" | "rooms" | "summary" | "specification";

type CeilingsSummaryColumnProps = {
  ceilings: CalculatorCeilingsDetail;
  configPackageCode: string | null;
  panelMode: CeilingsPanelMode;
};

export function CeilingsSummaryColumn(props: CeilingsSummaryColumnProps) {
  if (props.panelMode === "rooms") {
    return <CeilingRoomsPanel rooms={props.ceilings.rooms} />;
  }

  if (props.panelMode === "specification") {
    return <CeilingSpecificationPanel specification={props.ceilings.specification} />;
  }

  if (props.panelMode === "items") {
    return <CeilingItemsPanel items={props.ceilings.items} />;
  }

  return <CeilingSummaryPanel ceilings={props.ceilings} configPackageCode={props.configPackageCode} />;
}

function CeilingSummaryPanel(props: { ceilings: CalculatorCeilingsDetail; configPackageCode: string | null }) {
  const summary = props.ceilings.summary;

  return (
    <div className="space-y-3">
      <CalculatorStageSectionHeader
        kicker="Сводка"
        title="Потолки по объекту"
        note={props.configPackageCode ? `Пакет: ${props.configPackageCode}` : "Пакет потолков не выбран"}
      />
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
      {props.ceilings.items.length === 0 ? (
        <CalculatorStageEmptyState>Потолочные позиции пока не добавлены.</CalculatorStageEmptyState>
      ) : null}
    </div>
  );
}

function CeilingRoomsPanel(props: { rooms: CalculatorCeilingRoom[] }) {
  return (
    <div className="space-y-3">
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
                  <span>{formatArea(room.ceiling_area_m2 ?? room.base_ceiling_area_m2 ?? 0)}</span>
                  <span>{formatMeters(room.perimeter_m ?? room.base_perimeter_m ?? 0)}</span>
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
    </div>
  );
}

function CeilingItemsPanel(props: { items: CalculatorProjectCeilingItem[] }) {
  return (
    <div className="space-y-3">
      <CalculatorStageSectionHeader kicker="Позиции" title="Краткая ведомость" note={`${props.items.length} строк`} />
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
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>Потолочные позиции пока не добавлены.</CalculatorStageEmptyState>
      )}
    </div>
  );
}

function CeilingSpecificationPanel(props: { specification: CalculatorCeilingSpecificationItem[] }) {
  return (
    <div className="space-y-3">
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
    </div>
  );
}

export function CeilingMoneyBreakdown(props: {
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
