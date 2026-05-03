import { useRef, useState, type ReactNode } from "react";

import {
  WallFinishRoomParametersPanel,
  WallFinishSettingsPanel,
  WallFinishEstimatePanel,
  WallFinishStageCoveringCatalog,
  WallFinishStageLayoutCatalog,
  WallFinishStagePreparationCatalog,
} from "./";
import { MetricChip, formatArea, formatMoney, trimFloat } from "./";
import { useCalculatorSceneHeight } from "../stage/use-scene-height";
import type { WallFinishPanelMode } from "./stage";
import type { WallFinishStageReadyProps } from "./";

type WallFinishTechMapMode = "coverings" | "preparations" | "layouts";
type WallFinishStageSummaryColumnProps = WallFinishStageReadyProps & { panelMode: WallFinishPanelMode };

function getAutosaveLabel(state: WallFinishStageReadyProps["autosaveState"]): string {
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

function getSceneClass(activeMode: WallFinishPanelMode, mode: WallFinishPanelMode): string {
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

export function WallFinishStageSummaryColumn(props: WallFinishStageSummaryColumnProps) {
  const { panelMode, wallFinishPreview, setWallFinishState, wallFinishState, autosaveState } = props;
  const [techMapMode, setTechMapMode] = useState<WallFinishTechMapMode>("coverings");
  const summary = wallFinishPreview.summary;
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
  const stageHeight = useCalculatorSceneHeight(
    panelMode,
    refsByMode[panelMode],
    `${techMapMode}:${wallFinishPreview.rooms.length}:${wallFinishPreview.specification.length}`,
  );

  return (
    <div className="warmfloor-panel-scene-stage" style={stageHeight ? { height: `${stageHeight}px` } : undefined}>
      <div ref={roomRef} className={getSceneClass(panelMode, "room")}>
        <WallFinishRoomParametersPanel
          expandedWallFinishRoomId={props.expandedWallFinishRoomId}
          wallFinishPreview={wallFinishPreview}
          wallFinishDetail={props.wallFinishDetail}
          wallFinishRoomStateById={props.wallFinishRoomStateById}
          setWallFinishState={setWallFinishState}
        />
      </div>

      <div ref={settingsRef} className={getSceneClass(panelMode, "settings")}>
        <WallFinishSettingsPanel
          wallFinishState={wallFinishState}
          setWallFinishState={setWallFinishState}
          resetWallFinishState={props.resetWallFinishState}
        />
      </div>

      <div ref={techmapRef} className={getSceneClass(panelMode, "techmap")}>
        <CatalogPanel
          title="Технологическая карта"
          note="Справочники отделок, подготовок и способов монтажа, из которых собираются помещения."
        >
          <div className="flooring-techmap-tabs">
            <TechMapTab active={techMapMode === "coverings"} onClick={() => setTechMapMode("coverings")}>
              Отделки
            </TechMapTab>
            <TechMapTab active={techMapMode === "preparations"} onClick={() => setTechMapMode("preparations")}>
              Подготовка
            </TechMapTab>
            <TechMapTab active={techMapMode === "layouts"} onClick={() => setTechMapMode("layouts")}>
              Монтаж
            </TechMapTab>
          </div>

          <div key={techMapMode} className="calculator-tab-content-motion">
            {techMapMode === "coverings" ? (
              <WallFinishStageCoveringCatalog
                wallFinishDetail={props.wallFinishDetail}
                wallFinishCoveringState={props.wallFinishCoveringState}
                setWallFinishCoveringState={props.setWallFinishCoveringState}
                busyKey={props.busyKey}
                submitWallFinishCovering={props.submitWallFinishCovering}
              />
            ) : null}
            {techMapMode === "preparations" ? (
              <WallFinishStagePreparationCatalog
                wallFinishDetail={props.wallFinishDetail}
                wallFinishPreparationState={props.wallFinishPreparationState}
                setWallFinishPreparationState={props.setWallFinishPreparationState}
                busyKey={props.busyKey}
                submitWallFinishPreparation={props.submitWallFinishPreparation}
              />
            ) : null}
            {techMapMode === "layouts" ? (
              <WallFinishStageLayoutCatalog
                wallFinishDetail={props.wallFinishDetail}
                wallFinishLayoutState={props.wallFinishLayoutState}
                setWallFinishLayoutState={props.setWallFinishLayoutState}
                busyKey={props.busyKey}
                submitWallFinishLayout={props.submitWallFinishLayout}
              />
            ) : null}
          </div>
        </CatalogPanel>
      </div>

      <div ref={summaryRef} className={getSceneClass(panelMode, "summary")}>
        <div className="subpanel calculator-stage-section warmfloor-summary-panel flooring-summary-panel p-3">
          <div className="calculator-stage-section-head">
            <div>
              <div className="calculator-stage-section-kicker">Свод по стенам</div>
              <div className="calculator-stage-section-title">Итог, площади и закупка</div>
            </div>
            <div className="calculator-stage-inline-status">
              <span className="slot-chip">{getAutosaveLabel(autosaveState)}</span>
            </div>
          </div>

          <div className="warmfloor-summary-total">
            <div>
              <div className="warmfloor-summary-label">Итого по отделке стен</div>
              <div className="warmfloor-summary-value" data-testid="wall-finish-summary-grand-total">
                {formatMoney(summary.grand_total)}
              </div>
            </div>
            <div className="warmfloor-summary-rate">
              <span>Цена за м²</span>
              <strong>{pricePerSquare}</strong>
            </div>
          </div>

          <div className="warmfloor-summary-strip">
            <MetricChip label="Помещений" value={String(summary.rooms_count)} />
            <span data-testid="wall-finish-summary-area">
              <MetricChip label="Площадь" value={formatArea(summary.total_area_m2)} />
            </span>
            <MetricChip label="Закупка" value={formatArea(summary.total_purchase_area_m2)} />
            <MetricChip label="Работы" value={formatMoney(summary.work_total)} />
          </div>

          <div className="warmfloor-summary-two-column">
            <MetricChip label="Материалы" value={formatMoney(summary.material_total)} />
            <MetricChip label="Клей" value={`${trimFloat(summary.total_glue_qty)} ${summary.glue_unit}`} />
            <MetricChip label="Грунт" value={`${trimFloat(summary.total_primer_qty)} ${summary.primer_unit}`} />
            <MetricChip label="Шпаклевка" value={`${trimFloat(summary.total_putty_qty)} ${summary.putty_unit}`} />
            <MetricChip label="Сетка" value={`${trimFloat(summary.total_mesh_qty)} ${summary.mesh_unit}`} />
            <MetricChip label="Доп. расходники" value={formatMoney(summary.total_custom_consumables_cost)} />
            <MetricChip label="Инструмент" value={formatMoney(summary.total_instrument_cost)} />
          </div>

          <div className="warmfloor-summary-note">
            Пересчитывается от выбранных помещений, отделки, подготовки и способа монтажа.
          </div>
        </div>
      </div>

      <div ref={estimateRef} className={getSceneClass(panelMode, "estimate")}>
        <WallFinishEstimatePanel wallFinishPreview={wallFinishPreview} />
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
