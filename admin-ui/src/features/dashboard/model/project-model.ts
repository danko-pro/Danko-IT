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

export type ProjectCardLedgerCounterparty = {
  inn: string;
  legalName: string;
  managerName: string;
  email: string;
  phone: string;
  messenger: string;
};

export type ProjectCardLedgerEntry = {
  id: string;
  category: string;
  item: string;
  owner: string;
  counterparty: string;
  counterpartyDetails: ProjectCardLedgerCounterparty | null;
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
  synthetic?: "start-after-advance";
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
  sourceFile: ProjectCardSourceFile | null;
  downloadUrl: string | null;
  milestones: ProjectCardContractMilestone[];
};

export type ProjectFinanceSummary = {
  receivedTotal: number;
  paidExpenseTotal: number;
  plannedExpenseTotal: number;
  committedUnpaidTotal: number;
  cashBalance: number;
  availableAfterPlan: number;
  availableAfterObligations: number;
  taxReserveTotal: number;
  netAvailable: number;
  workPerM2: number;
  materialsPerM2: number;
};

export type ProjectTaxBaseMode = "received_total";

export type ProjectFinanceSettings = {
  plannedMarginPercent: number;
  taxRatePercent: number;
  taxBaseMode: ProjectTaxBaseMode;
};

export type DashboardProjectFinanceSummaryApiRecord = {
  received_total: number;
  paid_expense_total: number;
  planned_expense_total: number;
  committed_unpaid_total: number;
  cash_balance: number;
  available_after_plan: number;
  available_after_obligations: number;
  tax_reserve_total: number;
  net_available: number;
  work_per_m2: number;
  materials_per_m2: number;
};

export type DashboardProjectContractMilestoneApiRecord = {
  id: number;
  contract_id: number;
  kind: "invoice" | "payment" | "deadline";
  title: string;
  planned_date: string;
  amount: number | null;
  note: string;
  status: "upcoming" | "due" | "completed";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DashboardProjectContractApiRecord = {
  id: number;
  project_id: number;
  file_name: string;
  title: string;
  number: string;
  signed_at: string;
  start_date: string;
  planned_end_date: string;
  amount: number;
  advance_terms: string;
  extraction_status: "review" | "verified";
  source_file: {
    id: string;
    file_name: string;
    mime_type: string;
    uploaded_at: string;
  } | null;
  download_url: string | null;
  milestones: DashboardProjectContractMilestoneApiRecord[];
  created_at: string;
  updated_at: string;
};

export type DashboardProjectCardData = {
  id: string;
  code: string;
  name: string;
  address: string;
  entranceSection: string;
  apartment: string;
  floor: string;
  roomCount: number;
  hasElevator: boolean;
  siteAccess: string;
  accessHours: string;
  intercomCode: string;
  responsiblePerson: string;
  comment: string;
  stageLabel: string;
  stageTone: "ok" | "warn" | "neutral" | "active" | "error";
  areaM2: number;
  ceilingHeightM: number;
  estimateSource: string;
  receivedTotal: number;
  remainingTotal: number;
  deferredTotal: number;
  plannedTotal: number;
  actualTotal: number;
  workPerM2: number;
  materialsPerM2: number;
  plannedMarginPercent: number;
  taxRatePercent: number;
  taxBaseMode: ProjectTaxBaseMode;
  nextDeliveryLabel: string;
  expenses: ProjectCardExpenseItem[];
  advances: ProjectCardAdvanceItem[];
  ledgerEntries: ProjectCardLedgerEntry[];
  contract: ProjectCardContract;
  financeSummary?: ProjectFinanceSummary;
};

export type DashboardProjectApiRecord = {
  id: number;
  code: string;
  name: string;
  address: string;
  entrance_section: string;
  apartment: string;
  floor: string;
  room_count: number;
  has_elevator: boolean;
  site_access: string;
  access_hours: string;
  intercom_code: string;
  responsible_person: string;
  comment: string;
  stage_label: string;
  stage_tone: "ok" | "warn" | "neutral" | "active" | "error";
  estimate_project_id: number | null;
  estimate_project_name: string | null;
  estimate_source: string;
  area_m2: number;
  ceiling_height_m: number;
  received_total: number;
  remaining_total: number;
  deferred_total: number;
  planned_total: number;
  actual_total: number;
  work_per_m2: number;
  materials_per_m2: number;
  planned_margin_percent: number;
  tax_rate_percent?: number | null;
  tax_base_mode?: string | null;
  finance_summary?: DashboardProjectFinanceSummaryApiRecord;
  next_delivery_label: string;
  created_at: string;
  updated_at: string;
};

export type DashboardProjectAdvanceApiRecord = {
  id: number;
  project_id: number;
  title: string;
  amount: number;
  date: string;
  status: "paid" | "planned";
  created_at: string;
  updated_at: string;
};

export type DashboardProjectLedgerApiRecord = {
  id: number;
  project_id: number;
  category: string;
  item: string;
  owner: string;
  counterparty: string;
  counterparty_details: ProjectCardLedgerCounterparty | null;
  status: ProjectCardLedgerStatus;
  plan_amount: number;
  actual_amount: number;
  control_date: string;
  sort_order: number;
  invoice_document: DashboardProjectLedgerDocumentApiRecord | null;
  act_document: DashboardProjectLedgerDocumentApiRecord | null;
  created_at: string;
  updated_at: string;
};

export type DashboardProjectLedgerDocumentApiRecord = {
  id: number;
  project_id: number;
  ledger_entry_id: number;
  kind: "invoice" | "act";
  title: string;
  date: string;
  amount: number;
  source_file: {
    id: string;
    file_name: string;
    mime_type: string;
    uploaded_at: string;
  };
  download_url: string;
  extracted_by_ai: boolean;
  verified_by_user: boolean;
  created_at: string;
  updated_at: string;
};
