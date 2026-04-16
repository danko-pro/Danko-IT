import { useState } from "react";
import { ProjectAccountingWorkspace } from "./accounting/project-accounting-workspace";
import { ProjectCard } from "./card/project-card";
import { DashboardProjectSwitcher } from "./project-switcher";
import { useDashboardProjectState } from "./state/use-dashboard-project-state";
import { useDashboardSceneHeight } from "./state/use-dashboard-scene-height";

export function DashboardScreen() {
  const [view, setView] = useState<"card" | "accounting">("card");
  const { project, projects, selectedProjectId, loading, error, contractSyncState, actions } = useDashboardProjectState();
  const { stageHeight, cardSceneRef, accountingSceneRef } = useDashboardSceneHeight(view, project);

  return (
    <div className="dashboard-prototype-stack">
      <DashboardProjectSwitcher
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(projectId) => {
          actions.selectProject(projectId);
          setView("card");
        }}
        onAddProject={() => {
          actions.addProject();
          setView("card");
        }}
        onRenameProject={actions.renameProject}
        onDeleteProject={actions.deleteProject}
      />

      {loading && !project ? (
        <section className="glass-panel p-5">
          <div className="empty-state">Загружаю объекты...</div>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="glass-panel p-5">
          <div className="empty-state">{error}</div>
        </section>
      ) : null}

      {!loading && !project && !error ? (
        <section className="glass-panel p-5">
          <div className="empty-state">Объектов пока нет. Добавьте новый справа в строке вкладок.</div>
        </section>
      ) : null}

      {project ? (
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
              onUploadContract={actions.uploadContract}
              onExtractContract={actions.extractContract}
              onUpdateContract={actions.updateContract}
              onDeleteContract={actions.deleteContract}
              contractSyncState={contractSyncState}
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
      ) : null}
    </div>
  );
}
