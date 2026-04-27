import { Button } from "./";
import { MetricChip, TextField, formatArea, formatMeters, formatMoney, trimFloat } from "./";
import { FlooringStageCoveringsCatalog } from "./";
import { FlooringStageSpecification } from "./";
import { FlooringStageTechMap } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringStageSummaryColumn(props: FlooringStageReadyProps) {
  const {
    projectDetail,
    flooringPreview,
    flooringSettingsOpen,
    setFlooringSettingsOpen,
    setFlooringState,
    flooringState,
    flooringSelectedTechRooms,
    busyKey,
    submitFlooring,
    resetFlooringState,
  } = props;

  return (
    <div className="space-y-3">
      {flooringSettingsOpen ? (
        <div className="subpanel p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Настройки проекта</div>
              <div className="mt-1 text-[12px] text-slate-400">
                Переключатели и цены, которые влияют на весь блок напольных покрытий
              </div>
            </div>
            <Button type="button" variant="micro" onClick={() => setFlooringSettingsOpen(false)}>
              Скрыть
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={flooringState.include_underlay}
                onChange={(event) =>
                  setFlooringState((current) => ({ ...current, include_underlay: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать подложку</span>
            </label>
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={flooringState.include_plinth}
                onChange={(event) =>
                  setFlooringState((current) => ({ ...current, include_plinth: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать плинтус</span>
            </label>
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={flooringState.include_demolition}
                onChange={(event) =>
                  setFlooringState((current) => ({ ...current, include_demolition: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать демонтаж</span>
            </label>
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={flooringState.include_preparation}
                onChange={(event) =>
                  setFlooringState((current) => ({ ...current, include_preparation: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать подготовку</span>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <TextField
              label="Демонтаж, ₽/м²"
              value={flooringState.demolition_price_per_m2}
              onChange={(value) => setFlooringState((current) => ({ ...current, demolition_price_per_m2: value }))}
            />
            <TextField
              label="Подложка, ₽/м²"
              value={flooringState.underlay_price_per_m2}
              onChange={(value) => setFlooringState((current) => ({ ...current, underlay_price_per_m2: value }))}
            />
            <TextField
              label="Плинтус материал, ₽/м.п."
              value={flooringState.plinth_material_price_per_m}
              onChange={(value) =>
                setFlooringState((current) => ({ ...current, plinth_material_price_per_m: value }))
              }
            />
            <TextField
              label="Монтаж плинтуса, ₽/м.п."
              value={flooringState.plinth_install_price_per_m}
              onChange={(value) =>
                setFlooringState((current) => ({ ...current, plinth_install_price_per_m: value }))
              }
            />
            <TextField
              label="Порожки, шт"
              value={flooringState.threshold_profile_count}
              onChange={(value) =>
                setFlooringState((current) => ({ ...current, threshold_profile_count: value }))
              }
            />
            <TextField
              label="Порожек, ₽/шт"
              value={flooringState.threshold_profile_price}
              onChange={(value) =>
                setFlooringState((current) => ({ ...current, threshold_profile_price: value }))
              }
            />
          </div>
        </div>
      ) : null}

      <div className="section-separator">
        <span>Свод, технологичка и спецификация</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <MetricChip label="Помещений" value={String(flooringPreview.summary.rooms_count)} />
        <MetricChip label="Площадь" value={formatArea(flooringPreview.summary.total_area_m2)} />
        <MetricChip label="Закупка" value={formatArea(flooringPreview.summary.total_purchase_area_m2)} />
        <MetricChip label="Плинтус" value={formatMeters(flooringPreview.summary.total_plinth_m)} />
        <MetricChip label="Работы" value={formatMoney(flooringPreview.summary.work_total)} />
        <MetricChip label="Материалы" value={formatMoney(flooringPreview.summary.material_total)} />
        <MetricChip label="Итого" value={formatMoney(flooringPreview.summary.grand_total)} />
        <MetricChip
          label="Цена за м²"
          value={flooringPreview.summary.price_per_m2 === null ? "—" : formatMoney(flooringPreview.summary.price_per_m2)}
        />
      </div>

      <div className="subpanel p-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Свод расходников</div>
        <div className="grid gap-2 md:grid-cols-2">
          <MetricChip
            label="Подложка"
            value={`${trimFloat(flooringPreview.summary.total_underlay_qty)} ${flooringPreview.summary.underlay_unit}`}
          />
          <MetricChip label="Клей" value={`${trimFloat(flooringPreview.summary.total_glue_qty)} ${flooringPreview.summary.glue_unit}`} />
          <MetricChip
            label="Грунт"
            value={`${trimFloat(flooringPreview.summary.total_primer_qty)} ${flooringPreview.summary.primer_unit}`}
          />
          <MetricChip label="СВП" value={`${trimFloat(flooringPreview.summary.total_svp_qty)} ${flooringPreview.summary.svp_unit}`} />
          <MetricChip
            label="Затирка"
            value={`${trimFloat(flooringPreview.summary.total_grout_qty)} ${flooringPreview.summary.grout_unit}`}
          />
          <MetricChip label="Инструмент" value={formatMoney(flooringPreview.summary.total_instrument_cost)} />
        </div>
      </div>

      <FlooringStageTechMap flooringSelectedTechRooms={flooringSelectedTechRooms} />
      <FlooringStageCoveringsCatalog flooringDetail={props.flooringDetail} />
      <FlooringStageSpecification flooringPreview={flooringPreview} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busyKey === `calculator-flooring-save-${projectDetail.project.id}`}
          onClick={() => void submitFlooring()}
        >
          {busyKey === `calculator-flooring-save-${projectDetail.project.id}`
            ? "Сохраняю..."
            : "Сохранить напольные покрытия"}
        </Button>
        <Button type="button" variant="secondary" onClick={resetFlooringState}>
          Сбросить правки
        </Button>
      </div>
    </div>
  );
}
