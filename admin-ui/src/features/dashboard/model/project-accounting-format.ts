import type { ProjectCardLedgerEntry, ProjectCardLedgerStatus } from "./project-model";
import { formatDateRu } from "../../../shared/formatters/date";
import { formatMoneyCurrency } from "../../../shared/formatters/money";

export function formatMoney(value: number) {
  return formatMoneyCurrency(value);
}

export function formatMoneyPerSquare(value: number) {
  return `${formatMoney(value)}/м²`;
}

export function formatDisplayDate(value: string) {
  return formatDateRu(value);
}

export function ledgerStatusView(status: ProjectCardLedgerStatus): {
  label: string;
  tone: "ok" | "warn" | "neutral" | "active" | "error";
} {
  switch (status) {
    case "completed":
      return { label: "Закрыто", tone: "ok" };
    case "paid":
      return { label: "Оплачено", tone: "active" };
    case "waiting-payment":
      return { label: "Ожидает оплаты", tone: "warn" };
    case "invoice":
      return { label: "Счёт", tone: "warn" };
    case "planned":
    default:
      return { label: "План", tone: "neutral" };
  }
}

export function ledgerCommittedAmount(entry: Pick<ProjectCardLedgerEntry, "status" | "planAmount" | "actualAmount">) {
  if (entry.status === "planned") {
    return entry.planAmount;
  }

  return entry.actualAmount > 0 ? entry.actualAmount : entry.planAmount;
}

export function ledgerPlanBaselineAmount(entry: Pick<ProjectCardLedgerEntry, "status" | "planAmount" | "actualAmount">) {
  if (entry.planAmount > 0) {
    return entry.planAmount;
  }

  return entry.status === "planned" ? 0 : ledgerCommittedAmount(entry);
}

export function ledgerPlanBalanceAmount(entry: Pick<ProjectCardLedgerEntry, "status" | "planAmount" | "actualAmount">) {
  if (entry.status === "planned") {
    return entry.planAmount;
  }

  if (entry.planAmount <= 0) {
    return 0;
  }

  if (entry.actualAmount > 0) {
    return entry.planAmount - entry.actualAmount;
  }

  return entry.planAmount;
}

export function ledgerPaidAmount(entry: Pick<ProjectCardLedgerEntry, "status" | "planAmount" | "actualAmount">) {
  if (entry.status !== "paid" && entry.status !== "completed") {
    return 0;
  }

  return entry.actualAmount > 0 ? entry.actualAmount : entry.planAmount;
}

export function sumLedgerPlanByStatuses(
  entries: ProjectCardLedgerEntry[],
  statuses: ProjectCardLedgerStatus[],
): number {
  return entries.reduce((total, entry) => (statuses.includes(entry.status) ? total + entry.planAmount : total), 0);
}

export function sumLedgerCommittedByStatuses(
  entries: ProjectCardLedgerEntry[],
  statuses: ProjectCardLedgerStatus[],
): number {
  return entries.reduce((total, entry) => (statuses.includes(entry.status) ? total + ledgerCommittedAmount(entry) : total), 0);
}

export function sumLedgerActualByStatuses(
  entries: ProjectCardLedgerEntry[],
  statuses: ProjectCardLedgerStatus[],
): number {
  return entries.reduce((total, entry) => (statuses.includes(entry.status) ? total + entry.actualAmount : total), 0);
}

export function sumLedgerPaidByStatuses(
  entries: ProjectCardLedgerEntry[],
  statuses: ProjectCardLedgerStatus[],
): number {
  return entries.reduce((total, entry) => (statuses.includes(entry.status) ? total + ledgerPaidAmount(entry) : total), 0);
}
