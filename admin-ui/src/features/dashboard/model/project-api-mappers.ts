import type {
  DashboardProjectAdvanceApiRecord,
  DashboardProjectContractApiRecord,
  DashboardProjectFinanceSummaryApiRecord,
  DashboardProjectLedgerApiRecord,
  DashboardProjectLedgerDocumentApiRecord,
  ProjectCardAdvanceItem,
  ProjectCardContract,
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
  ProjectFinanceSummary,
  ProjectTaxBaseMode,
} from "./project-model";
import { normalizeDashboardText } from "./project-text-normalization";

// Мапперы API -> UI модели для dashboard.
// Эти функции не знают про React state и не выполняют side effects.
export function mapAdvanceRecord(record: DashboardProjectAdvanceApiRecord): ProjectCardAdvanceItem {
  return {
    id: String(record.id),
    title: normalizeDashboardText(record.title),
    amount: record.amount,
    date: record.date,
    status: record.status,
  };
}

export function mapLedgerDocumentRecord(record: DashboardProjectLedgerDocumentApiRecord): ProjectCardLedgerDocument {
  return {
    id: String(record.id),
    kind: record.kind,
    title: normalizeDashboardText(record.title),
    date: record.date,
    amount: record.amount,
    sourceFile: {
      id: record.source_file.id,
      fileName: normalizeDashboardText(record.source_file.file_name),
      mimeType: record.source_file.mime_type,
      uploadedAt: record.source_file.uploaded_at,
    },
    extractedByAi: record.extracted_by_ai,
    verifiedByUser: record.verified_by_user,
  };
}

export function mapContractRecord(record: DashboardProjectContractApiRecord): ProjectCardContract {
  return {
    fileName: normalizeDashboardText(record.file_name),
    title: normalizeDashboardText(record.title),
    number: normalizeDashboardText(record.number),
    signedAt: record.signed_at,
    startDate: record.start_date,
    plannedEndDate: record.planned_end_date,
    amount: record.amount,
    advanceTerms: normalizeDashboardText(record.advance_terms),
    extractionStatus: record.extraction_status,
    sourceFile: record.source_file
      ? {
          id: record.source_file.id,
          fileName: normalizeDashboardText(record.source_file.file_name),
          mimeType: record.source_file.mime_type,
          uploadedAt: record.source_file.uploaded_at,
        }
      : null,
    downloadUrl: record.download_url,
    milestones: record.milestones.map((milestone) => ({
      id: String(milestone.id),
      kind: milestone.kind,
      title: normalizeDashboardText(milestone.title),
      plannedDate: milestone.planned_date,
      amount: typeof milestone.amount === "number" ? milestone.amount : undefined,
      note: milestone.note ? normalizeDashboardText(milestone.note) : undefined,
      status: milestone.status,
    })),
  };
}

export function mapFinanceSummaryRecord(record: DashboardProjectFinanceSummaryApiRecord): ProjectFinanceSummary {
  return {
    receivedTotal: record.received_total,
    paidExpenseTotal: record.paid_expense_total,
    plannedExpenseTotal: record.planned_expense_total,
    committedUnpaidTotal: record.committed_unpaid_total,
    cashBalance: record.cash_balance,
    availableAfterPlan: record.available_after_plan,
    availableAfterObligations: record.available_after_obligations,
    taxReserveTotal: record.tax_reserve_total,
    netAvailable: record.net_available,
    workPerM2: record.work_per_m2,
    materialsPerM2: record.materials_per_m2,
  };
}

export function mapTaxBaseMode(value: string | null | undefined): ProjectTaxBaseMode {
  return value === "received_total" ? "received_total" : "received_total";
}

function cloneLedgerDocument(document: ProjectCardLedgerDocument | null): ProjectCardLedgerDocument | null {
  return document ? structuredClone(document) : null;
}

export function mapLedgerRecord(
  record: DashboardProjectLedgerApiRecord,
  existingEntry?: ProjectCardLedgerEntry,
): ProjectCardLedgerEntry {
  return {
    id: String(record.id),
    category: normalizeDashboardText(record.category),
    item: normalizeDashboardText(record.item),
    owner: normalizeDashboardText(record.owner),
    counterparty: normalizeDashboardText(record.counterparty),
    counterpartyDetails: record.counterparty_details
      ? {
          ...record.counterparty_details,
          legalName: normalizeDashboardText(record.counterparty_details.legalName),
          managerName: normalizeDashboardText(record.counterparty_details.managerName),
          messenger: normalizeDashboardText(record.counterparty_details.messenger),
        }
      : null,
    status: record.status,
    invoiceDocument: record.invoice_document
      ? mapLedgerDocumentRecord(record.invoice_document)
      : cloneLedgerDocument(existingEntry?.invoiceDocument ?? null),
    actDocument: record.act_document
      ? mapLedgerDocumentRecord(record.act_document)
      : cloneLedgerDocument(existingEntry?.actDocument ?? null),
    planAmount: record.plan_amount,
    actualAmount: record.actual_amount,
    controlDate: record.control_date,
  };
}

export function ledgerEntrySignature(entry: {
  category: string;
  item: string;
  counterparty: string;
  planAmount: number;
  actualAmount: number;
  controlDate: string;
}) {
  return [
    entry.category.trim().toLowerCase(),
    entry.item.trim().toLowerCase(),
    entry.counterparty.trim().toLowerCase(),
    entry.planAmount.toFixed(2),
    entry.actualAmount.toFixed(2),
    entry.controlDate.trim(),
  ].join("|");
}

export function ledgerRecordSignature(record: DashboardProjectLedgerApiRecord) {
  return ledgerEntrySignature({
    category: record.category,
    item: record.item,
    counterparty: record.counterparty,
    planAmount: record.plan_amount,
    actualAmount: record.actual_amount,
    controlDate: record.control_date,
  });
}
