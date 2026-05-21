import { ProjectCardAdvancesPanel } from "../card/project-card-advances-panel";
import { ProjectCardContractPanel } from "../card/project-card-contract-panel";
import { ProjectCardExpensesPanel } from "../card/project-card-expenses-panel";
import { ProjectCardFinanceSettingsPanel } from "../card/project-card-finance-settings-panel";
import type { ProjectCardProps } from "../card/project-card-types";
import { DashboardSceneChrome } from "../dashboard-scene-chrome";
import type { DashboardSceneView } from "../dashboard-scene-types";

export function DashboardFinanceScene(
  props: Omit<ProjectCardProps, "onOpenAccounting"> & {
    activeView: DashboardSceneView;
    onSelectView: (view: DashboardSceneView) => void;
  },
) {
  const { project } = props;

  return (
    <article className="dashboard-project-card">
      <div className="dashboard-project-card__glow" />
      <DashboardSceneChrome activeView={props.activeView} onSelect={props.onSelectView} project={project} />

      <div className="dashboard-project-layout dashboard-project-layout-finance">
        <ProjectCardExpensesPanel project={project} />

        <div className="dashboard-project-column">
          <ProjectCardFinanceSettingsPanel
            plannedMarginPercent={project.plannedMarginPercent}
            taxRatePercent={project.taxRatePercent}
            taxBaseMode={project.taxBaseMode}
            onUpdateFinanceSettings={props.onUpdateFinanceSettings}
          />

          <ProjectCardAdvancesPanel
            advances={project.advances}
            onAddAdvance={props.onAddAdvance}
            onDeleteAdvance={props.onDeleteAdvance}
          />

          <ProjectCardContractPanel
            contract={project.contract}
            advances={project.advances}
            onCompleteContractMilestone={props.onCompleteContractMilestone}
            onUploadContract={props.onUploadContract}
            onExtractContract={props.onExtractContract}
            onUpdateContract={props.onUpdateContract}
            onDeleteContract={props.onDeleteContract}
            syncState={props.contractSyncState}
          />
        </div>
      </div>
    </article>
  );
}
