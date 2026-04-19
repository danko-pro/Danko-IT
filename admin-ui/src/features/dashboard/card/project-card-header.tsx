import { SignalChip } from "../../../shared/ui";
import { getContractSummary } from "./project-card-contract-timeline";
import { ContractHeaderIcon } from "./project-card-primitives";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardHeaderProps = Pick<ProjectCardProps, "project" | "onOpenAccounting">;

export function ProjectCardHeader(props: ProjectCardHeaderProps) {
  const contractSummary = getContractSummary(props.project.contract, props.project.advances);

  return (
    <header className="dashboard-project-header">
      <button type="button" className="dashboard-project-header-cta" onClick={props.onOpenAccounting}>
        <span className="dashboard-project-header-cta-title">Перейти к таблице учета</span>
        <span className="dashboard-project-header-cta-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
            <path d="M5.5 12h12" />
            <path d="m13.5 7.75 4.25 4.25-4.25 4.25" />
          </svg>
        </span>
      </button>

      <div className="dashboard-project-header-aside">
        <div className="dashboard-project-header-signals">
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
      </div>
    </header>
  );
}
