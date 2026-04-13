export type ProjectCardExpenseTone = "cyan" | "emerald" | "amber" | "rose" | "slate";

export type ProjectCardExpenseItem = {
  label: string;
  amount: number;
  tone: ProjectCardExpenseTone;
};

export type ProjectCardAdvanceItem = {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: "paid" | "planned";
};

export type ProjectCardLedgerStatus = "planned" | "invoice" | "waiting-payment" | "paid" | "completed";

export type ProjectCardSourceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

export type ProjectCardLedgerDocument = {
  id: string;
  kind: "invoice" | "act";
  title: string;
  date: string;
  amount: number;
  sourceFile: ProjectCardSourceFile;
  extractedByAi: boolean;
  verifiedByUser: boolean;
};

export type ProjectCardLedgerEntry = {
  id: string;
  category: string;
  item: string;
  owner: string;
  counterparty: string;
  status: ProjectCardLedgerStatus;
  invoiceDocument: ProjectCardLedgerDocument | null;
  actDocument: ProjectCardLedgerDocument | null;
  planAmount: number;
  actualAmount: number;
  controlDate: string;
};

export type ProjectCardContractMilestone = {
  id: string;
  kind: "invoice" | "payment" | "deadline";
  title: string;
  plannedDate: string;
  amount?: number;
  note?: string;
  status: "upcoming" | "due" | "completed";
};

export type ProjectCardContract = {
  fileName: string;
  title: string;
  number: string;
  signedAt: string;
  startDate: string;
  plannedEndDate: string;
  amount: number;
  advanceTerms: string;
  extractionStatus: "review" | "verified";
  milestones: ProjectCardContractMilestone[];
};

export type DashboardProjectCardData = {
  code: string;
  name: string;
  stageLabel: string;
  stageTone: "ok" | "warn" | "neutral" | "active" | "error";
  areaM2: number;
  estimateSource: string;
  receivedTotal: number;
  remainingTotal: number;
  deferredTotal: number;
  plannedTotal: number;
  actualTotal: number;
  workPerM2: number;
  materialsPerM2: number;
  plannedMarginPercent: number;
  nextDeliveryLabel: string;
  expenses: ProjectCardExpenseItem[];
  advances: ProjectCardAdvanceItem[];
  ledgerEntries: ProjectCardLedgerEntry[];
  contract: ProjectCardContract;
};
