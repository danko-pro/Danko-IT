import {
  FlooringEstimatePanel,
  FlooringRoomParametersPanel,
  FlooringSettingsPanel,
  FlooringStageCoveringCatalog,
  FlooringStageLayoutCatalog,
  FlooringStagePreparationCatalog,
} from "./";
import { MetricChip, formatArea, formatMeters, formatMoney, trimFloat } from "./";
import { useRef, useState, type ReactNode } from "react";
import { useCalculatorSceneHeight } from "../stage/use-scene-height";
import type { FlooringStageReadyProps } from "./";

type FlooringPanelMode = "room" | "settings" | "techmap" | "summary" | "estimate";
type FlooringTechMapMode = "coverings" | "preparations" | "layouts";
type FlooringStageSummaryColumnProps = FlooringStageReadyProps & { panelMode: FlooringPanelMode };

function getAutosaveLabel(state: FlooringStageReadyProps["autosaveState"]): string {
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

function getSceneClass(activeMode: FlooringPanelMode, mode: FlooringPanelMode): string {
  if (activeMode === mode) return "warmfloor-panel-scene warmfloor-panel-scene-active";
  if (
    (mode === "room" && activeMode !== "room") ||
    (mode === "settings" && (activeMode === "techmap" || activeMode === "summary" || activeMode === "estimate")) ||
    (mode === "techmap" && (activeMode === "summary" || activeMode === "estimate")) ||
    (mode === "summary" && activeMode === "estimate")
  ) {
    return "warmfloor-panel-scene warmfloor-panel-scene-hidden-left";
  }
  return "warmfloor-panel-scene warmfloor-panel-scene-hidden-right";
}

export function FlooringStageSummaryColumn(props: FlooringStageSummaryColumnProps) {
  const { panelMode, flooringPreview, setFlooringState, flooringState, autosaveState } = props;
  const [techMapMode, setTechMapMode] = useState<FlooringTechMapMode>("coverings");
  const summary = flooringPreview.summary;
  const pricePerSquare = summary.price_per_m2 === null ? "—" : formatMoney(summary.price_per_m2);
  const roomRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const techmapRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const estimateRef = useRef<HTMLDivElement | null>(null);
  const refsByMode = {
    room: roomRef,
    settings: settingsRef,
    techmap: techmapRef,
    summary: summaryRef,
    estimate: estimateRef,
  };
  const sceneHeightState = useCalculatorSceneHeight(
    panelMode,
    refsByMode[panelMode],
    `${techMapMode}:${flooringPreview.rooms.length}:${flooringPreview.specification.length}`,
  );

  return (
    <div
      className="warmfloor-panel-scene-stage"
      data-height-motion={sceneHeightState.motion}
      style={sceneHeightState.height ? { height: `${sceneHeightState.height}px` } : undefined}
    >
      <div ref={roomRef} className={getSceneClass(panelMode, "room")}>
        <FlooringRoomParametersPanel
          expandedFlooringRoomId={props.expandedFlooringRoomId}
          flooringPreview={flooringPreview}
          flooringDetail={props.flooringDetail}
          flooringRoomStateById={props.flooringRoomStateById}
          setFlooringState={setFlooringState}
        />
      </div>

      <div ref={settingsRef} className={getSceneClass(panelMode, "settings")}>
        <FlooringSettingsPanel
          flooringState={flooringState}
          setFlooringState={setFlooringState}
          resetFlooringState={props.resetFlooringState}
        />
      </div>

      <div ref={techmapRef} className={getSceneClass(panelMode, "techmap")}>
        <CatalogPanel
          title="Технологическая карта"
          note="Справочники норм, материалов и способов, из которых собираются помещения."
        >
          <div className="flooring-techmap-tabs">
            <TechMapTab active={techMapMode === "coverings"} onClick={() => setTechMapMode("coverings")}>
              Покрытия
            </TechMapTab>
            <TechMapTab active={techMapMode === "preparations"} onClick={() => setTechMapMode("preparations")}>
              Подготовка
            </TechMapTab>
            <TechMapTab active={techMapMode === "layouts"} onClick={() => setTechMapMode("layouts")}>
              Укладка
            </TechMapTab>
          </div>

          <div key={techMapMode} className="calculator-tab-content-motion">
            {techMapMode === "coverings" ? (
              <FlooringStageCoveringCatalog
                open
                flooringDetail={props.flooringDetail}
                flooringCoveringState={props.flooringCoveringState}
                setFlooringCoveringState={props.setFlooringCoveringState}
                busyKey={props.busyKey}
                submitFlooringCovering={props.submitFlooringCovering}
              />
            ) : null}
            {techMapMode === "preparations" ? (
              <FlooringStagePreparationCatalog
                open
                flooringDetail={props.flooringDetail}
                flooringPreparationState={props.flooringPreparationState}
                setFlooringPreparationState={props.setFlooringPreparationState}
                busyKey={props.busyKey}
                submitFlooringPreparation={props.submitFlooringPreparation}
              />
            ) : null}
            {techMapMode === "layouts" ? (
              <FlooringStageLayoutCatalog
                open
                flooringDetail={props.flooringDetail}
                flooringLayoutState={props.flooringLayoutState}
                setFlooringLayoutState={props.setFlooringLayoutState}
                busyKey={props.busyKey}
                submitFlooringLayout={props.submitFlooringLayout}
              />
            ) : null}
          </div>
        </CatalogPanel>
      </div>

      <div ref={summaryRef} className={getSceneClass(panelMode, "summary")}>
        <div className="subpanel calculator-stage-section warmfloor-summary-panel flooring-summary-panel p-3">
          <div className="calculator-stage-section-head">
            <div>
              <div className="calculator-stage-section-kicker">Свод по покрытиям</div>
              <div className="calculator-stage-section-title">Итог, площади и закупка</div>
            </div>
            <div className="calculator-stage-inline-status">
              <span className="slot-chip">{getAutosaveLabel(autosaveState)}</span>
            </div>
          </div>

          <div className="warmfloor-summary-total">
            <div>
              <div className="warmfloor-summary-label">Итого по напольным покрытиям</div>
              <div className="warmfloor-summary-value" data-testid="flooring-summary-grand-total">
                {formatMoney(summary.grand_total)}
              </div>
            </div>
            <div className="warmfloor-summary-rate">
              <span>Цена за м2</span>
              <strong>{pricePerSquare}</strong>
            </div>
          </div>

          <div className="warmfloor-summary-strip">
            <MetricChip label="Помещений" value={String(summary.rooms_count)} />
            <span data-testid="flooring-summary-area">
              <MetricChip label="Площадь" value={formatArea(summary.total_area_m2)} />
            </span>
            <MetricChip label="Закупка" value={formatArea(summary.total_purchase_area_m2)} />
            <MetricChip label="Плинтус" value={formatMeters(summary.total_plinth_m)} />
          </div>

          <div className="warmfloor-summary-two-column">
            <MetricChip label="Работы" value={formatMoney(summary.work_total)} />
            <MetricChip label="Материалы" value={formatMoney(summary.material_total)} />
            <MetricChip label="Подложка" value={`${trimFloat(summary.total_underlay_qty)} ${summary.underlay_unit}`} />
            <MetricChip label="Клей" value={`${trimFloat(summary.total_glue_qty)} ${summary.glue_unit}`} />
            <MetricChip label="Грунт" value={`${trimFloat(summary.total_primer_qty)} ${summary.primer_unit}`} />
            <MetricChip label="СВП" value={`${trimFloat(summary.total_svp_qty)} ${summary.svp_unit}`} />
            <MetricChip label="Затирка" value={`${trimFloat(summary.total_grout_qty)} ${summary.grout_unit}`} />
            <MetricChip label="Инструмент" value={formatMoney(summary.total_instrument_cost)} />
          </div>

          <div className="warmfloor-summary-note">
            Пересчитывается от выбранных помещений, покрытия, подготовки и способа укладки.
          </div>
        </div>
      </div>

      <div ref={estimateRef} className={getSceneClass(panelMode, "estimate")}>
        <FlooringEstimatePanel flooringPreview={flooringPreview} />
      </div>
    </div>
  );
}

function CatalogPanel(props: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3 flooring-catalog-panel">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Справочники</div>
          <div className="calculator-stage-section-title">{props.title}</div>
        </div>
        <div className="calculator-stage-section-note">{props.note}</div>
      </div>
      {props.children}
    </div>
  );
}

function TechMapTab(props: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={props.active ? "flooring-techmap-tab flooring-techmap-tab-active" : "flooring-techmap-tab"}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
