import type {
  ProjectCardLedgerCounterparty,
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
} from "../../model/project-model";
import type { LedgerDocumentKind } from "../project-accounting-ledger-config";

export type ProjectAccountingLedgerEntryBuilderProps = {
  entry: ProjectCardLedgerEntry;
  categoryOptions: string[];
  expenseItemOptions: string[];
  counterpartyOptions: ProjectCardLedgerCounterparty[];
  onUpdateEntry: (entryId: string, patch: Partial<ProjectCardLedgerEntry>) => void;
  onUploadDocument: (entryId: string, kind: LedgerDocumentKind, file: File) => void;
  onUpdateDocument: (
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) => void;
  onCreateCategoryOption: (value: string) => void;
  onCreateExpenseItemOption: (value: string) => void;
  isDeleteConfirmOpen: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};
