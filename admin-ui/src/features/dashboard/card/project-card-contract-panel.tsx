import { useState } from "react";
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type { ProjectCardContract } from "../model/project-model";
import { SideMetric } from "./project-card-primitives";
import {
  contractMilestoneStatusClass,
  contractMilestoneStatusLabel,
  contractProgressNodeClass,
  contractProgressNodeTooltip,
  contractSignalActionLabel,
  contractSignalDescription,
  contractSignalTitle,
  contractSignalToneClass,
  getContractSummary,
} from "./project-card-view";

export function ProjectCardContractPanel(props: {
  contract: ProjectCardContract;
  onCompleteContractMilestone: (milestoneId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const contractSummary = getContractSummary(props.contract);
  const extractionChipClass = props.contract.extractionStatus === "verified" ? "stat-chip" : "slot-chip";
  const extractionChipLabel = props.contract.extractionStatus === "verified" ? "Проверено" : "AI требует проверки";

  return (
    <section className="dashboard-project-panel">
      <div className="dashboard-project-panel-head">
        <div>
          <div className="eyebrow">Договор</div>
          <h4 className="dashboard-project-panel-title">Контроль договора</h4>
        </div>

        <button
          type="button"
          className={
            isExpanded
              ? "dashboard-project-panel-toggle dashboard-project-panel-toggle-open"
              : "dashboard-project-panel-toggle"
          }
          aria-label={isExpanded ? "Свернуть блок договора" : "Развернуть блок договора"}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <svg viewBox="0 0 24 24" className="dashboard-project-panel-toggle-icon fill-none stroke-current" strokeWidth="1.8">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </div>

      <div
        className={
          isExpanded
            ? "dashboard-project-contract-collapsed-shell"
            : "dashboard-project-contract-collapsed-shell dashboard-project-contract-collapsed-shell-visible"
        }
      >
        <div className="dashboard-project-contract-collapsed-shell-inner">
          <div className="dashboard-project-contract-progress">
            <div className="dashboard-project-contract-progress-track" />
            <div
              className="dashboard-project-contract-progress-fill"
              style={{ width: `${contractSummary.progressPercent}%` }}
              aria-hidden="true"
            >
              <div className="dashboard-project-contract-progress-arrow" />
            </div>
            <div className="dashboard-project-contract-progress-nodes">
              {props.contract.milestones.map((milestone, milestoneIndex) => (
                <button
                  key={milestone.id}
                  type="button"
                  className={`${contractProgressNodeClass(
                    milestone,
                    contractSummary.activeMilestone?.id === milestone.id,
                  )} ui-tooltip-anchor ${
                    milestoneIndex === 0
                      ? "ui-tooltip-start"
                      : milestoneIndex >= props.contract.milestones.length - 2
                        ? "ui-tooltip-end"
                        : "ui-tooltip-center"
                  }`}
                  data-tooltip={contractProgressNodeTooltip(milestone)}
                  aria-label={contractProgressNodeTooltip(milestone)}
                  onClick={() => setIsExpanded(true)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          isExpanded
            ? "dashboard-project-contract-body-shell dashboard-project-contract-body-shell-open"
            : "dashboard-project-contract-body-shell"
        }
      >
        <div className="dashboard-project-contract-body-shell-inner">
          <div className="dashboard-project-contract">
            <div className="dashboard-project-contract-hero">
              <div className="dashboard-project-contract-file">{props.contract.fileName}</div>
              <div className="dashboard-project-contract-title-row">
                <div className="dashboard-project-contract-title">{props.contract.title}</div>
                <span className={extractionChipClass}>{extractionChipLabel}</span>
              </div>
              <div className="dashboard-project-contract-number">{props.contract.number}</div>
            </div>

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

            <div className={contractSignalToneClass(contractSummary.activeMilestone)}>
              <div className="dashboard-project-contract-signal-head">
                <div>
                  <div className="eyebrow">Ближайшее действие</div>
                  <div className="dashboard-project-contract-signal-title">
                    {contractSignalTitle(contractSummary.activeMilestone)}
                  </div>
                </div>

                {contractSummary.activeMilestone ? (
                  <span className={contractMilestoneStatusClass(contractSummary.activeMilestone.status)}>
                    {contractMilestoneStatusLabel(contractSummary.activeMilestone.status)}
                  </span>
                ) : (
                  <span className="dashboard-project-contract-chip dashboard-project-contract-chip-completed">
                    Под контролем
                  </span>
                )}
              </div>

              <div className="dashboard-project-contract-signal-text">
                {contractSignalDescription(contractSummary.activeMilestone)}
              </div>

              {contractSummary.activeMilestone ? (
                <div className="dashboard-project-contract-signal-actions">
                  <span className="slot-chip">{formatDisplayDate(contractSummary.activeMilestone.plannedDate)}</span>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => props.onCompleteContractMilestone(contractSummary.activeMilestone!.id)}
                  >
                    {contractSignalActionLabel(contractSummary.activeMilestone)}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="dashboard-project-contract-milestones">
              <div className="eyebrow">График вех</div>
              <div className="dashboard-project-contract-milestones-list">
                {props.contract.milestones.map((milestone) => (
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
          </div>
        </div>
      </div>
    </section>
  );
}
