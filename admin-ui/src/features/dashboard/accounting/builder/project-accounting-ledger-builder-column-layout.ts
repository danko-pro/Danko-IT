export const LEDGER_COLUMN_LAYOUT = [
  { title: "Категория затрат", className: "" },
  { title: "Статья затрат", className: "dashboard-ledger-builder-column-wide" },
  { title: "Контрагент", className: "dashboard-ledger-builder-column-counterparty" },
  { title: "Статус оплаты", className: "dashboard-ledger-builder-column-status" },
  { title: "Счёт", className: "dashboard-ledger-builder-column-document" },
  { title: "Акт", className: "dashboard-ledger-builder-column-document" },
] as const;

export type ProjectAccountingLedgerColumnLayoutItem = (typeof LEDGER_COLUMN_LAYOUT)[number];
