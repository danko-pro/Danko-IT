/**
 * Overlay-форма добавления аванса.
 * Отдельный компонент нужен, чтобы панель не держала в себе весь form JSX.
 */
import type { FormEvent } from "react";
import { Button } from "../../../shared/controls";

type ProjectCardAdvanceFormProps = {
  advanceAmount: string;
  advanceDate: string;
  advanceError: string | null;
  advanceTitle: string;
  isOpen: boolean;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onToggle: () => void;
};

export function ProjectCardAdvanceForm(props: ProjectCardAdvanceFormProps) {
  return (
    <div className="dashboard-project-advance-overlay">
      <div className="dashboard-project-advance-separator">
        <button
          type="button"
          className={
            props.isOpen
              ? "dashboard-project-add-button dashboard-project-add-button-open"
              : "dashboard-project-add-button"
          }
          aria-label={props.isOpen ? "Закрыть форму аванса" : "Добавить аванс"}
          aria-expanded={props.isOpen}
          onClick={props.onToggle}
        >
          <span
            className={
              props.isOpen
                ? "dashboard-project-add-button-glyph dashboard-project-add-button-glyph-open"
                : "dashboard-project-add-button-glyph"
            }
          >
            +
          </span>
        </button>
      </div>

      <div
        className={
          props.isOpen
            ? "dashboard-project-advance-form-shell dashboard-project-advance-form-shell-open"
            : "dashboard-project-advance-form-shell"
        }
        aria-hidden={!props.isOpen}
      >
        <div className="dashboard-project-advance-form-shell-inner">
          <form className="dashboard-project-advance-form" onSubmit={props.onSubmit}>
            <div className="dashboard-project-advance-fields">
              <label className="dashboard-project-advance-field">
                <span className="field-label">Название аванса</span>
                <input
                  type="text"
                  className="dashboard-project-advance-input"
                  value={props.advanceTitle}
                  onChange={(event) => props.onTitleChange(event.target.value)}
                  placeholder="Аванс"
                />
              </label>

              <label className="dashboard-project-advance-field">
                <span className="field-label">Сумма аванса</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="dashboard-project-advance-input"
                  value={props.advanceAmount}
                  onChange={(event) => props.onAmountChange(event.target.value)}
                  placeholder="Например, 250000"
                />
              </label>

              <label className="dashboard-project-advance-field">
                <span className="field-label">Дата поступления</span>
                <input
                  type="date"
                  className="dashboard-project-advance-input"
                  value={props.advanceDate}
                  onChange={(event) => props.onDateChange(event.target.value)}
                />
              </label>
            </div>

            {props.advanceError ? <div className="dashboard-project-advance-error">{props.advanceError}</div> : null}

            <div className="dashboard-project-advance-actions">
              <Button type="submit">Сохранить аванс</Button>
              <Button variant="secondary" onClick={props.onClose}>
                Отмена
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
