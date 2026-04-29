import { Button } from "./";
import { MetricChip, TextField, formatArea, formatMoney, trimFloat } from "./";
import { WallFinishStageSpecification } from "./";
import { WallFinishStageTechMap } from "./";
import type { WallFinishStageReadyProps } from "./";

export function WallFinishStageSummaryColumn(props: WallFinishStageReadyProps) {
  const {
    projectDetail,
    wallFinishPreview,
    wallFinishSettingsOpen,
    setWallFinishState,
    wallFinishState,
    wallFinishSelectedTechRooms,
    busyKey,
    submitWallFinish,
    resetWallFinishState,
  } = props;

  return (
    <div className="space-y-3">
      {wallFinishSettingsOpen ? (
        <div className="subpanel calculator-stage-section p-3 space-y-3">
          <div className="calculator-stage-section-head">
            <div>
              <div className="calculator-stage-section-kicker">Глобальные параметры</div>
              <div className="calculator-stage-section-title">Настройки отделки стен</div>
            </div>
            <div className="calculator-stage-section-note">
              Общие переключатели и базовая ставка демонтажа для всего блока стеновых работ.
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="subpanel calculator-stage-toggle-card flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={wallFinishState.include_preparation}
                onChange={(event) =>
                  setWallFinishState((current) => ({ ...current, include_preparation: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать подготовку</span>
            </label>
            <label className="subpanel calculator-stage-toggle-card flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={wallFinishState.include_demolition}
                onChange={(event) =>
                  setWallFinishState((current) => ({ ...current, include_demolition: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать демонтаж</span>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <TextField
              label="Демонтаж, ₽/м²"
              value={wallFinishState.demolition_price_per_m2}
              onChange={(value) => setWallFinishState((current) => ({ ...current, demolition_price_per_m2: value }))}
            />
          </div>
        </div>
      ) : null}

      <div className="subpanel calculator-stage-section p-3 space-y-3">
        <div className="calculator-stage-section-head">
          <div>
            <div className="calculator-stage-section-kicker">Свод по стенам</div>
            <div className="calculator-stage-section-title">Площади, закупка и итоговые суммы</div>
          </div>
          <div className="calculator-stage-section-note">
            Общий срез по выбранным комнатам, закупочной площади и цене за квадратный метр отделки.
          </div>
        </div>

        <div className="calculator-stage-metric-grid md:grid-cols-2">
          <MetricChip label="Помещений" value={String(wallFinishPreview.summary.rooms_count)} />
          <MetricChip label="Площадь" value={formatArea(wallFinishPreview.summary.total_area_m2)} />
          <MetricChip label="Закупка" value={formatArea(wallFinishPreview.summary.total_purchase_area_m2)} />
          <MetricChip label="Работы" value={formatMoney(wallFinishPreview.summary.work_total)} />
          <MetricChip label="Материалы" value={formatMoney(wallFinishPreview.summary.material_total)} />
          <MetricChip label="Итого" value={formatMoney(wallFinishPreview.summary.grand_total)} />
          <MetricChip
            label="Цена за м²"
            value={wallFinishPreview.summary.price_per_m2 === null ? "—" : formatMoney(wallFinishPreview.summary.price_per_m2)}
          />
        </div>
      </div>

      <div className="subpanel calculator-stage-section p-3 space-y-3">
        <div className="calculator-stage-section-head">
          <div>
            <div className="calculator-stage-section-kicker">Расходники</div>
            <div className="calculator-stage-section-title">Свод материалов и инструмента</div>
          </div>
          <div className="calculator-stage-section-note">
            Клей, грунт, шпаклёвка, сетка и инструмент в сумме по текущему набору комнат.
          </div>
        </div>

        <div className="calculator-stage-metric-grid md:grid-cols-2">
          <MetricChip label="Клей" value={`${trimFloat(wallFinishPreview.summary.total_glue_qty)} ${wallFinishPreview.summary.glue_unit}`} />
          <MetricChip
            label="Грунт"
            value={`${trimFloat(wallFinishPreview.summary.total_primer_qty)} ${wallFinishPreview.summary.primer_unit}`}
          />
          <MetricChip
            label="Шпаклёвка"
            value={`${trimFloat(wallFinishPreview.summary.total_putty_qty)} ${wallFinishPreview.summary.putty_unit}`}
          />
          <MetricChip label="Сетка" value={`${trimFloat(wallFinishPreview.summary.total_mesh_qty)} ${wallFinishPreview.summary.mesh_unit}`} />
          <MetricChip label="Инструмент" value={formatMoney(wallFinishPreview.summary.total_instrument_cost)} />
        </div>
      </div>

      <WallFinishStageTechMap wallFinishSelectedTechRooms={wallFinishSelectedTechRooms} />
      <WallFinishStageSpecification wallFinishPreview={wallFinishPreview} />

      <div className="calculator-stage-action-row">
        <Button
          type="button"
          disabled={busyKey === `calculator-wall-finish-save-${projectDetail.project.id}`}
          onClick={() => void submitWallFinish()}
        >
          {busyKey === `calculator-wall-finish-save-${projectDetail.project.id}` ? "Сохраняю..." : "Сохранить отделку стен"}
        </Button>
        <Button type="button" variant="secondary" onClick={resetWallFinishState}>
          Сбросить правки
        </Button>
      </div>
    </div>
  );
}
