import { formatMoney } from "../model/project-accounting-format";
import type { ProjectFinanceSummary } from "../model/project-model";
import { formatPerSquare } from "./project-card-metrics-view";
import { SideMetric, SummaryMetric } from "./project-card-primitives";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardOverviewProps = Pick<ProjectCardProps, "project">;

function hasFiniteValue(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatFinanceMoney(value: number | undefined) {
  return hasFiniteValue(value) ? formatMoney(value) : "-";
}

function formatFinancePerSquare(value: number | undefined) {
  return hasFiniteValue(value) ? formatPerSquare(value) : "-";
}

function balanceTone(value: number | undefined) {
  if (!hasFiniteValue(value) || Math.abs(value) < 0.005) {
    return "neutral" as const;
  }

  return value > 0 ? ("positive" as const) : ("negative" as const);
}

export function ProjectCardOverview(props: ProjectCardOverviewProps) {
  const financeSummary: ProjectFinanceSummary | undefined = props.project.financeSummary;

  return (
    <div className="dashboard-project-overview">
      <section className="dashboard-project-metrics">
        <SummaryMetric label="Пришло денег" value={formatFinanceMoney(financeSummary?.receivedTotal)} accent="cyan" />
        <SummaryMetric label="Факт расходов" value={formatFinanceMoney(financeSummary?.paidExpenseTotal)} />
        <SummaryMetric label="План расходов" value={formatFinanceMoney(financeSummary?.plannedExpenseTotal)} accent="amber" />
        <SummaryMetric label="Обязательства" value={formatFinanceMoney(financeSummary?.committedUnpaidTotal)} />
        <SummaryMetric
          label="После факта"
          value={formatFinanceMoney(financeSummary?.cashBalance)}
          accent="emerald"
          valueTone={balanceTone(financeSummary?.cashBalance)}
        />
        <SummaryMetric
          label="После плана"
          value={formatFinanceMoney(financeSummary?.availableAfterPlan)}
          valueTone={balanceTone(financeSummary?.availableAfterPlan)}
        />
        <SummaryMetric
          label="После обяз."
          value={formatFinanceMoney(financeSummary?.availableAfterObligations)}
          valueTone={balanceTone(financeSummary?.availableAfterObligations)}
        />
        <SummaryMetric label="Налоговый резерв" value={formatFinanceMoney(financeSummary?.taxReserveTotal)} />
        <SummaryMetric
          label="Чистый остаток"
          value={formatFinanceMoney(financeSummary?.netAvailable)}
          accent="emerald"
          valueTone={balanceTone(financeSummary?.netAvailable)}
        />
      </section>

      <section className="dashboard-project-side-metrics">
        <SideMetric label="Работы / м2" value={formatFinancePerSquare(financeSummary?.workPerM2)} />
        <SideMetric label="Материалы / м2" value={formatFinancePerSquare(financeSummary?.materialsPerM2)} />
      </section>
    </div>
  );
}
