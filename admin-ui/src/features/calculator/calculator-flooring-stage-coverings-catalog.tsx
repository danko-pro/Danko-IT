import {
  formatMoney,
  formatPerSquareRate,
  getUnderlayModeLabel,
  trimFloat,
} from "./calculator-shared";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

type FlooringStageCoveringsCatalogProps = Pick<FlooringStageReadyProps, "flooringDetail">;

export function FlooringStageCoveringsCatalog(props: FlooringStageCoveringsCatalogProps) {
  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">Каталог технологических карт покрытий</summary>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {props.flooringDetail.coverings.map((item) => (
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
              <span className="stat-chip">Клей {formatPerSquareRate(item.glue_consumption_per_m2, item.glue_unit)}</span>
              <span className="stat-chip">Грунт {formatPerSquareRate(item.primer_consumption_per_m2, item.primer_unit)}</span>
              <span className="stat-chip">СВП {formatPerSquareRate(item.svp_consumption_per_m2, item.svp_unit)}</span>
              <span className="stat-chip">Затирка {formatPerSquareRate(item.grout_consumption_per_m2, item.grout_unit)}</span>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
