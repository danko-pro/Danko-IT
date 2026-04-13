import type { ProjectCardLedgerStatus } from "../model/project-model";

export const CATEGORY_OPTIONS = ["Работы", "Материалы", "Услуги", "Техника", "Мебель", "Двери", "Другое"];

export const STATUS_OPTIONS: Array<{ value: ProjectCardLedgerStatus | "all"; label: string }> = [
  { value: "all", label: "Все статусы" },
  { value: "planned", label: "План" },
  { value: "invoice", label: "Счёт" },
  { value: "waiting-payment", label: "Ждём оплату" },
  { value: "paid", label: "Оплачено" },
  { value: "completed", label: "Закрыто" },
];

export type LedgerDocumentKind = "invoice" | "act";

export function categoryToneClass(category: string) {
  switch (category) {
    case "Работы":
      return "dashboard-ledger-primary-amber";
    case "Материалы":
      return "dashboard-ledger-primary-emerald";
    case "Услуги":
      return "dashboard-ledger-primary-cyan";
    case "Техника":
      return "dashboard-ledger-primary-rose";
    default:
      return "dashboard-ledger-primary-slate";
  }
}

export function statusSelectToneClass(status: ProjectCardLedgerStatus) {
  switch (status) {
    case "paid":
    case "completed":
      return "dashboard-ledger-status-select-ok";
    case "invoice":
    case "waiting-payment":
      return "dashboard-ledger-status-select-warn";
    case "planned":
    default:
      return "dashboard-ledger-status-select-neutral";
  }
}

export function parseNumberInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function requiresInvoice(status: ProjectCardLedgerStatus) {
  return status !== "planned";
}

export function requiresAct(status: ProjectCardLedgerStatus) {
  return status === "completed";
}
