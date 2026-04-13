import { ProjectAccountingStatusSummary } from "./project-accounting-status-summary";
import { formatMoney, formatMoneyPerSquare } from "../model/project-accounting-format";
import type { DashboardProjectCardData } from "../model/project-model";

type StripTone = "amber" | "cyan" | "emerald" | "rose" | "slate";

function SummaryStripItem(props: { label: string; value: string; tone: StripTone }) {
  return (
    <div className={`dashboard-ledger-strip-item dashboard-ledger-strip-item-${props.tone}`}>
      <div className="dashboard-ledger-strip-label">{props.label}</div>
      <div className="dashboard-ledger-strip-value">{props.value}</div>
    </div>
  );
}

export function ProjectAccountingSummaryStrip(props: { project: DashboardProjectCardData }) {
  return (
    <section className="dashboard-ledger-topbar">
      <div className="dashboard-ledger-summary-strip">
        <SummaryStripItem label="Договор" value={formatMoney(props.project.contract.amount)} tone="amber" />
        <SummaryStripItem label="Остаток 30%" value={formatMoney(props.project.remainingTotal)} tone="emerald" />
        <SummaryStripItem label="План" value={formatMoney(props.project.plannedTotal)} tone="slate" />
        <SummaryStripItem label="Отложено" value={formatMoney(props.project.deferredTotal)} tone="rose" />
        <SummaryStripItem label="Факт" value={formatMoney(props.project.actualTotal)} tone="cyan" />
        <SummaryStripItem label="Работы" value={formatMoneyPerSquare(props.project.workPerM2)} tone="amber" />
        <SummaryStripItem label="Материалы" value={formatMoneyPerSquare(props.project.materialsPerM2)} tone="emerald" />
      </div>

      <ProjectAccountingStatusSummary project={props.project} />
    </section>
  );
}
