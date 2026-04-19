import { formatMoney } from "../model/project-accounting-format";
import { expenseToneClass } from "./project-card-metrics-view";
import type { ProjectCardProps } from "./project-card-types";

type ProjectCardExpensesPanelProps = Pick<ProjectCardProps, "project">;

export function ProjectCardExpensesPanel(props: ProjectCardExpensesPanelProps) {
  return (
    <section className="dashboard-project-panel">
      <div className="dashboard-project-panel-head">
        <div>
          <div className="eyebrow">Статьи</div>
          <h4 className="dashboard-project-panel-title">Расходы объекта</h4>
        </div>
        <span className="slot-chip">{props.project.expenses.length}</span>
      </div>

      <div className="dashboard-project-expense-list">
        {props.project.expenses.map((expense) => (
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
  );
}
