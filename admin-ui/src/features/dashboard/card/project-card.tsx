import { SignalChip, StatusBadge } from "../../../shared/ui";
import { formatMoney } from "../model/project-accounting-format";
import type { DashboardProjectCardData } from "../model/project-model";
import { ProjectCardAdvancesPanel } from "./project-card-advances-panel";
import { ProjectCardContractPanel } from "./project-card-contract-panel";
import { ContractHeaderIcon, SideMetric, SummaryMetric } from "./project-card-primitives";
import { expenseToneClass, formatPerSquare, getContractSummary } from "./project-card-view";

export function ProjectCard(props: {
  project: DashboardProjectCardData;
  onAddAdvance: (payload: { title: string; amount: number; date: string }) => void;
  onDeleteAdvance: (advanceId: string) => void;
  onCompleteContractMilestone: (milestoneId: string) => void;
  onOpenAccounting: () => void;
}) {
  const { project } = props;
  const contractSummary = getContractSummary(project.contract);

  return (
    <article className="dashboard-project-card">
      <div className="dashboard-project-card__glow" />

      <header className="dashboard-project-header">
        <div className="min-w-0">
          <div className="eyebrow">Объект</div>
          <div className="dashboard-project-title-row">
            <h3 className="dashboard-project-title">{project.code}</h3>
            <StatusBadge label={project.stageLabel} tone={project.stageTone} />
          </div>
          <div className="dashboard-project-subtitle">{project.name}</div>
          <div className="dashboard-project-caption">{project.estimateSource}</div>
        </div>

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

      <section className="dashboard-project-metrics">
        <SummaryMetric label="Пришло" value={formatMoney(project.receivedTotal)} accent="cyan" />
        <SummaryMetric label="Остаток" value={formatMoney(project.remainingTotal)} accent="emerald" />
        <SummaryMetric label="Отложено" value={formatMoney(project.deferredTotal)} />
        <SummaryMetric label="План" value={formatMoney(project.plannedTotal)} accent="amber" />
        <SummaryMetric label="Факт" value={formatMoney(project.actualTotal)} />
      </section>

      <section className="dashboard-project-side-metrics">
        <SideMetric label="Работы / м²" value={formatPerSquare(project.workPerM2)} />
        <SideMetric label="Материалы / м²" value={formatPerSquare(project.materialsPerM2)} />
        <SideMetric label="Плановая маржа" value={`${project.plannedMarginPercent}%`} />
      </section>

      <div className="dashboard-project-layout">
        <section className="dashboard-project-panel">
          <div className="dashboard-project-panel-head">
            <div>
              <div className="eyebrow">Статьи</div>
              <h4 className="dashboard-project-panel-title">Расходы объекта</h4>
            </div>
            <span className="slot-chip">{project.expenses.length}</span>
          </div>

          <div className="dashboard-project-expense-list">
            {project.expenses.map((expense) => (
              <div key={expense.label} className={`dashboard-project-expense-row ${expenseToneClass(expense.tone)}`}>
                <div className="dashboard-project-expense-name">
                  <span className="dashboard-project-expense-dot" />
                  <span>{expense.label}</span>
                </div>
                <div className="dashboard-project-expense-amount">{formatMoney(expense.amount)}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="dashboard-project-column">
          <ProjectCardAdvancesPanel
            advances={project.advances}
            onAddAdvance={props.onAddAdvance}
            onDeleteAdvance={props.onDeleteAdvance}
          />

          <ProjectCardContractPanel
            contract={project.contract}
            onCompleteContractMilestone={props.onCompleteContractMilestone}
          />
        </div>
      </div>
    </article>
  );
}
