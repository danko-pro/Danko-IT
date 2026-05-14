import { useRef } from "react";

import {
  CalculatorStageEmptyState,
  CalculatorStageSectionHeader,
  formatArea,
  formatMeters,
  formatMoney,
  MetricChip,
  trimFloat,
} from "../shared";
import { useCalculatorSceneHeight } from "../stage/use-scene-height";
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

const panelOrder: CeilingsPanelMode[] = ["items", "rooms", "summary", "specification"];

function getSceneClass(activeMode: CeilingsPanelMode, mode: CeilingsPanelMode): string {
  if (activeMode === mode) {
    return "warmfloor-panel-scene warmfloor-panel-scene-active";
  }
  return panelOrder.indexOf(mode) < panelOrder.indexOf(activeMode)
    ? "warmfloor-panel-scene warmfloor-panel-scene-hidden-left"
    : "warmfloor-panel-scene warmfloor-panel-scene-hidden-right";
}

export function CeilingsSummaryColumn(props: CeilingsSummaryColumnProps) {
  const itemsRef = useRef<HTMLDivElement | null>(null);
  const roomsRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const specificationRef = useRef<HTMLDivElement | null>(null);
  const refsByMode = {
    items: itemsRef,
    rooms: roomsRef,
    summary: summaryRef,
    specification: specificationRef,
  };
  const sceneHeightState = useCalculatorSceneHeight(
    props.panelMode,
    refsByMode[props.panelMode],
    `${props.ceilings.items.length}:${props.ceilings.rooms.length}:${props.ceilings.specification.length}:${props.ceilings.summary.grand_total}`,
  );

  return (
    <div
      className="warmfloor-panel-scene-stage"
      data-height-motion={sceneHeightState.motion}
      style={sceneHeightState.height ? { height: `${sceneHeightState.height}px` } : undefined}
    >
      <div ref={itemsRef} className={getSceneClass(props.panelMode, "items")}>
        <CeilingItemsPanel items={props.ceilings.items} />
      </div>

      <div ref={roomsRef} className={getSceneClass(props.panelMode, "rooms")}>
        <CeilingRoomsPanel rooms={props.ceilings.rooms} />
      </div>

      <div ref={summaryRef} className={getSceneClass(props.panelMode, "summary")}>
        <CeilingSummaryPanel ceilings={props.ceilings} configPackageCode={props.configPackageCode} />
      </div>

      <div ref={specificationRef} className={getSceneClass(props.panelMode, "specification")}>
        <CeilingSpecificationPanel specification={props.ceilings.specification} />
      </div>
    </div>
  );
}

function CeilingSummaryPanel(props: { ceilings: CalculatorCeilingsDetail; configPackageCode: string | null }) {
  const summary = props.ceilings.summary;

  return (
    <div className="subpanel calculator-stage-section warmfloor-summary-panel flooring-summary-panel p-3">
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
          <span>Позиций включено</span>
          <strong>
            {summary.enabled_items_count} / {summary.items_count}
          </strong>
        </div>
      </div>

      <div className="warmfloor-summary-strip">
        <MetricChip label="Работы" value={formatMoney(summary.work_total)} />
        <MetricChip label="Материалы" value={formatMoney(summary.material_total)} />
        <MetricChip label="Оборудование" value={formatMoney(summary.equipment_total)} />
        <MetricChip label="Расходники" value={formatMoney(summary.consumables_total)} />
      </div>

      <div className="warmfloor-summary-two-column">
        <MetricChip label="Всего позиций" value={String(summary.items_count)} />
        <MetricChip label="Включено" value={String(summary.enabled_items_count)} />
      </div>

      <div className="warmfloor-summary-note">
        Сводка собирается из сохраненных потолочных позиций. Оборудование и расходники учитываются в общем материальном блоке объекта.
      </div>
    </div>
  );
}

function CeilingRoomsPanel(props: { rooms: CalculatorCeilingRoom[] }) {
  return (
    <div className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
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
    <div className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader
        kicker="Позиции"
        title="Краткая ведомость"
        note={props.items.length ? `${props.items.length} строк` : "Добавьте первую позицию в рабочей зоне"}
      />
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
        <CalculatorStageEmptyState>
          Потолочные позиции пока не добавлены. Используйте кнопку «Добавить позицию» в основной колонке.
        </CalculatorStageEmptyState>
      )}
    </div>
  );
}

function CeilingSpecificationPanel(props: { specification: CalculatorCeilingSpecificationItem[] }) {
  const specificationTotal = props.specification.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader
        kicker="Спецификация"
        title="Сгруппированные потолочные позиции"
        note={props.specification.length ? `${props.specification.length} групп · ${formatMoney(specificationTotal)}` : "Спецификация пока пустая"}
      />
      {props.specification.length ? (
        <div className="flooring-estimate-document">
          <section className="flooring-estimate-section">
            <div className="flooring-estimate-table">
              <div className="flooring-estimate-table-head">
                <span>Позиция</span>
                <span>Кол-во</span>
                <span>Ед.</span>
                <span>Сумма</span>
              </div>
              {props.specification.map((item) => (
                <div className="flooring-estimate-table-row" key={`${item.category}-${item.title}-${item.unit}`}>
                  <span>{item.title}</span>
                  <span>{trimFloat(item.quantity)}</span>
                  <span>{item.unit}</span>
                  <strong>{formatMoney(item.total)}</strong>
                </div>
              ))}
            </div>
            <div className="flooring-estimate-section-total">
              <span>Итого по спецификации</span>
              <strong>{formatMoney(specificationTotal)}</strong>
            </div>
          </section>
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
