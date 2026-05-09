import { CalculatorSpecificationSheet, CalculatorStageSectionHeader, MetricChip, formatMoney } from "./";
import type { DoorsProjectPanelProps } from "./";

type DoorsProjectSummaryProps = Pick<DoorsProjectPanelProps, "doorsStageSummary" | "doorsStageSpecification">;

export function DoorsProjectSummary(props: DoorsProjectSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="subpanel calculator-stage-section p-3 space-y-3">
        <CalculatorStageSectionHeader
          kicker="Свод по дверям"
          title="Количество, продажи, монтаж и маржа"
          note="Агрегированные totals по дверям, проёмам и оформлению проёмов в рамках текущего проекта."
        />

        <div className="calculator-stage-metric-grid md:grid-cols-2">
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
      </div>

      <div className="subpanel calculator-stage-section p-3 space-y-3">
        <CalculatorStageSectionHeader
          kicker="Комплектация"
          title="Свод по комплектующим"
          note="Отдельный срез по комплектам выбранных дверей: сколько уходит в закуп и сколько остаётся в продаже."
        />

        <div className="calculator-stage-metric-grid md:grid-cols-2">
          <MetricChip label="Комплект: закуп" value={formatMoney(props.doorsStageSummary.components_purchase_total)} />
          <MetricChip label="Комплект: продажа" value={formatMoney(props.doorsStageSummary.components_sale_total)} />
        </div>
      </div>

      <CalculatorSpecificationSheet
        title="Дверная ведомость"
        items={props.doorsStageSpecification}
        emptyText="Пока нет дверей или проёмов для сметной ведомости."
      />
    </div>
  );
}
