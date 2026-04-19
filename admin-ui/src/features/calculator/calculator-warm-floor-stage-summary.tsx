import { Button } from "../../shared/controls";
import { MetricChip, formatArea, formatMeters, formatMoney } from "./calculator-shared";
import type { WarmFloorEditState } from "./calculator-types";
import type { WarmFloorStageReadyProps } from "./calculator-warm-floor-stage-types";

type WarmFloorConfigField = Exclude<keyof WarmFloorEditState, "rooms">;

const WARM_FLOOR_SETTINGS_FIELDS: Array<{ key: WarmFloorConfigField; label: string }> = [
  { key: "work_price_per_m2", label: "Работа за 1 м², ₽" },
  { key: "pipe_m_per_m2", label: "Труба на 1 м², м.п." },
  { key: "max_contour_area_m2", label: "Макс. площадь контура, м²" },
  { key: "small_zone_area_m2", label: "Порог малой зоны, м²" },
  { key: "manifold_work_price", label: "Работа по гребёнке, ₽" },
  { key: "manifold_material_price", label: "Материал гребёнки, ₽" },
  { key: "pump_work_price", label: "Работа по насосу, ₽" },
  { key: "pump_material_price", label: "Материал насоса, ₽" },
  { key: "pipe_price_per_m", label: "Цена трубы за 1 м.п., ₽" },
  { key: "pump_rooms_threshold", label: "Порог помещений для насоса" },
  { key: "pump_contours_threshold", label: "Порог контуров для насоса" },
];

export function WarmFloorStageSummaryColumn(props: WarmFloorStageReadyProps) {
  const {
    projectDetail,
    warmFloorPreview,
    warmFloorSettingsOpen,
    setWarmFloorSettingsOpen,
    setWarmFloorState,
    warmFloorState,
    busyKey,
    resetWarmFloorState,
  } = props;

  return (
    <div className="space-y-3">
      {warmFloorSettingsOpen ? (
        <div className="subpanel p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Таблица параметров</div>
              <div className="mt-1 text-[12px] text-slate-400">
                Здесь меняются цены, расход трубы и пороги по системе
              </div>
            </div>
            <Button type="button" variant="micro" onClick={() => setWarmFloorSettingsOpen(false)}>
              Скрыть
            </Button>
          </div>

          <div className="warmfloor-settings-table-wrap">
            <table className="warmfloor-settings-table">
              <tbody>
                {WARM_FLOOR_SETTINGS_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <th>{field.label}</th>
                    <td>
                      <input
                        className="text-input"
                        value={warmFloorState[field.key]}
                        onChange={(event) =>
                          setWarmFloorState((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
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
        <MetricChip
          label="Цена за м²"
          value={
            warmFloorPreview.summary.price_per_m2 === null ? "—" : formatMoney(warmFloorPreview.summary.price_per_m2)
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busyKey === `calculator-warm-floor-save-${projectDetail.project.id}`}>
          {busyKey === `calculator-warm-floor-save-${projectDetail.project.id}`
            ? "Сохраняю..."
            : "Сохранить тёплый пол"}
        </Button>
        <Button type="button" variant="secondary" onClick={resetWarmFloorState}>
          Сбросить правки
        </Button>
      </div>
    </div>
  );
}
