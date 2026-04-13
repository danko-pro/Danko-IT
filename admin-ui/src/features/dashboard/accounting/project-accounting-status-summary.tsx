import { formatMoney, sumLedgerActualByStatuses, sumLedgerPlanByStatuses } from "../model/project-accounting-format";
import type { DashboardProjectCardData } from "../model/project-model";

type StatusSummaryTone = "amber" | "cyan" | "emerald" | "slate" | "rose";

function StatusSummaryItem(props: { label: string; value: string; tone: StatusSummaryTone }) {
  return (
    <div className={`dashboard-ledger-status-item dashboard-ledger-status-item-${props.tone}`}>
      <div className="dashboard-ledger-status-label">{props.label}</div>
      <div className="dashboard-ledger-status-value">{props.value}</div>
    </div>
  );
}

export function ProjectAccountingStatusSummary(props: { project: DashboardProjectCardData }) {
  const invoiceTotal = sumLedgerPlanByStatuses(props.project.ledgerEntries, ["invoice"]);
  const waitingPaymentTotal = sumLedgerPlanByStatuses(props.project.ledgerEntries, ["waiting-payment"]);
  const paidTotal = sumLedgerActualByStatuses(props.project.ledgerEntries, ["paid", "completed"]);
  const plannedTotal = sumLedgerPlanByStatuses(props.project.ledgerEntries, ["planned"]);

  return (
    <aside className="dashboard-ledger-status-summary">
      <StatusSummaryItem label="Счёт" value={formatMoney(invoiceTotal)} tone="amber" />
      <StatusSummaryItem label="Ждём оплату" value={formatMoney(waitingPaymentTotal)} tone="cyan" />
      <StatusSummaryItem label="Оплачено" value={formatMoney(paidTotal)} tone="emerald" />
      <StatusSummaryItem label="План" value={formatMoney(plannedTotal)} tone="slate" />
      <StatusSummaryItem label="Отложено" value={formatMoney(props.project.deferredTotal)} tone="rose" />
    </aside>
  );
}
