import { Button } from "../../shared/controls";
import { SelectField, TextField, underlayModeOptions } from "./calculator-shared";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

export function FlooringStageCatalogsPanel(props: FlooringStageReadyProps) {
  const {
    flooringDetail,
    flooringCoveringState,
    setFlooringCoveringState,
    flooringPreparationState,
    setFlooringPreparationState,
    flooringLayoutState,
    setFlooringLayoutState,
    busyKey,
    submitFlooringCovering,
    submitFlooringPreparation,
    submitFlooringLayout,
  } = props;

  return (
    <>
      <div className="section-separator">
        <span>Каталоги и параметры покрытий</span>
      </div>

      <details className="subpanel p-3 details-panel">
        <summary className="details-summary">Справочник покрытий</summary>
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-4">
            <TextField
              label="Название"
              value={flooringCoveringState.title}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, title: value }))}
              placeholder="Например, Ламинат 33 кл."
            />
            <TextField
              label="Материал, ₽/м²"
              value={flooringCoveringState.material_price_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, material_price_per_m2: value }))
              }
            />
            <TextField
              label="Работа, ₽/м²"
              value={flooringCoveringState.labor_price_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, labor_price_per_m2: value }))
              }
            />
            <TextField
              label="Базовый запас, %"
              value={flooringCoveringState.base_waste_percent}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, base_waste_percent: value }))
              }
            />
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <SelectField
              label="Подложка"
              value={flooringCoveringState.underlay_mode}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, underlay_mode: value }))}
              options={underlayModeOptions}
            />
            <TextField
              label="Расход подложки"
              value={flooringCoveringState.underlay_consumption_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, underlay_consumption_per_m2: value }))
              }
            />
            <TextField
              label="Инструмент, ₽/м²"
              value={flooringCoveringState.instrument_price_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, instrument_price_per_m2: value }))
              }
            />
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={flooringCoveringState.needs_plinth}
                onChange={(event) =>
                  setFlooringCoveringState((current) => ({ ...current, needs_plinth: event.target.checked }))
                }
              />
              <div>
                <div className="text-sm font-semibold text-slate-100">Считать плинтус</div>
                <div className="mt-0.5 text-[12px] text-slate-400">
                  Отключайте для плитки и зон без плинтуса
                </div>
              </div>
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <TextField
              label="Клей: расход"
              value={flooringCoveringState.glue_consumption_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, glue_consumption_per_m2: value }))
              }
            />
            <TextField
              label="Клей: ед."
              value={flooringCoveringState.glue_unit}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, glue_unit: value }))}
            />
            <TextField
              label="Клей: цена"
              value={flooringCoveringState.glue_price_per_unit}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, glue_price_per_unit: value }))
              }
            />
            <TextField
              label="Грунт: расход"
              value={flooringCoveringState.primer_consumption_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, primer_consumption_per_m2: value }))
              }
            />
            <TextField
              label="Грунт: ед."
              value={flooringCoveringState.primer_unit}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, primer_unit: value }))}
            />
            <TextField
              label="Грунт: цена"
              value={flooringCoveringState.primer_price_per_unit}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, primer_price_per_unit: value }))
              }
            />
            <TextField
              label="СВП: расход"
              value={flooringCoveringState.svp_consumption_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, svp_consumption_per_m2: value }))
              }
            />
            <TextField
              label="СВП: ед."
              value={flooringCoveringState.svp_unit}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, svp_unit: value }))}
            />
            <TextField
              label="СВП: цена"
              value={flooringCoveringState.svp_price_per_unit}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, svp_price_per_unit: value }))
              }
            />
            <TextField
              label="Затирка: расход"
              value={flooringCoveringState.grout_consumption_per_m2}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, grout_consumption_per_m2: value }))
              }
            />
            <TextField
              label="Затирка: ед."
              value={flooringCoveringState.grout_unit}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, grout_unit: value }))}
            />
            <TextField
              label="Затирка: цена"
              value={flooringCoveringState.grout_price_per_unit}
              onChange={(value) =>
                setFlooringCoveringState((current) => ({ ...current, grout_price_per_unit: value }))
              }
            />
          </div>
          <TextField
            label="Примечание"
            value={flooringCoveringState.note}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, note: value }))}
            placeholder="Например, клеевой кварцвинил / плитка 600x600"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {flooringDetail.coverings.slice(0, 6).map((item) => (
                <span key={item.id} className="stat-chip">
                  {item.title}
                </span>
              ))}
            </div>
            <Button
              type="button"
              disabled={busyKey === "calculator-flooring-covering-create"}
              onClick={() => void submitFlooringCovering()}
            >
              {busyKey === "calculator-flooring-covering-create" ? "Сохраняю..." : "Добавить покрытие"}
            </Button>
          </div>
        </div>
      </details>

      <div className="grid gap-3 xl:grid-cols-2">
        <details className="subpanel p-3 details-panel">
          <summary className="details-summary">Подготовка основания</summary>
          <div className="mt-3 space-y-2">
            <TextField
              label="Название"
              value={flooringPreparationState.title}
              onChange={(value) => setFlooringPreparationState((current) => ({ ...current, title: value }))}
              placeholder="Например, Наливной пол"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <TextField
                label="Работа, ₽/м²"
                value={flooringPreparationState.labor_price_per_m2}
                onChange={(value) =>
                  setFlooringPreparationState((current) => ({ ...current, labor_price_per_m2: value }))
                }
              />
              <TextField
                label="Материал, ₽/м²"
                value={flooringPreparationState.material_price_per_m2}
                onChange={(value) =>
                  setFlooringPreparationState((current) => ({ ...current, material_price_per_m2: value }))
                }
              />
              <TextField
                label="Грунт: расход"
                value={flooringPreparationState.primer_consumption_per_m2}
                onChange={(value) =>
                  setFlooringPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
                }
              />
              <TextField
                label="Грунт: цена"
                value={flooringPreparationState.primer_price_per_unit}
                onChange={(value) =>
                  setFlooringPreparationState((current) => ({ ...current, primer_price_per_unit: value }))
                }
              />
            </div>
            <TextField
              label="Примечание"
              value={flooringPreparationState.note}
              onChange={(value) => setFlooringPreparationState((current) => ({ ...current, note: value }))}
            />
            <Button
              type="button"
              className="w-full"
              disabled={busyKey === "calculator-flooring-preparation-create"}
              onClick={() => void submitFlooringPreparation()}
            >
              {busyKey === "calculator-flooring-preparation-create" ? "Сохраняю..." : "Добавить подготовку"}
            </Button>
          </div>
        </details>

        <details className="subpanel p-3 details-panel">
          <summary className="details-summary">Способы укладки</summary>
          <div className="mt-3 space-y-2">
            <TextField
              label="Название"
              value={flooringLayoutState.title}
              onChange={(value) => setFlooringLayoutState((current) => ({ ...current, title: value }))}
              placeholder="Например, Диагональ"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <TextField
                label="Коэфф. к работе"
                value={flooringLayoutState.labor_multiplier}
                onChange={(value) => setFlooringLayoutState((current) => ({ ...current, labor_multiplier: value }))}
              />
              <TextField
                label="Доп. запас, %"
                value={flooringLayoutState.extra_waste_percent}
                onChange={(value) =>
                  setFlooringLayoutState((current) => ({ ...current, extra_waste_percent: value }))
                }
              />
            </div>
            <TextField
              label="Примечание"
              value={flooringLayoutState.note}
              onChange={(value) => setFlooringLayoutState((current) => ({ ...current, note: value }))}
            />
            <Button
              type="button"
              className="w-full"
              disabled={busyKey === "calculator-flooring-layout-create"}
              onClick={() => void submitFlooringLayout()}
            >
              {busyKey === "calculator-flooring-layout-create" ? "Сохраняю..." : "Добавить укладку"}
            </Button>
          </div>
        </details>
      </div>
    </>
  );
}
