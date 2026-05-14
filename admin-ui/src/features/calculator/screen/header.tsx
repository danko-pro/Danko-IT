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
  headerWallFinishWorkTotal: number;
  headerWallFinishMaterialTotal: number;
  headerCeilingWorkTotal: number;
  headerCeilingMaterialTotal: number;
  headerCeilingEquipmentTotal: number;
  headerCeilingConsumablesTotal: number;
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
    headerWallFinishWorkTotal,
    headerWallFinishMaterialTotal,
    headerCeilingWorkTotal,
    headerCeilingMaterialTotal,
    headerCeilingEquipmentTotal,
    headerCeilingConsumablesTotal,
    projectForm,
    onReload,
    activeStage,
    setActiveStage,
  } = props;
  const showHeaderMetrics = activeStage !== "project";
  const autosaveLabel = !showHeaderMetrics && projectDetail ? getAutosaveLabel(projectForm.autosaveState) : null;
  const floorArea = projectDetail?.summary.floor_area_m2 ?? 0;
  const doorSaleTotal = projectDetail?.summary.door_sale_total ?? 0;
  const doorInstallTotal = projectDetail?.summary.door_install_total ?? 0;
  const flooringTotal = headerFlooringWorkTotal + headerFlooringMaterialTotal;
  const warmFloorTotal = headerWarmFloorWorkTotal + headerWarmFloorMaterialTotal;
  const wallFinishTotal = headerWallFinishWorkTotal + headerWallFinishMaterialTotal;
  const ceilingMaterialBucket =
    headerCeilingMaterialTotal + headerCeilingEquipmentTotal + headerCeilingConsumablesTotal;
  const ceilingTotal = headerCeilingWorkTotal + ceilingMaterialBucket;
  const doorClientTotal = doorSaleTotal + doorInstallTotal;
  const objectWorkTotal =
    headerFlooringWorkTotal +
    headerWarmFloorWorkTotal +
    headerWallFinishWorkTotal +
    headerCeilingWorkTotal +
    doorInstallTotal;
  const objectMaterialTotal =
    headerFlooringMaterialTotal +
    headerWarmFloorMaterialTotal +
    headerWallFinishMaterialTotal +
    ceilingMaterialBucket +
    doorSaleTotal;
  const objectEstimateTotal = objectWorkTotal + objectMaterialTotal;
  const objectRate = floorArea > 0 ? objectEstimateTotal / floorArea : 0;
  const objectWorkRate = floorArea > 0 ? objectWorkTotal / floorArea : 0;
  const objectMaterialRate = floorArea > 0 ? objectMaterialTotal / floorArea : 0;

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
                data-testid={`calculator-stage-${option.stage}`}
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
        showHeaderMetrics ? (
          <div className="calculator-header-stats calculator-header-stats-compact mt-3">
            <AnimatedHeaderGroup title="Свод по объекту">
              <div className="calculator-object-summary-compact">
                <div className="calculator-object-summary-total">
                  <div>
                    <div className="calculator-object-summary-label">Итого по объекту</div>
                    <div className="calculator-object-summary-value" data-testid="calculator-header-object-total">
                      {formatMoney(objectEstimateTotal)}
                    </div>
                  </div>
                  <div className="calculator-object-summary-rate">
                    <div className="calculator-object-rate-main">
                      <span>Цена за м²</span>
                      <strong>{objectRate > 0 ? formatMoney(objectRate) : "-"}</strong>
                    </div>
                    <div className="calculator-object-rate-split">
                      <div>
                        <span>Работы</span>
                        <strong>{objectWorkRate > 0 ? formatMoney(objectWorkRate) : "-"}</strong>
                      </div>
                      <div>
                        <span>Материалы</span>
                        <strong>{objectMaterialRate > 0 ? formatMoney(objectMaterialRate) : "-"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="calculator-object-compact-group">
                  <div className="calculator-object-compact-title">Объёмы</div>
                  <div className="calculator-object-compact-grid">
                    <MetricChip label="Полы" value={formatArea(floorArea)} />
                    <MetricChip label="Стены чист." value={formatArea(projectDetail.summary.wall_area_net_m2)} />
                    <MetricChip label="Периметр" value={formatMeters(projectDetail.summary.perimeter_m)} />
                    <MetricChip label="Комнат" value={String(projectDetail.summary.rooms_count)} />
                    <MetricChip label="Дверей" value={String(projectDetail.summary.doors_count)} />
                  </div>
                </div>

                <div className="calculator-object-compact-group calculator-object-money-group">
                  <div className="calculator-object-compact-title">Суммы</div>
                  <div className="calculator-object-money-list">
                    <div className="calculator-object-money-row" data-testid="calculator-header-flooring-total">
                      <span>Напольные покрытия</span>
                      <strong>{formatMoney(flooringTotal)}</strong>
                    </div>
                    <div className="calculator-object-money-row" data-testid="calculator-header-warm-floor-total">
                      <span>Тёплый пол</span>
                      <strong>{formatMoney(warmFloorTotal)}</strong>
                    </div>
                    <div className="calculator-object-money-row" data-testid="calculator-header-wall-finish-total">
                      <span>Отделка стен</span>
                      <strong>{formatMoney(wallFinishTotal)}</strong>
                    </div>
                    <div className="calculator-object-money-row" data-testid="calculator-header-ceilings-total">
                      <span>Потолки</span>
                      <strong>{formatMoney(ceilingTotal)}</strong>
                    </div>
                    <div className="calculator-object-money-row" data-testid="calculator-header-doors-total">
                      <span>Двери</span>
                      <strong>{formatMoney(doorClientTotal)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedHeaderGroup>
          </div>
        ) : (
          <div className="calculator-header-stats mt-3">
            <AnimatedHeaderGroup empty>
              <ObjectIdentityCard projectForm={projectForm} />
            </AnimatedHeaderGroup>

            <AnimatedHeaderGroup empty>
              <ObjectAccessCard projectForm={projectForm} />
            </AnimatedHeaderGroup>
          </div>
        )
      ) : null}
    </section>
  );
}
