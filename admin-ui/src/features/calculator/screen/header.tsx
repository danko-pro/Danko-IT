import { Button } from "../../../shared/controls";
import type { CalculatorProjectDetail, CalculatorStage } from "../model/types";
import type { UseCalculatorProjectControllerResult } from "../project/use";
import { MetricChip, formatArea, formatMeters, formatMoney } from "../shared";
import { CALCULATOR_STAGE_OPTIONS } from "./header-data";
import { ObjectAccessCard, ObjectIdentityCard } from "./header-form";
import { AnimatedHeaderGroup } from "./header-group";

type CalculatorProjectForm = UseCalculatorProjectControllerResult;

type CalculatorHeaderSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  headerFlooringWorkTotal: number;
  headerFlooringMaterialTotal: number;
  headerWarmFloorWorkTotal: number;
  headerWarmFloorMaterialTotal: number;
  projectForm: CalculatorProjectForm;
  onReload: () => Promise<void> | void;
  activeStage: CalculatorStage;
  setActiveStage: (stage: CalculatorStage) => void;
};

function getAutosaveLabel(state: CalculatorProjectForm["autosaveState"]): string {
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

export function CalculatorHeaderSection(props: CalculatorHeaderSectionProps) {
  const {
    projectDetail,
    headerFlooringWorkTotal,
    headerFlooringMaterialTotal,
    headerWarmFloorWorkTotal,
    headerWarmFloorMaterialTotal,
    projectForm,
    onReload,
    activeStage,
    setActiveStage,
  } = props;
  const showHeaderMetrics = activeStage !== "project";
  const autosaveLabel = !showHeaderMetrics && projectDetail ? getAutosaveLabel(projectForm.autosaveState) : null;

  return (
    <section className="glass-panel p-4 stage-panel calculator-header">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="calculator-stage-switch" aria-label="Навигация по разделам калькулятора">
          {CALCULATOR_STAGE_OPTIONS.map((option) => {
            const isActive = activeStage === option.stage;

            return (
              <button
                key={option.stage}
                type="button"
                className={
                  isActive
                    ? "calculator-stage-switch-button calculator-stage-switch-button-active ui-tooltip-anchor ui-tooltip-center"
                    : "calculator-stage-switch-button ui-tooltip-anchor ui-tooltip-center"
                }
                data-tooltip={option.label}
                aria-label={option.label}
                onClick={() => setActiveStage(option.stage)}
              >
                <span className="calculator-stage-switch-glyph" aria-hidden="true">
                  {option.icon}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {autosaveLabel ? <span className="slot-chip">{autosaveLabel}</span> : null}
          <Button type="button" variant="secondary" onClick={() => void onReload()}>
            Обновить
          </Button>
        </div>
      </div>

      {projectDetail ? (
        <div className="calculator-header-stats mt-3">
          <AnimatedHeaderGroup title={showHeaderMetrics ? "Объёмы" : undefined} empty={!showHeaderMetrics}>
            {showHeaderMetrics ? (
              <div className="calculator-header-group-grid">
                <MetricChip label="Комнат" value={String(projectDetail.summary.rooms_count)} />
                <MetricChip label="Полы" value={formatArea(projectDetail.summary.floor_area_m2)} />
                <MetricChip label="Стены грязн." value={formatArea(projectDetail.summary.wall_area_gross_m2)} />
                <MetricChip label="Стены чист." value={formatArea(projectDetail.summary.wall_area_net_m2)} />
                <MetricChip label="Проёмы" value={formatArea(projectDetail.summary.openings_area_m2)} />
                <MetricChip label="Периметр" value={formatMeters(projectDetail.summary.perimeter_m)} />
                <MetricChip label="Дверей" value={String(projectDetail.summary.doors_count)} />
              </div>
            ) : (
              <ObjectIdentityCard projectForm={projectForm} />
            )}
          </AnimatedHeaderGroup>

          <AnimatedHeaderGroup title={showHeaderMetrics ? "Суммы" : undefined} empty={!showHeaderMetrics}>
            {showHeaderMetrics ? (
              <div className="calculator-header-group-grid">
                <MetricChip label="Полы: работы" value={formatMoney(headerFlooringWorkTotal)} />
                <MetricChip label="Полы: материалы" value={formatMoney(headerFlooringMaterialTotal)} />
                <MetricChip label="ТП: работы" value={formatMoney(headerWarmFloorWorkTotal)} />
                <MetricChip label="ТП: материалы" value={formatMoney(headerWarmFloorMaterialTotal)} />
                <MetricChip label="Двери: закуп" value={formatMoney(projectDetail.summary.door_purchase_total ?? 0)} />
                <MetricChip label="Двери: продажа" value={formatMoney(projectDetail.summary.door_sale_total ?? 0)} />
                <MetricChip label="Двери: монтаж" value={formatMoney(projectDetail.summary.door_install_total ?? 0)} />
              </div>
            ) : (
              <ObjectAccessCard projectForm={projectForm} />
            )}
          </AnimatedHeaderGroup>
        </div>
      ) : null}
    </section>
  );
}
