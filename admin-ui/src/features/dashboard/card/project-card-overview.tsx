import type { ReactNode } from "react";
import { formatMoney } from "../model/project-accounting-format";
import type { ProjectFinanceSummary } from "../model/project-model";
import { formatPerSquare } from "./project-card-metrics-view";
import { SideMetric, SummaryMetric } from "./project-card-primitives";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardOverviewProps = Pick<ProjectCardProps, "project">;

type FinanceMetricGroupProps = {
  title: string;
  tone?: "cash" | "plan" | "total" | "reference";
  children: ReactNode;
};

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

function FinanceMetricGroup(props: FinanceMetricGroupProps) {
  const toneClass = props.tone ? ` dashboard-project-finance-group-${props.tone}` : "";

  return (
    <section className={`dashboard-project-finance-group${toneClass}`}>
      <div className="dashboard-project-finance-group-title">{props.title}</div>
      <div className="dashboard-project-metrics">{props.children}</div>
    </section>
  );
}

export function ProjectCardOverview(props: ProjectCardOverviewProps) {
  const financeSummary: ProjectFinanceSummary | undefined = props.project.financeSummary;

  return (
    <div className="dashboard-project-overview">
      <div className="dashboard-project-finance-groups">
        <FinanceMetricGroup title="Деньги и факт" tone="cash">
          <SummaryMetric label="Пришло денег" value={formatFinanceMoney(financeSummary?.receivedTotal)} accent="cyan" />
          <SummaryMetric label="Факт расходов" value={formatFinanceMoney(financeSummary?.paidExpenseTotal)} />
          <SummaryMetric
            label="После факта"
            value={formatFinanceMoney(financeSummary?.cashBalance)}
            accent="emerald"
            valueTone={balanceTone(financeSummary?.cashBalance)}
          />
        </FinanceMetricGroup>

        <FinanceMetricGroup title="План и обязательства" tone="plan">
          <SummaryMetric label="План расходов" value={formatFinanceMoney(financeSummary?.plannedExpenseTotal)} accent="amber" />
          <SummaryMetric label="Обязательства" value={formatFinanceMoney(financeSummary?.committedUnpaidTotal)} />
          <SummaryMetric
            label="После плана"
            value={formatFinanceMoney(financeSummary?.availableAfterPlan)}
            valueTone={balanceTone(financeSummary?.availableAfterPlan)}
          />
          <SummaryMetric
            label="После обязательств"
            value={formatFinanceMoney(financeSummary?.availableAfterObligations)}
            valueTone={balanceTone(financeSummary?.availableAfterObligations)}
          />
        </FinanceMetricGroup>

        <FinanceMetricGroup title="Налог и итог" tone="total">
          <SummaryMetric label="Налоговый резерв" value={formatFinanceMoney(financeSummary?.taxReserveTotal)} />
          <SummaryMetric
            label="Чистый остаток"
            value={formatFinanceMoney(financeSummary?.netAvailable)}
            accent="emerald"
            valueTone={balanceTone(financeSummary?.netAvailable)}
          />
        </FinanceMetricGroup>

        <section className="dashboard-project-finance-group dashboard-project-finance-group-reference">
          <div className="dashboard-project-finance-group-title">Метрики на м²</div>
          <div className="dashboard-project-side-metrics">
            <SideMetric label="Работы / м²" value={formatFinancePerSquare(financeSummary?.workPerM2)} />
            <SideMetric label="Материалы / м²" value={formatFinancePerSquare(financeSummary?.materialsPerM2)} />
          </div>
        </section>
      </div>
    </div>
  );
}
