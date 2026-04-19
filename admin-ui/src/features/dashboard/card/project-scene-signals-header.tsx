import { SignalChip } from "../../../shared/ui";
import { getContractSummary } from "./project-card-contract-timeline";
import { ContractHeaderIcon } from "./project-card-primitives";
import type { DashboardProjectCardData } from "../model/project-model";

export function ProjectSceneSignalsHeader(props: { project: DashboardProjectCardData }) {
  const contractSummary = getContractSummary(props.project.contract, props.project.advances);

  return (
    <header className="dashboard-project-scene-header">
      <div className="dashboard-project-scene-header-signals">
        <SignalChip
          value={contractSummary.eventCount}
          tooltip={`Событий по договору: ${contractSummary.eventCount}`}
          tone={contractSummary.eventsTone}
          align="end"
          icon={<ContractHeaderIcon kind="events" />}
        />
        <SignalChip
          value={contractSummary.reminderCount}
          tooltip={
            contractSummary.reminderCount
              ? `Срочных напоминаний по договору: ${contractSummary.reminderCount}`
              : "Срочных напоминаний по договору нет"
          }
          tone={contractSummary.remindersTone}
          align="end"
          icon={<ContractHeaderIcon kind="reminders" />}
        />
      </div>
    </header>
  );
}

