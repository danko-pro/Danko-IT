import {
  MetricChip,
  TextField,
  formatArea,
  formatMeters,
  formatMoney,
  formatPerSquareRate,
  getUnderlayModeLabel,
  trimFloat,
} from "./calculator-shared";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage";

export function FlooringStageSummaryColumn(props: FlooringStageReadyProps) {
  const {
    projectDetail,
    flooringPreview,
    flooringDetail,
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
            <button type="button" className="micro-action" onClick={() => setFlooringSettingsOpen(false)}>
              Скрыть
            </button>
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
              onChange={(value) =>
                setFlooringState((current) => ({ ...current, demolition_price_per_m2: value }))
              }
            />
            <TextField
              label="Подложка, ₽/м²"
              value={flooringState.underlay_price_per_m2}
              onChange={(value) =>
                setFlooringState((current) => ({ ...current, underlay_price_per_m2: value }))
              }
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
          <MetricChip
            label="Клей"
            value={`${trimFloat(flooringPreview.summary.total_glue_qty)} ${flooringPreview.summary.glue_unit}`}
          />
          <MetricChip
            label="Грунт"
            value={`${trimFloat(flooringPreview.summary.total_primer_qty)} ${flooringPreview.summary.primer_unit}`}
          />
          <MetricChip
            label="СВП"
            value={`${trimFloat(flooringPreview.summary.total_svp_qty)} ${flooringPreview.summary.svp_unit}`}
          />
          <MetricChip
            label="Затирка"
            value={`${trimFloat(flooringPreview.summary.total_grout_qty)} ${flooringPreview.summary.grout_unit}`}
          />
          <MetricChip label="Инструмент" value={formatMoney(flooringPreview.summary.total_instrument_cost)} />
        </div>
      </div>

      {flooringSelectedTechRooms.length ? (
        <div className="subpanel p-3 space-y-3">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Технологическая карта по выбранным помещениям
          </div>
          <div className="space-y-2">
            {flooringSelectedTechRooms.map(({ room, covering }) => (
              <div key={room.room_id} className="dense-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">{room.room_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">{room.covering_title ?? "Покрытие"}</span>
                      {room.layout_title ? <span className="stat-chip">Укладка: {room.layout_title}</span> : null}
                      {room.preparation_title ? (
                        <span className="stat-chip">Подготовка: {room.preparation_title}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">Площадь {formatArea(room.effective_area_m2)}</span>
                      <span className="stat-chip">Закупка {formatArea(room.purchase_area_m2)}</span>
                      <span className="stat-chip">Запас {trimFloat(room.total_waste_percent)}%</span>
                      <span className="stat-chip">Материал {formatMoney(room.material_price_per_m2)}/м²</span>
                      <span className="stat-chip">Работа {formatMoney(room.labor_price_per_m2)}/м²</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">
                        Подложка{" "}
                        {room.underlay_qty > 0
                          ? `${trimFloat(room.underlay_qty)} м²`
                          : getUnderlayModeLabel(covering?.underlay_mode ?? "none")}
                      </span>
                      <span className="stat-chip">
                        Клей {room.glue_qty > 0 ? `${trimFloat(room.glue_qty)} ${room.glue_unit}` : "—"}
                      </span>
                      <span className="stat-chip">
                        Грунт {room.primer_qty > 0 ? `${trimFloat(room.primer_qty)} ${room.primer_unit}` : "—"}
                      </span>
                      <span className="stat-chip">
                        СВП {room.svp_qty > 0 ? `${trimFloat(room.svp_qty)} ${room.svp_unit}` : "—"}
                      </span>
                      <span className="stat-chip">
                        Затирка {room.grout_qty > 0 ? `${trimFloat(room.grout_qty)} ${room.grout_unit}` : "—"}
                      </span>
                      <span className="stat-chip">Плинтус {room.plinth_m > 0 ? formatMeters(room.plinth_m) : "—"}</span>
                    </div>
                    {covering?.note ? <div className="mt-2 text-[12px] text-slate-400">{covering.note}</div> : null}
                  </div>
                  <div className="text-sm font-semibold text-cyan-100">{formatMoney(room.total_cost)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <details className="subpanel p-3 details-panel">
        <summary className="details-summary">Каталог технологических карт покрытий</summary>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {flooringDetail.coverings.map((item) => (
            <div key={item.id} className="dense-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                  {item.note ? <div className="mt-1 text-[12px] text-slate-400">{item.note}</div> : null}
                </div>
                <div className="flex flex-wrap justify-end gap-1.5 text-[12px] text-slate-400">
                  <span className="stat-chip">Материал {formatMoney(item.material_price_per_m2)}/м²</span>
                  <span className="stat-chip">Работа {formatMoney(item.labor_price_per_m2)}/м²</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                <span className="stat-chip">Базовый запас {trimFloat(item.base_waste_percent)}%</span>
                <span className="stat-chip">Подложка {getUnderlayModeLabel(item.underlay_mode)}</span>
                <span className="stat-chip">Плинтус {item.needs_plinth ? "нужен" : "не нужен"}</span>
                <span className="stat-chip">Инструмент {formatMoney(item.instrument_price_per_m2)}/м²</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                <span className="stat-chip">
                  Клей {formatPerSquareRate(item.glue_consumption_per_m2, item.glue_unit)}
                </span>
                <span className="stat-chip">
                  Грунт {formatPerSquareRate(item.primer_consumption_per_m2, item.primer_unit)}
                </span>
                <span className="stat-chip">СВП {formatPerSquareRate(item.svp_consumption_per_m2, item.svp_unit)}</span>
                <span className="stat-chip">
                  Затирка {formatPerSquareRate(item.grout_consumption_per_m2, item.grout_unit)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="subpanel p-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация для сметы</div>
        {flooringPreview.specification.length ? (
          <div className="space-y-2">
            {flooringPreview.specification.map((item, index) => (
              <div key={`${item.kind}-${item.title}-${index}`} className="dense-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">{item.kind === "work" ? "Работы" : "Материалы"}</span>
                      <span className="stat-chip">
                        {trimFloat(item.quantity)} {item.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{formatMoney(item.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Пока нет выбранных помещений или покрытий.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="action-button"
          disabled={busyKey === `calculator-flooring-save-${projectDetail.project.id}`}
          onClick={() => void submitFlooring()}
        >
          {busyKey === `calculator-flooring-save-${projectDetail.project.id}`
            ? "Сохраняю..."
            : "Сохранить напольные покрытия"}
        </button>
        <button type="button" className="secondary-button" onClick={resetFlooringState}>
          Сбросить правки
        </button>
      </div>
    </div>
  );
}
