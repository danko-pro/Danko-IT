import { useRef } from "react";

import { MetricChip, WarmFloorSettingsPanel, formatArea, formatMeters, formatMoney, trimFloat } from "./";
import { useCalculatorSceneHeight } from "../stage/use-scene-height";
import type { CalculatorWarmFloorSpecItem, WarmFloorStageReadyProps } from "./";

type WarmFloorPanelMode = "settings" | "summary" | "estimate";
type WarmFloorStageSummaryColumnProps = WarmFloorStageReadyProps & { panelMode: WarmFloorPanelMode };

function getAutosaveLabel(state: WarmFloorStageReadyProps["autosaveState"]): string {
  switch (state) {
    case "pending":
      return "Сохранится автоматически";
    case "saving":
      return "Сохраняю...";
    case "saved":
      return "Сохранено";
    case "error":
      return "Ошибка сохранения";
    default:
      return "Автосохранение";
  }
}

export function WarmFloorStageSummaryColumn(props: WarmFloorStageSummaryColumnProps) {
  const { panelMode, warmFloorPreview, setWarmFloorState, warmFloorState, autosaveState } = props;
  const summary = warmFloorPreview.summary;
  const pricePerSquare = summary.price_per_m2 === null ? "—" : formatMoney(summary.price_per_m2);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const estimateRef = useRef<HTMLDivElement | null>(null);
  const estimateTotal = warmFloorPreview.specification.reduce((sum, item) => sum + item.amount, 0);
  const refsByMode = { settings: settingsRef, summary: summaryRef, estimate: estimateRef };
  const stageHeight = useCalculatorSceneHeight(
    panelMode,
    refsByMode[panelMode],
    warmFloorPreview.specification.length,
  );

  function getSceneClass(mode: WarmFloorPanelMode): string {
    if (panelMode === mode) return "warmfloor-panel-scene warmfloor-panel-scene-active";
    if ((mode === "settings" && panelMode !== "settings") || (mode === "summary" && panelMode === "estimate")) {
      return "warmfloor-panel-scene warmfloor-panel-scene-hidden-left";
    }
    return "warmfloor-panel-scene warmfloor-panel-scene-hidden-right";
  }

  return (
    <div className="warmfloor-panel-scene-stage" style={stageHeight ? { height: `${stageHeight}px` } : undefined}>
      <div ref={settingsRef} className={getSceneClass("settings")}>
        <WarmFloorSettingsPanel warmFloorState={warmFloorState} setWarmFloorState={setWarmFloorState} />
      </div>

      <div ref={summaryRef} className={getSceneClass("summary")}>
        <div className="subpanel calculator-stage-section warmfloor-summary-panel p-3">
          <div className="calculator-stage-section-head">
            <div>
              <div className="calculator-stage-section-kicker">Свод по системе</div>
              <div className="calculator-stage-section-title">Итог и объёмы системы</div>
            </div>
            <div className="calculator-stage-inline-status">
              <span className="slot-chip">{getAutosaveLabel(autosaveState)}</span>
            </div>
          </div>

          <div className="warmfloor-summary-total">
            <div>
              <div className="warmfloor-summary-label">Итого по тёплому полу</div>
              <div className="warmfloor-summary-value">{formatMoney(summary.grand_total)}</div>
            </div>
            <div className="warmfloor-summary-rate">
              <span>Цена за м²</span>
              <strong>{pricePerSquare}</strong>
            </div>
          </div>

          <div className="warmfloor-summary-strip">
            <MetricChip label="Помещений" value={String(summary.rooms_count)} />
            <MetricChip label="Площадь" value={formatArea(summary.total_area_m2)} />
            <MetricChip label="Труба" value={formatMeters(summary.total_pipe_m)} />
            <MetricChip label="Контуры" value={String(summary.total_contours)} />
          </div>

          <div className="warmfloor-summary-note">Пересчитывается от выбранных помещений и параметров системы.</div>
        </div>
      </div>

      <div ref={estimateRef} className={getSceneClass("estimate")}>
        <div className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
          <div className="calculator-stage-section-head">
            <div>
              <div className="calculator-stage-section-kicker">Сметная ведомость</div>
              <div className="calculator-stage-section-title">Работы и подробная спецификация материалов</div>
            </div>
            <div className="calculator-stage-section-note">
              {warmFloorPreview.specification.length
                ? `${warmFloorPreview.specification.length} позиций · ${formatMoney(estimateTotal)}`
                : "Пока нет выбранных помещений."}
            </div>
          </div>

          {warmFloorPreview.specification.length ? (
            <div className="warmfloor-estimate-list">
              {warmFloorPreview.specification.map((item, index) => (
                <EstimateRow item={item} index={index} key={`${item.kind}-${item.title}-${index}`} />
              ))}
              <div className="warmfloor-estimate-total">
                <span>Итого по ведомости</span>
                <strong>{formatMoney(estimateTotal)}</strong>
              </div>
            </div>
          ) : (
            <div className="warmfloor-estimate-empty">Выберите помещения тёплого пола, чтобы собрать ведомость.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EstimateRow(props: { item: CalculatorWarmFloorSpecItem; index: number }) {
  const { item } = props;
  return (
    <div className="warmfloor-estimate-row-shell">
      <div className="warmfloor-estimate-row">
        <div className="warmfloor-estimate-main">
          <span className="warmfloor-estimate-kind">{item.kind === "work" ? "Работы" : "Материалы"}</span>
          <strong>{item.title}</strong>
        </div>
        <div className="warmfloor-estimate-meta">
          <span>
            {trimFloat(item.quantity)} {item.unit}
          </span>
          <strong>{formatMoney(item.amount)}</strong>
        </div>
      </div>
      {item.children?.length ? (
        <div className="warmfloor-estimate-children">
          {item.children.map((child, childIndex) => (
            <div className="warmfloor-estimate-child" key={`${child.title}-${childIndex}`}>
              <span>{child.title}</span>
              <strong>{formatMoney(child.amount)}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
