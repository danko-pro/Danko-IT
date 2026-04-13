import type { Dispatch, FormEvent, SetStateAction } from "react";

import { MetricChip, formatArea, formatMeters, formatMoney, trimFloat } from "./calculator-shared";
import { WarmFloorRoomCard } from "./calculator-room-cards";
import type { CalculatorProjectDetail, CalculatorWarmFloorDetail, WarmFloorEditState } from "./calculator";

type WarmFloorRoomEdit = WarmFloorEditState["rooms"][number];

type WarmFloorStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  warmFloorPreview: CalculatorWarmFloorDetail | null;
  warmFloorSettingsOpen: boolean;
  setWarmFloorSettingsOpen: Dispatch<SetStateAction<boolean>>;
  handleWarmFloorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  warmFloorRoomStateById: Map<number, WarmFloorRoomEdit>;
  expandedWarmFloorRoomId: number | null;
  setExpandedWarmFloorRoomId: Dispatch<SetStateAction<number | null>>;
  setWarmFloorState: Dispatch<SetStateAction<WarmFloorEditState>>;
  warmFloorState: WarmFloorEditState;
  busyKey: string | null;
  resetWarmFloorState: () => void;
};

export function WarmFloorStageSection(props: WarmFloorStageSectionProps) {
  const {
    projectDetail,
    warmFloorPreview,
    warmFloorSettingsOpen,
    setWarmFloorSettingsOpen,
    handleWarmFloorSubmit,
    warmFloorRoomStateById,
    expandedWarmFloorRoomId,
    setExpandedWarmFloorRoomId,
    setWarmFloorState,
    warmFloorState,
    busyKey,
    resetWarmFloorState,
  } = props;

  return (
    <section className="glass-panel p-4 stage-panel warmfloor-stage">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Тёплый пол</div>
          <h3 className="panel-title">Контуры, труба и коллекторная часть</h3>
        </div>
        <button
          type="button"
          className={warmFloorSettingsOpen ? "secondary-button warmfloor-gear warmfloor-gear-active" : "secondary-button warmfloor-gear"}
          onClick={() => setWarmFloorSettingsOpen((current) => !current)}
        >
          ⚙ Настройки
        </button>
      </div>

      {projectDetail && warmFloorPreview ? (
        <form className="space-y-3" onSubmit={(event) => void handleWarmFloorSubmit(event)}>
          <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="subpanel p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Помещения тёплого пола</div>
                  <div className="text-[12px] text-slate-400">Отметьте комнаты и при необходимости скорректируйте площадь</div>
                </div>

                <div className="space-y-2">
                  {warmFloorPreview.rooms.map((room) => (
                    <WarmFloorRoomCard
                      key={room.room_id}
                      room={room}
                      edit={warmFloorRoomStateById.get(room.room_id)}
                      expanded={expandedWarmFloorRoomId === room.room_id}
                      setExpandedRoomId={setExpandedWarmFloorRoomId}
                      setWarmFloorState={setWarmFloorState}
                    />
                  ))}
                </div>
              </div>

              <div className="section-separator">
                <span>Сметная спецификация</span>
              </div>

              <div className="subpanel p-3 space-y-2">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация для сметы</div>
                {warmFloorPreview.specification.length ? (
                  <div className="space-y-2">
                    {warmFloorPreview.specification.map((item) => (
                      <div key={item.code} className="dense-row">
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
                    Пока нет выбранных помещений для тёплого пола.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {warmFloorSettingsOpen ? (
                <div className="subpanel p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Таблица параметров</div>
                      <div className="mt-1 text-[12px] text-slate-400">Здесь меняются цены, расход трубы и пороги по системе</div>
                    </div>
                    <button type="button" className="micro-action" onClick={() => setWarmFloorSettingsOpen(false)}>
                      Скрыть
                    </button>
                  </div>

                  <div className="warmfloor-settings-table-wrap">
                    <table className="warmfloor-settings-table">
                      <tbody>
                        <tr>
                          <th>Работа за 1 м², ₽</th>
                          <td><input className="text-input" value={warmFloorState.work_price_per_m2} onChange={(event) => setWarmFloorState((current) => ({ ...current, work_price_per_m2: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Труба на 1 м², м.п.</th>
                          <td><input className="text-input" value={warmFloorState.pipe_m_per_m2} onChange={(event) => setWarmFloorState((current) => ({ ...current, pipe_m_per_m2: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Макс. площадь контура, м²</th>
                          <td><input className="text-input" value={warmFloorState.max_contour_area_m2} onChange={(event) => setWarmFloorState((current) => ({ ...current, max_contour_area_m2: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Порог малой зоны, м²</th>
                          <td><input className="text-input" value={warmFloorState.small_zone_area_m2} onChange={(event) => setWarmFloorState((current) => ({ ...current, small_zone_area_m2: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Работа по гребёнке, ₽</th>
                          <td><input className="text-input" value={warmFloorState.manifold_work_price} onChange={(event) => setWarmFloorState((current) => ({ ...current, manifold_work_price: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Материал гребёнки, ₽</th>
                          <td><input className="text-input" value={warmFloorState.manifold_material_price} onChange={(event) => setWarmFloorState((current) => ({ ...current, manifold_material_price: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Работа по насосу, ₽</th>
                          <td><input className="text-input" value={warmFloorState.pump_work_price} onChange={(event) => setWarmFloorState((current) => ({ ...current, pump_work_price: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Материал насоса, ₽</th>
                          <td><input className="text-input" value={warmFloorState.pump_material_price} onChange={(event) => setWarmFloorState((current) => ({ ...current, pump_material_price: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Цена трубы за 1 м.п., ₽</th>
                          <td><input className="text-input" value={warmFloorState.pipe_price_per_m} onChange={(event) => setWarmFloorState((current) => ({ ...current, pipe_price_per_m: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Порог помещений для насоса</th>
                          <td><input className="text-input" value={warmFloorState.pump_rooms_threshold} onChange={(event) => setWarmFloorState((current) => ({ ...current, pump_rooms_threshold: event.target.value }))} /></td>
                        </tr>
                        <tr>
                          <th>Порог контуров для насоса</th>
                          <td><input className="text-input" value={warmFloorState.pump_contours_threshold} onChange={(event) => setWarmFloorState((current) => ({ ...current, pump_contours_threshold: event.target.value }))} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="section-separator">
                <span>Свод по тёплому полу</span>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <MetricChip label="Помещений ТП" value={String(warmFloorPreview.summary.rooms_count)} />
                <MetricChip label="Площадь ТП" value={formatArea(warmFloorPreview.summary.total_area_m2)} />
                <MetricChip label="Труба" value={formatMeters(warmFloorPreview.summary.total_pipe_m)} />
                <MetricChip label="Контуры" value={String(warmFloorPreview.summary.total_contours)} />
                <MetricChip label="Гребёнка" value={warmFloorPreview.summary.manifold_needed ? "Да" : "Нет"} />
                <MetricChip label="Насос" value={warmFloorPreview.summary.pump_needed ? "Да" : "Нет"} />
                <MetricChip label="Работы" value={formatMoney(warmFloorPreview.summary.work_total)} />
                <MetricChip label="Материалы" value={formatMoney(warmFloorPreview.summary.material_total)} />
                <MetricChip label="Итого" value={formatMoney(warmFloorPreview.summary.grand_total)} />
                <MetricChip label="Цена за м²" value={warmFloorPreview.summary.price_per_m2 === null ? "—" : formatMoney(warmFloorPreview.summary.price_per_m2)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="action-button"
                  disabled={busyKey === `calculator-warm-floor-save-${projectDetail.project.id}`}
                >
                  {busyKey === `calculator-warm-floor-save-${projectDetail.project.id}` ? "Сохраняю..." : "Сохранить тёплый пол"}
                </button>
                <button type="button" className="secondary-button" onClick={resetWarmFloorState}>
                  Сбросить правки
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Сначала выберите проект калькулятора.
        </div>
      )}
    </section>
  );
}
