import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import {
  contractMilestoneStatusClass,
  contractMilestoneStatusLabel,
} from "./project-card-contract-presentation";
import type { ProjectCardContractContentProps } from "./project-card-contract-types";

type ProjectCardContractMilestonesProps = Pick<ProjectCardContractContentProps, "timelineMilestones">;

export function ProjectCardContractMilestones(props: ProjectCardContractMilestonesProps) {
  return (
    <div className="dashboard-project-contract-milestones">
      <div className="eyebrow">График вех</div>
      <div className="dashboard-project-contract-milestones-list">
        {props.timelineMilestones.map((milestone) => (
          <div key={milestone.id} className="dashboard-project-contract-milestone-row">
            <div className="dashboard-project-contract-milestone-main">
              <div className="dashboard-project-contract-milestone-title">{milestone.title}</div>
              <div className="dashboard-project-contract-milestone-note">
                {milestone.note ?? "Без дополнительного комментария"}
              </div>
            </div>

            <div className="dashboard-project-contract-milestone-meta">
              {typeof milestone.amount === "number" ? (
                <div className="dashboard-project-contract-milestone-amount">{formatMoney(milestone.amount)}</div>
              ) : null}
              <div className="dashboard-project-contract-milestone-date">
                {formatDisplayDate(milestone.plannedDate)}
              </div>
              <span className={contractMilestoneStatusClass(milestone.status)}>
                {contractMilestoneStatusLabel(milestone.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
