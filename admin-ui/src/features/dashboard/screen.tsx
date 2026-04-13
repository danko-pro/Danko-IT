import { useState } from "react";
import { ProjectAccountingWorkspace } from "./accounting/project-accounting-workspace";
import { ProjectCard } from "./card/project-card";
import { useDashboardProjectState } from "./state/use-dashboard-project-state";
import { useDashboardSceneHeight } from "./state/use-dashboard-scene-height";

export function DashboardScreen() {
  const [view, setView] = useState<"card" | "accounting">("card");
  const { project, actions } = useDashboardProjectState();
  const { stageHeight, cardSceneRef, accountingSceneRef } = useDashboardSceneHeight(view, project);

  return (
    <div className="dashboard-prototype-stack">
      <div className="dashboard-scene-stage" style={stageHeight ? { height: `${stageHeight}px` } : undefined}>
        <div
          ref={cardSceneRef}
          className={
            view === "card" ? "dashboard-scene dashboard-scene-active" : "dashboard-scene dashboard-scene-card-hidden"
          }
        >
          <ProjectCard
            project={project}
            onAddAdvance={actions.addAdvance}
            onDeleteAdvance={actions.deleteAdvance}
            onCompleteContractMilestone={actions.completeContractMilestone}
            onOpenAccounting={() => setView("accounting")}
          />
        </div>

        <div
          ref={accountingSceneRef}
          className={
            view === "accounting"
              ? "dashboard-scene dashboard-scene-active"
              : "dashboard-scene dashboard-scene-accounting-hidden"
          }
        >
          <ProjectAccountingWorkspace
            project={project}
            onBack={() => setView("card")}
            onAddEntry={actions.addLedgerEntry}
            onDeleteEntry={actions.deleteLedgerEntry}
            onUpdateEntry={actions.updateLedgerEntry}
            onUploadDocument={actions.uploadLedgerDocument}
            onUpdateDocument={actions.updateLedgerDocument}
          />
        </div>
      </div>
    </div>
  );
}
