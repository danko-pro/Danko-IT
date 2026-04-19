import { formatMoney } from "../model/project-accounting-format";
import { formatPerSquare } from "./project-card-metrics-view";
import { SideMetric, SummaryMetric } from "./project-card-primitives";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardOverviewProps = Pick<ProjectCardProps, "project">;

export function ProjectCardOverview(props: ProjectCardOverviewProps) {
  return (
    <>
      <section className="dashboard-project-metrics">
        <SummaryMetric label="Пришло" value={formatMoney(props.project.receivedTotal)} accent="cyan" />
        <SummaryMetric label="Остаток" value={formatMoney(props.project.remainingTotal)} accent="emerald" />
        <SummaryMetric label="Отложено" value={formatMoney(props.project.deferredTotal)} />
        <SummaryMetric label="План" value={formatMoney(props.project.plannedTotal)} accent="amber" />
        <SummaryMetric label="Факт" value={formatMoney(props.project.actualTotal)} />
      </section>

      <section className="dashboard-project-side-metrics">
        <SideMetric label="Работы / м²" value={formatPerSquare(props.project.workPerM2)} />
        <SideMetric label="Материалы / м²" value={formatPerSquare(props.project.materialsPerM2)} />
        <SideMetric label="Плановая маржа" value={`${props.project.plannedMarginPercent}%`} />
      </section>
    </>
  );
}
