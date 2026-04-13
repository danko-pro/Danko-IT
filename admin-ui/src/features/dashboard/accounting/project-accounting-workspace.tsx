import { ProjectAccountingLedgerTable } from "./project-accounting-ledger-table";
import { ProjectAccountingSummaryStrip } from "./project-accounting-summary-strip";
import type { DashboardProjectCardData, ProjectCardLedgerDocument, ProjectCardLedgerEntry } from "../model/project-model";

export function ProjectAccountingWorkspace(props: {
  project: DashboardProjectCardData;
  onBack: () => void;
  onAddEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateEntry: (entryId: string, patch: Partial<ProjectCardLedgerEntry>) => void;
  onUploadDocument: (entryId: string, kind: "invoice" | "act", file: File) => void;
  onUpdateDocument: (
    entryId: string,
    kind: "invoice" | "act",
    patch: Partial<ProjectCardLedgerDocument>,
  ) => void;
}) {
  return (
    <section className="dashboard-ledger-workspace">
      <div className="dashboard-ledger-workspace__glow" />

      <header className="dashboard-ledger-header">
        <div className="dashboard-ledger-header-actions">
          <button type="button" className="dashboard-ledger-back-button" onClick={props.onBack}>
            <span className="dashboard-ledger-back-button-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                <path d="m14.5 6.5-5 5 5 5" />
              </svg>
            </span>
            <span>К карточке объекта</span>
          </button>
        </div>
      </header>

      <ProjectAccountingSummaryStrip project={props.project} />
      <ProjectAccountingLedgerTable
        entries={props.project.ledgerEntries}
        onAddEntry={props.onAddEntry}
        onDeleteEntry={props.onDeleteEntry}
        onUpdateEntry={props.onUpdateEntry}
        onUploadDocument={props.onUploadDocument}
        onUpdateDocument={props.onUpdateDocument}
      />
    </section>
  );
}
