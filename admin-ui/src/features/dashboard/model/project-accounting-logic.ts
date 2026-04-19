import type {
  DashboardProjectCardData,
  ProjectCardExpenseItem,
  ProjectCardExpenseTone,
  ProjectCardLedgerEntry,
} from "./project-model";
import { ledgerCommittedAmount, ledgerPaidAmount, ledgerPlanBalanceAmount } from "./project-accounting-format";

const CATEGORY_ORDER = ["Работы", "Материалы", "Услуги", "Техника", "Мебель", "Двери", "Другое"];

function expenseToneForCategory(category: string): ProjectCardExpenseTone {
  switch (category) {
    case "Работы":
      return "cyan";
    case "Материалы":
      return "emerald";
    case "Услуги":
      return "amber";
    case "Техника":
      return "rose";
    case "Мебель":
    case "Двери":
    case "Другое":
    default:
      return "slate";
  }
}

function expenseAmountForEntry(entry: ProjectCardLedgerEntry) {
  return ledgerCommittedAmount(entry);
}

function formatNextDeliveryLabel(controlDate: string | null) {
  if (!controlDate) {
    return "—";
  }

  const parsed = new Date(`${controlDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return controlDate;
  }

  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).formatToParts(parsed);

  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";

  return `${day}.${month} ${weekday}`.trim();
}

function buildExpenses(entries: ProjectCardLedgerEntry[]): ProjectCardExpenseItem[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const amount = expenseAmountForEntry(entry);
    if (amount <= 0) {
      continue;
    }

    totals.set(entry.category, (totals.get(entry.category) ?? 0) + amount);
  }

  const orderedLabels = [
    ...CATEGORY_ORDER.filter((label) => totals.has(label)),
    ...[...totals.keys()]
      .filter((label) => !CATEGORY_ORDER.includes(label))
      .sort((left, right) => left.localeCompare(right, "ru")),
  ];

  return orderedLabels.map((label) => ({
    label,
    amount: totals.get(label) ?? 0,
    tone: expenseToneForCategory(label),
  }));
}

export function buildLedgerExpenses(entries: ProjectCardLedgerEntry[]): ProjectCardExpenseItem[] {
  return buildExpenses(entries);
}

export function createEmptyLedgerEntry(): ProjectCardLedgerEntry {
  return {
    id: `ledger-${Date.now()}`,
    category: "Работы",
    item: "",
    owner: "",
    counterparty: "",
    counterpartyDetails: null,
    status: "planned",
    invoiceDocument: null,
    actDocument: null,
    planAmount: 0,
    actualAmount: 0,
    controlDate: new Date().toISOString().slice(0, 10),
  };
}

export function recalculateProjectFromLedger(project: DashboardProjectCardData): DashboardProjectCardData {
  const plannedTotal = project.ledgerEntries.reduce((total, entry) => total + ledgerPlanBalanceAmount(entry), 0);
  const actualTotal = project.ledgerEntries.reduce((total, entry) => total + ledgerPaidAmount(entry), 0);
  const deferredTotal = project.ledgerEntries.reduce(
    (total, entry) => total + (entry.status === "waiting-payment" ? ledgerCommittedAmount(entry) : 0),
    0,
  );
  const expenses = buildExpenses(project.ledgerEntries);
  const workExpense = expenses.find((expense) => expense.label === "Работы")?.amount ?? 0;
  const materialsExpense = expenses.find((expense) => expense.label === "Материалы")?.amount ?? 0;

  const nextControlDate =
    [...project.ledgerEntries]
      .map((entry) => entry.controlDate)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))[0] ?? null;

  return {
    ...project,
    plannedTotal,
    actualTotal,
    deferredTotal,
    remainingTotal: project.receivedTotal - actualTotal,
    workPerM2: project.areaM2 > 0 ? workExpense / project.areaM2 : 0,
    materialsPerM2: project.areaM2 > 0 ? materialsExpense / project.areaM2 : 0,
    expenses,
    nextDeliveryLabel: formatNextDeliveryLabel(nextControlDate),
  };
}

export function applyLedgerEntriesToProject(
  project: DashboardProjectCardData,
  ledgerEntries: ProjectCardLedgerEntry[],
): DashboardProjectCardData {
  return recalculateProjectFromLedger({
    ...project,
    ledgerEntries,
  });
}
