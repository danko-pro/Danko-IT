import { MetricChip, TextField, formatArea, formatMoney, trimFloat } from "./calculator-shared";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage";

export function WallFinishStageSummaryColumn(props: WallFinishStageReadyProps) {
  const {
    projectDetail,
    wallFinishPreview,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
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
        <div className="subpanel p-3 space-y-3">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Глобальные настройки по стенам</div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={wallFinishState.include_preparation}
                onChange={(event) =>
                  setWallFinishState((current) => ({ ...current, include_preparation: event.target.checked }))
                }
              />
              <span className="text-sm font-semibold text-slate-100">Включать подготовку</span>
            </label>
            <label className="subpanel flex items-center gap-3 px-3 py-3">
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
              onChange={(value) =>
                setWallFinishState((current) => ({ ...current, demolition_price_per_m2: value }))
              }
            />
          </div>
        </div>
      ) : null}

      <div className="section-separator">
        <span>Свод, техкарта и спецификация</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
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

      <div className="subpanel p-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Свод расходников</div>
        <div className="grid gap-2 md:grid-cols-2">
          <MetricChip
            label="Клей"
            value={`${trimFloat(wallFinishPreview.summary.total_glue_qty)} ${wallFinishPreview.summary.glue_unit}`}
          />
          <MetricChip
            label="Грунт"
            value={`${trimFloat(wallFinishPreview.summary.total_primer_qty)} ${wallFinishPreview.summary.primer_unit}`}
          />
          <MetricChip
            label="Шпаклёвка"
            value={`${trimFloat(wallFinishPreview.summary.total_putty_qty)} ${wallFinishPreview.summary.putty_unit}`}
          />
          <MetricChip
            label="Сетка"
            value={`${trimFloat(wallFinishPreview.summary.total_mesh_qty)} ${wallFinishPreview.summary.mesh_unit}`}
          />
          <MetricChip label="Инструмент" value={formatMoney(wallFinishPreview.summary.total_instrument_cost)} />
        </div>
      </div>

      {wallFinishSelectedTechRooms.length ? (
        <div className="subpanel p-3 space-y-3">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Технологическая карта по выбранным помещениям
          </div>
          <div className="space-y-2">
            {wallFinishSelectedTechRooms.map(({ room, covering }) => (
              <div key={room.room_id} className="dense-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">{room.room_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">{room.covering_title ?? "Отделка"}</span>
                      {room.layout_title ? <span className="stat-chip">Монтаж: {room.layout_title}</span> : null}
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
                        Клей {room.glue_qty > 0 ? `${trimFloat(room.glue_qty)} ${room.glue_unit}` : "—"}
                      </span>
                      <span className="stat-chip">
                        Грунт {room.primer_qty > 0 ? `${trimFloat(room.primer_qty)} ${room.primer_unit}` : "—"}
                      </span>
                      <span className="stat-chip">
                        Шпаклёвка {room.putty_qty > 0 ? `${trimFloat(room.putty_qty)} ${room.putty_unit}` : "—"}
                      </span>
                      <span className="stat-chip">
                        Сетка {room.mesh_qty > 0 ? `${trimFloat(room.mesh_qty)} ${room.mesh_unit}` : "—"}
                      </span>
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

      <div className="subpanel p-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация для сметы</div>
        {wallFinishPreview.specification.length ? (
          <div className="space-y-2">
            {wallFinishPreview.specification.map((item, index) => (
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
            Пока нет выбранных помещений или отделки стен.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="action-button"
          disabled={busyKey === `calculator-wall-finish-save-${projectDetail.project.id}`}
          onClick={() => void submitWallFinish()}
        >
          {busyKey === `calculator-wall-finish-save-${projectDetail.project.id}`
            ? "Сохраняю..."
            : "Сохранить отделку стен"}
        </button>
        <button type="button" className="secondary-button" onClick={resetWallFinishState}>
          Сбросить правки
        </button>
      </div>
    </div>
  );
}
