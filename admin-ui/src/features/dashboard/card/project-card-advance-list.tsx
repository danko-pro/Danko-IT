/**
 * Список авансов с row-рендерингом и remove-кнопкой.
 * Компонент ничего не знает о форме и синхронизации, только показывает текущие строки.
 */
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type { ProjectCardAdvanceItem } from "../model/project-model";
import { DeleteButton } from "../../../shared/controls";

type ProjectCardAdvanceListProps = {
  advances: ProjectCardAdvanceItem[];
  removingAdvanceIds: string[];
  onRemoveAdvance: (advanceId: string) => void;
};

export function ProjectCardAdvanceList(props: ProjectCardAdvanceListProps) {
  return (
    <div className="dashboard-project-advances">
      {props.advances.map((advance) => {
        const isRemoving = props.removingAdvanceIds.includes(advance.id);

        return (
          <div
            key={advance.id}
            className={
              isRemoving
                ? "dashboard-project-advance-row-shell dashboard-project-advance-row-shell-removing"
                : "dashboard-project-advance-row-shell"
            }
          >
            <div className="dashboard-project-advance-row-shell-inner">
              <div
                className={
                  isRemoving
                    ? "dashboard-project-advance-row dashboard-project-advance-row-removing"
                    : "dashboard-project-advance-row"
                }
              >
                <div className="dashboard-project-advance-title">{advance.title}</div>
                <div className="dashboard-project-advance-amount">{formatMoney(advance.amount)}</div>
                <div className="dashboard-project-advance-date">{formatDisplayDate(advance.date)}</div>
                <div className="dashboard-project-advance-status">
                  <span className={advance.status === "paid" ? "stat-chip" : "slot-chip"}>
                    {advance.status === "paid" ? "Оплачено" : "План"}
                  </span>
                </div>
                <DeleteButton
                  className="dashboard-project-advance-remove"
                  aria-label="Удалить аванс"
                  disabled={isRemoving}
                  onClick={() => props.onRemoveAdvance(advance.id)}
                >
                  ×
                </DeleteButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
