import { type FormEvent, useEffect, useRef, useState } from "react";
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type { ProjectCardAdvanceItem } from "../model/project-model";

const ADVANCE_REMOVE_DURATION_MS = 420;

export function ProjectCardAdvancesPanel(props: {
  advances: ProjectCardAdvanceItem[];
  onAddAdvance: (payload: { title: string; amount: number; date: string }) => void;
  onDeleteAdvance: (advanceId: string) => void;
}) {
  const [isAdvanceFormOpen, setIsAdvanceFormOpen] = useState(false);
  const [advanceTitle, setAdvanceTitle] = useState("Аванс");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [removingAdvanceIds, setRemovingAdvanceIds] = useState<string[]>([]);
  const removeTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(removeTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  function resetAdvanceForm() {
    setAdvanceTitle("Аванс");
    setAdvanceAmount("");
    setAdvanceDate("");
    setAdvanceError(null);
    setIsAdvanceFormOpen(false);
  }

  function handleAdvanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number(advanceAmount.replace(",", "."));
    if (!advanceDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAdvanceError("Укажите сумму аванса и дату поступления.");
      return;
    }

    props.onAddAdvance({
      title: advanceTitle.trim() || "Аванс",
      amount: parsedAmount,
      date: advanceDate,
    });

    resetAdvanceForm();
  }

  function handleAdvanceRemove(advanceId: string) {
    setRemovingAdvanceIds((current) => {
      if (current.includes(advanceId)) {
        return current;
      }

      return [...current, advanceId];
    });

    removeTimeoutsRef.current[advanceId] = window.setTimeout(() => {
      props.onDeleteAdvance(advanceId);
      setRemovingAdvanceIds((current) => current.filter((id) => id !== advanceId));
      delete removeTimeoutsRef.current[advanceId];
    }, ADVANCE_REMOVE_DURATION_MS);
  }

  const visibleAdvanceCount = props.advances.reduce(
    (count, advance) => count + (removingAdvanceIds.includes(advance.id) ? 0 : 1),
    0,
  );

  return (
    <section className="dashboard-project-panel dashboard-project-panel-advances">
      <div className="dashboard-project-panel-head">
        <div>
          <div className="eyebrow">Авансы</div>
          <h4 className="dashboard-project-panel-title">Поступления</h4>
        </div>

        <span className="slot-chip">{visibleAdvanceCount}</span>
      </div>

      <div className="dashboard-project-advances">
        {props.advances.map((advance) => {
          const isRemoving = removingAdvanceIds.includes(advance.id);

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
                  <button
                    type="button"
                    className="dashboard-project-advance-remove"
                    aria-label="Удалить аванс"
                    disabled={isRemoving}
                    onClick={() => handleAdvanceRemove(advance.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-project-advance-overlay">
        <div className="dashboard-project-advance-separator">
          <button
            type="button"
            className={
              isAdvanceFormOpen
                ? "dashboard-project-add-button dashboard-project-add-button-open"
                : "dashboard-project-add-button"
            }
            aria-label={isAdvanceFormOpen ? "Закрыть форму аванса" : "Добавить аванс"}
            aria-expanded={isAdvanceFormOpen}
            onClick={() => {
              if (isAdvanceFormOpen) {
                resetAdvanceForm();
                return;
              }
              setIsAdvanceFormOpen(true);
            }}
          >
            <span
              className={
                isAdvanceFormOpen
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
            isAdvanceFormOpen
              ? "dashboard-project-advance-form-shell dashboard-project-advance-form-shell-open"
              : "dashboard-project-advance-form-shell"
          }
          aria-hidden={!isAdvanceFormOpen}
        >
          <div className="dashboard-project-advance-form-shell-inner">
            <form className="dashboard-project-advance-form" onSubmit={handleAdvanceSubmit}>
              <div className="dashboard-project-advance-fields">
                <label className="dashboard-project-advance-field">
                  <span className="field-label">Название аванса</span>
                  <input
                    type="text"
                    className="dashboard-project-advance-input"
                    value={advanceTitle}
                    onChange={(event) => setAdvanceTitle(event.target.value)}
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
                    value={advanceAmount}
                    onChange={(event) => setAdvanceAmount(event.target.value)}
                    placeholder="Например, 250000"
                  />
                </label>

                <label className="dashboard-project-advance-field">
                  <span className="field-label">Дата поступления</span>
                  <input
                    type="date"
                    className="dashboard-project-advance-input"
                    value={advanceDate}
                    onChange={(event) => setAdvanceDate(event.target.value)}
                  />
                </label>
              </div>

              {advanceError ? <div className="dashboard-project-advance-error">{advanceError}</div> : null}

              <div className="dashboard-project-advance-actions">
                <button type="submit" className="action-button">
                  Сохранить аванс
                </button>
                <button type="button" className="secondary-button" onClick={resetAdvanceForm}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
