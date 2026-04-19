import { DashboardSceneChrome } from "../dashboard-scene-chrome";
import type { DashboardSceneView } from "../dashboard-scene-types";
import type { DashboardProjectCardData, ProjectCardLedgerDocument, ProjectCardLedgerEntry } from "../model/project-model";
import { ProjectAccountingLedgerTable } from "./project-accounting-ledger-table";
import { ProjectAccountingSummaryStrip } from "./project-accounting-summary-strip";

export function ProjectAccountingWorkspace(props: {
  project: DashboardProjectCardData;
  activeView: DashboardSceneView;
  onSelectView: (view: DashboardSceneView) => void;
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
      <DashboardSceneChrome activeView={props.activeView} onSelect={props.onSelectView} />
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
