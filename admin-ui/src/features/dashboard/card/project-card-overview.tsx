import { formatMoney, sumLedgerCommittedByStatuses } from "../model/project-accounting-format";
import { formatPerSquare } from "./project-card-metrics-view";
import { SideMetric, SummaryMetric } from "./project-card-primitives";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardOverviewProps = Pick<ProjectCardProps, "project">;

function buildPlanValue(plannedTotal: number) {
  if (Math.abs(plannedTotal) < 0.005) {
    return { value: "0 ₽", tone: "neutral" as const };
  }

  return {
    value: `${plannedTotal > 0 ? "+" : "-"}${formatMoney(Math.abs(plannedTotal))}`,
    tone: plannedTotal > 0 ? ("positive" as const) : ("negative" as const),
  };
}

export function ProjectCardOverview(props: ProjectCardOverviewProps) {
  const waitingPaymentTotal = sumLedgerCommittedByStatuses(props.project.ledgerEntries, ["waiting-payment"]);
  const planValue = buildPlanValue(props.project.plannedTotal);

  return (
    <div className="dashboard-project-overview">
      <section className="dashboard-project-metrics">
        <SummaryMetric label="Пришло" value={formatMoney(props.project.receivedTotal)} accent="cyan" />
        <SummaryMetric label="Остаток" value={formatMoney(props.project.remainingTotal)} accent="emerald" />
        <SummaryMetric label="Ожидает оплаты" value={formatMoney(waitingPaymentTotal)} />
        <SummaryMetric
          label="План"
          value={planValue.value}
          accent="amber"
          valueTone={planValue.tone}
        />
        <SummaryMetric label="Факт" value={formatMoney(props.project.actualTotal)} />
      </section>

      <section className="dashboard-project-side-metrics">
        <SideMetric label="Работы / м²" value={formatPerSquare(props.project.workPerM2)} />
        <SideMetric label="Материалы / м²" value={formatPerSquare(props.project.materialsPerM2)} />
        <SideMetric label="Плановая маржа" value={`${props.project.plannedMarginPercent}%`} />
      </section>
    </div>
  );
}
