import { PanelResizeHandle } from "../../../shared/ui/popovers";
import { formatMoney } from "../model/project-accounting-format";
import { expenseToneClass } from "./project-card-metrics-view";
import type { ProjectCardProps } from "./project-card-types";
import { useProjectCardExpensesPanelResize } from "./use-project-card-expenses-panel-resize";

type ProjectCardExpensesPanelProps = Pick<ProjectCardProps, "project">;

export function ProjectCardExpensesPanel(props: ProjectCardExpensesPanelProps) {
  const resizePanel = useProjectCardExpensesPanelResize();

  return (
    <section
      ref={resizePanel.panelRef}
      className={
        resizePanel.isResizing
          ? "dashboard-project-panel dashboard-project-panel-expenses dashboard-project-panel-expenses-resizing"
          : "dashboard-project-panel dashboard-project-panel-expenses"
      }
      style={resizePanel.panelStyle}
    >
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

      <PanelResizeHandle
        variant="edge-right"
        className="dashboard-project-panel-expenses-resize"
        onPointerDown={resizePanel.createResizeHandlePointerDown("right")}
      />
    </section>
  );
}
