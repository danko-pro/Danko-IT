import type { ProjectCardLedgerDocument, ProjectCardLedgerEntry } from "../model/project-model";
import { AddButton } from "../../../shared/controls";
import type { LedgerDocumentKind } from "./project-accounting-ledger-config";
import {
  LEDGER_COLUMN_LAYOUT,
  ProjectAccountingLedgerBuilderColumn,
  ProjectAccountingLedgerEntryBuilder,
  useProjectAccountingLedgerBuilderState,
} from "./builder";

export type ProjectAccountingLedgerTableProps = {
  entries: ProjectCardLedgerEntry[];
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, patch: Partial<ProjectCardLedgerEntry>) => void;
  onUploadDocument: (entryId: string, kind: LedgerDocumentKind, file: File) => void;
  onUpdateDocument: (
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) => void;
  onDeleteEntry: (entryId: string) => void;
};

export function ProjectAccountingLedgerTable(props: ProjectAccountingLedgerTableProps) {
  const builderState = useProjectAccountingLedgerBuilderState({
    entries: props.entries,
    onDeleteEntry: props.onDeleteEntry,
  });

  return (
    <section className="dashboard-ledger-builder-shell" aria-label="Реестр объекта">
      <div className="dashboard-ledger-builder-head">
        <div className="dashboard-ledger-builder-title">Реестр объекта</div>
        <div className="dashboard-ledger-builder-caption">
          Собираем первые поля строки: категория, статья, контрагент, статус оплаты, счёт и акт.
        </div>
      </div>

      <div className="dashboard-ledger-builder-stage">
        <div className="dashboard-ledger-builder-grid dashboard-ledger-builder-grid-header" aria-hidden="true">
          {LEDGER_COLUMN_LAYOUT.map((column) => (
            <div
              key={column.title}
              className={
                column.className
                  ? `dashboard-ledger-builder-column ${column.className}`
                  : "dashboard-ledger-builder-column"
              }
            >
              <div className="dashboard-ledger-builder-column-head">
                <div className="dashboard-ledger-builder-column-title">{column.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-ledger-builder-stack">
          {props.entries.map((entry) => (
            <ProjectAccountingLedgerEntryBuilder
              key={entry.id}
              entry={entry}
              categoryOptions={builderState.categoryOptions}
              expenseItemOptions={builderState.expenseItemOptions}
              counterpartyOptions={builderState.counterpartyOptions}
              onUpdateEntry={props.onUpdateEntry}
              onUploadDocument={props.onUploadDocument}
              onUpdateDocument={props.onUpdateDocument}
              onCreateCategoryOption={builderState.handleCreateCategoryOption}
              onCreateExpenseItemOption={builderState.handleCreateExpenseItemOption}
              isDeleteConfirmOpen={builderState.confirmingDeleteEntryId === entry.id}
              onRequestDelete={() => builderState.requestDeleteEntry(entry.id)}
              onCancelDelete={() => builderState.cancelDeleteEntry(entry.id)}
              onConfirmDelete={() => builderState.confirmDeleteEntry(entry.id)}
            />
          ))}
        </div>

        <div className="dashboard-ledger-builder-add-overlay">
          <div className="dashboard-ledger-builder-add-separator">
            <AddButton
              className="dashboard-ledger-builder-add-button"
              aria-label="Добавить строку"
              glyphClassName="dashboard-ledger-builder-add-button-glyph"
              children={null}
              onClick={props.onAddEntry}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
