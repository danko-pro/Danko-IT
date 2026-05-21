import { useState } from "react";
import { ProjectAccountingWorkspace } from "./accounting/project-accounting-workspace";
import type { DashboardSceneView } from "./dashboard-scene-types";
import { DashboardProjectSwitcher } from "./project-switcher";
import { DashboardFinanceScene } from "./scenes/dashboard-finance-scene";
import { DashboardOverviewScene } from "./scenes/dashboard-overview-scene";
import { DashboardPassportScene } from "./scenes/dashboard-passport-scene";
import { useDashboardProjectState } from "./state/use-dashboard-project-state";
import { useDashboardSceneHeight } from "./state/use-dashboard-scene-height";

export function DashboardScreen() {
  const [view, setView] = useState<DashboardSceneView>("overview");
  const { project, projects, selectedProjectId, loading, error, contractSyncState, actions } = useDashboardProjectState();
  const { stageHeight, overviewSceneRef, passportSceneRef, financeSceneRef, accountingSceneRef } =
    useDashboardSceneHeight(view, project);

  return (
    <div className="dashboard-prototype-stack">
      <DashboardProjectSwitcher
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(projectId) => {
          actions.selectProject(projectId);
          setView("overview");
        }}
        onAddProject={() => {
          actions.addProject();
          setView("overview");
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
            ref={overviewSceneRef}
            className={
              view === "overview"
                ? "dashboard-scene dashboard-scene-active"
                : "dashboard-scene dashboard-scene-card-hidden"
            }
          >
            <DashboardOverviewScene project={project} activeView={view} onSelectView={setView} />
          </div>

          <div
            ref={passportSceneRef}
            className={
              view === "passport"
                ? "dashboard-scene dashboard-scene-active"
                : "dashboard-scene dashboard-scene-card-hidden"
            }
          >
            <DashboardPassportScene
              project={project}
              activeView={view}
              onSelectView={setView}
              onSavePassport={actions.updateProjectPassport}
            />
          </div>

          <div
            ref={financeSceneRef}
            className={
              view === "finance"
                ? "dashboard-scene dashboard-scene-active"
                : "dashboard-scene dashboard-scene-card-hidden"
            }
          >
            <DashboardFinanceScene
              project={project}
              activeView={view}
              onSelectView={setView}
              onAddAdvance={actions.addAdvance}
              onDeleteAdvance={actions.deleteAdvance}
              onCompleteContractMilestone={actions.completeContractMilestone}
              onUploadContract={actions.uploadContract}
              onExtractContract={actions.extractContract}
              onUpdateContract={actions.updateContract}
              onDeleteContract={actions.deleteContract}
              onUpdateFinanceSettings={actions.updateFinanceSettings}
              contractSyncState={contractSyncState}
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
              activeView={view}
              onSelectView={setView}
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
