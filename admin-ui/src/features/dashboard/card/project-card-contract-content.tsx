/**
 * Read-only контент contract-панели.
 * Этот слой только собирает hero, обзор договора, сигнал и список вех.
 */
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import { SideMetric } from "./project-card-primitives";
import { ProjectCardContractHero } from "./project-card-contract-hero";
import { ProjectCardContractMilestones } from "./project-card-contract-milestones";
import { ProjectCardContractSignal } from "./project-card-contract-signal";
import type { ProjectCardContractContentProps } from "./project-card-contract-types";

export function ProjectCardContractContent(props: ProjectCardContractContentProps) {
  return (
    <>
      <ProjectCardContractHero
        contract={props.contract}
        extractionChipClass={props.extractionChipClass}
        extractionChipLabel={props.extractionChipLabel}
        isDownloadingSource={props.isDownloadingSource}
        onDownloadContractSource={props.onDownloadContractSource}
      />

      <div className="dashboard-project-contract-grid">
        <SideMetric label="Подписан" value={formatDisplayDate(props.contract.signedAt)} />
        <SideMetric label="Старт" value={formatDisplayDate(props.contract.startDate)} />
        <SideMetric label="План завершения" value={formatDisplayDate(props.contract.plannedEndDate)} />
        <SideMetric label="Сумма" value={formatMoney(props.contract.amount)} />
      </div>

      <div className="dashboard-project-contract-terms">
        <div className="eyebrow">Условия оплаты</div>
        <div className="dashboard-project-contract-terms-text">{props.contract.advanceTerms}</div>
      </div>

      <ProjectCardContractSignal
        contractSummary={props.contractSummary}
        onCompleteContractMilestone={props.onCompleteContractMilestone}
      />

      <ProjectCardContractMilestones timelineMilestones={props.timelineMilestones} />
    </>
  );
}
