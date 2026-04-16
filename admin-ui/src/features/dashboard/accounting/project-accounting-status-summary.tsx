import { formatMoney, sumLedgerActualByStatuses, sumLedgerPlanByStatuses } from "../model/project-accounting-format";
import type { DashboardProjectCardData } from "../model/project-model";

type StatusSummaryTone = "amber" | "cyan" | "emerald" | "slate" | "rose";

function countEntriesByStatuses(
  project: DashboardProjectCardData,
  statuses: DashboardProjectCardData["ledgerEntries"][number]["status"][],
) {
  return project.ledgerEntries.filter((entry) => statuses.includes(entry.status)).length;
}

function StatusSummaryItem(props: { label: string; value: string; meta: string; tone: StatusSummaryTone }) {
  return (
    <div className={`dashboard-ledger-status-item dashboard-ledger-status-item-${props.tone}`}>
      <div className="dashboard-ledger-status-item-body">
        <div className="dashboard-ledger-status-label">{props.label}</div>
        <div className="dashboard-ledger-status-meta">{props.meta}</div>
      </div>
      <div className="dashboard-ledger-status-value">{props.value}</div>
    </div>
  );
}

export function ProjectAccountingStatusSummary(props: { project: DashboardProjectCardData }) {
  const invoiceTotal = sumLedgerPlanByStatuses(props.project.ledgerEntries, ["invoice"]);
  const waitingPaymentTotal = sumLedgerPlanByStatuses(props.project.ledgerEntries, ["waiting-payment"]);
  const paidTotal = sumLedgerActualByStatuses(props.project.ledgerEntries, ["paid", "completed"]);
  const plannedTotal = sumLedgerPlanByStatuses(props.project.ledgerEntries, ["planned"]);
  const invoiceCount = countEntriesByStatuses(props.project, ["invoice"]);
  const waitingPaymentCount = countEntriesByStatuses(props.project, ["waiting-payment"]);
  const paidCount = countEntriesByStatuses(props.project, ["paid", "completed"]);
  const plannedCount = countEntriesByStatuses(props.project, ["planned"]);

  return (
    <aside className="dashboard-ledger-status-summary">
      <StatusSummaryItem
        label="Счёт"
        value={formatMoney(invoiceTotal)}
        meta={`${invoiceCount} строк`}
        tone="amber"
      />
      <StatusSummaryItem
        label="Ожидает оплаты"
        value={formatMoney(waitingPaymentTotal)}
        meta={`${waitingPaymentCount} строк`}
        tone="cyan"
      />
      <StatusSummaryItem
        label="Оплачено"
        value={formatMoney(paidTotal)}
        meta={`${paidCount} строк`}
        tone="emerald"
      />
      <StatusSummaryItem
        label="План"
        value={formatMoney(plannedTotal)}
        meta={`${plannedCount} строк`}
        tone="slate"
      />
    </aside>
  );
}
