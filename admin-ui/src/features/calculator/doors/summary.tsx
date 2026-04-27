import { MetricChip } from "./";
import { formatMoney, trimFloat } from "./";
import type { DoorsProjectPanelProps } from "./";

type DoorsProjectSummaryProps = Pick<DoorsProjectPanelProps, "doorsStageSummary" | "doorsStageSpecification">;

// Сводка и сметная спецификация дверного stage.
// Блок показывает агрегированные totals и итоговый список работ/материалов по дверям.

export function DoorsProjectSummary(props: DoorsProjectSummaryProps) {
  return (
    <>
      <div className="section-separator">
        <span>Свод и спецификация</span>
      </div>

      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <MetricChip label="Позиций" value={String(props.doorsStageSummary.total_items)} />
          <MetricChip label="Дверей" value={String(props.doorsStageSummary.door_units)} />
          <MetricChip label="Проёмов" value={String(props.doorsStageSummary.opening_units)} />
          <MetricChip label="Оформл. проёмов" value={String(props.doorsStageSummary.trim_only_units)} />
          <MetricChip label="Закуп" value={formatMoney(props.doorsStageSummary.purchase_total)} />
          <MetricChip label="Продажа" value={formatMoney(props.doorsStageSummary.sale_total)} />
          <MetricChip label="Монтаж" value={formatMoney(props.doorsStageSummary.install_total)} />
          <MetricChip label="Итого" value={formatMoney(props.doorsStageSummary.grand_total)} />
          <MetricChip label="Маржа" value={formatMoney(props.doorsStageSummary.margin_total)} />
        </div>

        <div className="subpanel p-3 space-y-2">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Свод комплектации дверей</div>
          <div className="grid gap-2 md:grid-cols-2">
            <MetricChip label="Комплект: закуп" value={formatMoney(props.doorsStageSummary.components_purchase_total)} />
            <MetricChip label="Комплект: продажа" value={formatMoney(props.doorsStageSummary.components_sale_total)} />
          </div>
        </div>

        <div className="subpanel p-3 space-y-2">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация по дверям</div>
          {props.doorsStageSpecification.length ? (
            <div className="space-y-2">
              {props.doorsStageSpecification.map((item, index) => (
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
              Пока нет дверей или проёмов для сметной спецификации.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
