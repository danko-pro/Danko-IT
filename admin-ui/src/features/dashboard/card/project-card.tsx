import { ProjectCardAdvancesPanel } from "./project-card-advances-panel";
import { ProjectCardContractPanel } from "./project-card-contract-panel";
import { ProjectCardExpensesPanel } from "./project-card-expenses-panel";
import { ProjectCardHeader } from "./project-card-header";
import { ProjectCardOverview } from "./project-card-overview";
import type { ProjectCardProps } from "./project-card-types";

export function ProjectCard(props: ProjectCardProps) {
  const { project } = props;

  return (
    <article className="dashboard-project-card">
      <div className="dashboard-project-card__glow" />

      <ProjectCardHeader project={project} onOpenAccounting={props.onOpenAccounting} />
      <ProjectCardOverview project={project} />

      <div className="dashboard-project-layout">
        <ProjectCardExpensesPanel project={project} />

        <div className="dashboard-project-column">
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
