import { Button } from "../../../shared/controls";
import { formatDisplayDate } from "../model/project-accounting-format";
import {
  contractMilestoneStatusClass,
  contractMilestoneStatusLabel,
  contractSignalActionLabel,
  contractSignalDescription,
  contractSignalTitle,
  contractSignalToneClass,
} from "./project-card-contract-presentation";
import type { ProjectCardContractContentProps } from "./project-card-contract-types";

type ProjectCardContractSignalProps = Pick<
  ProjectCardContractContentProps,
  "contractSummary" | "onCompleteContractMilestone"
>;

export function ProjectCardContractSignal(props: ProjectCardContractSignalProps) {
  const activeMilestone = props.contractSummary.activeMilestone;

  return (
    <div className={contractSignalToneClass(activeMilestone)}>
      <div className="dashboard-project-contract-signal-head">
        <div>
          <div className="eyebrow">Ближайшее действие</div>
          <div className="dashboard-project-contract-signal-title">{contractSignalTitle(activeMilestone)}</div>
        </div>

        {activeMilestone ? (
          <span className={contractMilestoneStatusClass(activeMilestone.status)}>
            {contractMilestoneStatusLabel(activeMilestone.status)}
          </span>
        ) : (
          <span className="dashboard-project-contract-chip dashboard-project-contract-chip-completed">Под контролем</span>
        )}
      </div>

      <div className="dashboard-project-contract-signal-text">{contractSignalDescription(activeMilestone)}</div>

      {activeMilestone ? (
        <div className="dashboard-project-contract-signal-actions">
          <span className="slot-chip">{formatDisplayDate(activeMilestone.plannedDate)}</span>
          <Button onClick={() => props.onCompleteContractMilestone(activeMilestone.id)}>
            {contractSignalActionLabel(activeMilestone)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
