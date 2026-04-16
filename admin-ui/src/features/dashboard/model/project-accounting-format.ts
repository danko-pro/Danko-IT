import type { ProjectCardLedgerEntry, ProjectCardLedgerStatus } from "./project-model";

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

export function formatMoneyPerSquare(value: number) {
  return `${formatMoney(value)}/м²`;
}

export function formatDisplayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("ru-RU");
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
