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

export function sumLedgerPlanByStatuses(
  entries: ProjectCardLedgerEntry[],
  statuses: ProjectCardLedgerStatus[],
): number {
  return entries.reduce((total, entry) => (statuses.includes(entry.status) ? total + entry.planAmount : total), 0);
}

export function sumLedgerActualByStatuses(
  entries: ProjectCardLedgerEntry[],
  statuses: ProjectCardLedgerStatus[],
): number {
  return entries.reduce((total, entry) => (statuses.includes(entry.status) ? total + entry.actualAmount : total), 0);
}
