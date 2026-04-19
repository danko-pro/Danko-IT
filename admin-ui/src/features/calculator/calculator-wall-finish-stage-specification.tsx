import { formatMoney, trimFloat } from "./calculator-shared";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

type WallFinishStageSpecificationProps = Pick<WallFinishStageReadyProps, "wallFinishPreview">;

export function WallFinishStageSpecification(props: WallFinishStageSpecificationProps) {
  return (
    <div className="subpanel p-3 space-y-2">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация для сметы</div>
      {props.wallFinishPreview.specification.length ? (
        <div className="space-y-2">
          {props.wallFinishPreview.specification.map((item, index) => (
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
  );
}
