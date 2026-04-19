import {
  contractProgressNodeClass,
  contractProgressNodeTooltip,
} from "./project-card-contract-presentation";
import type { ProjectCardContractSummary, ProjectCardTimelineMilestone } from "./project-card-contract-timeline";

type ProjectCardContractCollapsedProgressProps = {
  contractSummary: ProjectCardContractSummary;
  isExpanded: boolean;
  timelineMilestones: ProjectCardTimelineMilestone[];
  onExpandPanel: () => void;
};

export function ProjectCardContractCollapsedProgress(props: ProjectCardContractCollapsedProgressProps) {
  return (
    <div
      className={
        props.isExpanded
          ? "dashboard-project-contract-collapsed-shell"
          : "dashboard-project-contract-collapsed-shell dashboard-project-contract-collapsed-shell-visible"
      }
    >
      <div className="dashboard-project-contract-collapsed-shell-inner">
        <div className="dashboard-project-contract-progress">
          <div className="dashboard-project-contract-progress-track" />
          <div
            className="dashboard-project-contract-progress-fill"
            style={{ width: `${props.contractSummary.progressPercent}%` }}
            aria-hidden="true"
          >
            <div className="dashboard-project-contract-progress-arrow" />
          </div>
          <div className="dashboard-project-contract-progress-nodes">
            {props.timelineMilestones.map((milestone, milestoneIndex) => (
              <button
                key={milestone.id}
                type="button"
                className={`${contractProgressNodeClass(
                  milestone,
                  props.contractSummary.activeMilestone?.id === milestone.id,
                )} ui-tooltip-anchor ${
                  milestoneIndex === 0
                    ? "ui-tooltip-start"
                    : milestoneIndex >= props.timelineMilestones.length - 2
                      ? "ui-tooltip-end"
                      : "ui-tooltip-center"
                }`}
                data-tooltip={contractProgressNodeTooltip(milestone)}
                aria-label={contractProgressNodeTooltip(milestone)}
                onClick={props.onExpandPanel}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
