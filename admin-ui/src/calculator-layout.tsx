import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { MetricChip, formatArea, formatDateTime, formatMeters, formatMoney } from "./calculator-shared";
import type { CalculatorProjectDetail, CalculatorStage } from "./calculator";

type CalculatorHeaderSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  calculatorHeaderStyle: CSSProperties;
  headerFlooringWorkTotal: number;
  headerFlooringMaterialTotal: number;
  headerWarmFloorWorkTotal: number;
  headerWarmFloorMaterialTotal: number;
  onReload: () => Promise<void> | void;
  startHeaderResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  resetHeaderLayout: () => void;
  activeStage: CalculatorStage;
  setActiveStage: (stage: CalculatorStage) => void;
};

export function CalculatorHeaderSection(props: CalculatorHeaderSectionProps) {
  const {
    projectDetail,
    calculatorHeaderStyle,
    headerFlooringWorkTotal,
    headerFlooringMaterialTotal,
    headerWarmFloorWorkTotal,
    headerWarmFloorMaterialTotal,
    onReload,
    startHeaderResize,
    resetHeaderLayout,
    activeStage,
    setActiveStage,
  } = props;

  return (
    <section className="glass-panel p-4 stage-panel calculator-header" style={calculatorHeaderStyle}>
      <div className="calculator-header-top">
        <div className="calculator-header-copy">
          <div className="eyebrow">Калькулятор</div>
          <h3 className="section-title mt-1.5 calculator-header-title">{projectDetail ? projectDetail.project.name : "Калькулятор объекта"}</h3>
          <div className="mt-1 text-[12px] text-slate-400 calculator-header-copyline">
            {projectDetail
              ? "Проект расчёта по помещениям, дверям, тёплому полу и напольным покрытиям."
              : "Выберите объект в левом меню или создайте новый проект расчёта."}
          </div>
          {projectDetail ? (
            <>
              <div className="calculator-header-meta mt-2">
                <span className="slot-chip">#{projectDetail.project.id}</span>
                <span className="stat-chip">Комнат: {projectDetail.project.rooms_count}</span>
                {projectDetail.project.group_chat_id !== null ? <span className="stat-chip">Чат: {projectDetail.project.group_chat_id}</span> : null}
                <span className="stat-chip">Обновлён {formatDateTime(projectDetail.project.updated_at)}</span>
              </div>
              {projectDetail.project.note ? <div className="calculator-header-note">{projectDetail.project.note}</div> : null}
            </>
          ) : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void onReload()}>
          Обновить
        </button>
      </div>

      {projectDetail ? (
        <div className="calculator-header-stats mt-3">
          <div className="calculator-header-group">
            <div className="row-kicker">Объёмы</div>
            <div className="calculator-header-group-grid mt-2">
              <MetricChip label="Комнат" value={String(projectDetail.summary.rooms_count)} />
              <MetricChip label="Полы" value={formatArea(projectDetail.summary.floor_area_m2)} />
              <MetricChip label="Стены грязн." value={formatArea(projectDetail.summary.wall_area_gross_m2)} />
              <MetricChip label="Стены чист." value={formatArea(projectDetail.summary.wall_area_net_m2)} />
              <MetricChip label="Проёмы" value={formatArea(projectDetail.summary.openings_area_m2)} />
              <MetricChip label="Периметр" value={formatMeters(projectDetail.summary.perimeter_m)} />
              <MetricChip label="Дверей" value={String(projectDetail.summary.doors_count)} />
            </div>
          </div>

          <div className="calculator-header-group">
            <div className="row-kicker">Суммы</div>
            <div className="calculator-header-group-grid mt-2">
              <MetricChip label="Полы: работы" value={formatMoney(headerFlooringWorkTotal)} />
              <MetricChip label="Полы: материалы" value={formatMoney(headerFlooringMaterialTotal)} />
              <MetricChip label="ТП: работы" value={formatMoney(headerWarmFloorWorkTotal)} />
              <MetricChip label="ТП: материалы" value={formatMoney(headerWarmFloorMaterialTotal)} />
              <MetricChip label="Двери: закуп" value={formatMoney(projectDetail.summary.door_purchase_total ?? 0)} />
              <MetricChip label="Двери: продажа" value={formatMoney(projectDetail.summary.door_sale_total ?? 0)} />
              <MetricChip label="Двери: монтаж" value={formatMoney(projectDetail.summary.door_install_total ?? 0)} />
            </div>
          </div>
        </div>
      ) : null}

      {projectDetail ? (
        <>
          <div className="calculator-header-resize-note">Тяните за угол: вправо меняется ширина карточек, вверх-вниз размер шрифта.</div>
          <button
            type="button"
            className="calculator-header-resize-handle"
            onPointerDown={startHeaderResize}
            onDoubleClick={resetHeaderLayout}
            aria-label="Изменить размер карточек и шрифта в хедере"
            title="Тяните для изменения размера. Двойной клик сбрасывает."
          />
        </>
      ) : null}

      <div className="stage-tabs mt-3">
        <button type="button" className={activeStage === "project" ? "stage-tab stage-tab-active" : "stage-tab"} onClick={() => setActiveStage("project")}>
          Объект
        </button>
        <button type="button" className={activeStage === "rooms" ? "stage-tab stage-tab-active" : "stage-tab"} onClick={() => setActiveStage("rooms")}>
          Помещения
        </button>
        <button type="button" className={activeStage === "warmfloor" ? "stage-tab stage-tab-active" : "stage-tab"} onClick={() => setActiveStage("warmfloor")}>
          Тёплый пол
        </button>
        <button type="button" className={activeStage === "flooring" ? "stage-tab stage-tab-active" : "stage-tab"} onClick={() => setActiveStage("flooring")}>
          Напольные покрытия
        </button>
        <button type="button" className={activeStage === "wallfinish" ? "stage-tab stage-tab-active" : "stage-tab"} onClick={() => setActiveStage("wallfinish")}>
          <span className="text-[13px]">Отделка стен</span>
        </button>
        <button type="button" className={activeStage === "doors" ? "stage-tab stage-tab-active" : "stage-tab"} onClick={() => setActiveStage("doors")}>
          Двери
        </button>
      </div>
    </section>
  );
}
