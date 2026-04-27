import { useEffect, useState, type KeyboardEvent } from "react";

type ProjectCardFinanceSettingsPanelProps = {
  plannedMarginPercent: number;
  onUpdatePlannedMarginPercent: (plannedMarginPercent: number) => Promise<void>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatMarginInput(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function normalizeMarginValue(rawValue: string) {
  const parsed = Number.parseFloat(rawValue.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
}

// Компактная настройка финансового параметра объекта.
// Плановая маржа редактируется прямо во вкладке "Финансы", а не в паспорте.
export function ProjectCardFinanceSettingsPanel(props: ProjectCardFinanceSettingsPanelProps) {
  const [draftValue, setDraftValue] = useState(() => formatMarginInput(props.plannedMarginPercent));
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    setDraftValue(formatMarginInput(props.plannedMarginPercent));
    setSaveState("idle");
  }, [props.plannedMarginPercent]);

  async function commit() {
    const nextValue = normalizeMarginValue(draftValue);
    if (Math.abs(nextValue - props.plannedMarginPercent) < 0.001) {
      setDraftValue(formatMarginInput(props.plannedMarginPercent));
      return;
    }

    setSaveState("saving");
    try {
      await props.onUpdatePlannedMarginPercent(nextValue);
      setDraftValue(formatMarginInput(nextValue));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void commit();
  }

  return (
    <section className="dashboard-project-panel dashboard-project-panel-finance-settings">
      <div className="dashboard-project-panel-head">
        <div className="dashboard-project-finance-settings-copy">
          <div className="eyebrow">Финансы</div>
          <h4 className="dashboard-project-panel-title">Плановая маржа</h4>
          <div className="dashboard-project-finance-settings-note">Используется в финансовой сводке объекта.</div>
        </div>
        <span className="slot-chip">%</span>
      </div>

      <label className="dashboard-project-finance-settings-field">
        <span className="dashboard-project-finance-settings-label">Маржа проекта</span>
        <div className="dashboard-project-finance-settings-input-shell">
          <input
            type="number"
            min="0"
            step="0.1"
            className="dashboard-project-finance-settings-input"
            value={draftValue}
            onChange={(event) => {
              setDraftValue(event.target.value);
              setSaveState("idle");
            }}
            onBlur={() => {
              void commit();
            }}
            onKeyDown={handleKeyDown}
            disabled={saveState === "saving"}
          />
          <span className="dashboard-project-finance-settings-suffix">%</span>
        </div>
      </label>

      <div className="dashboard-project-finance-settings-status" data-state={saveState}>
        {saveState === "saving" ? "Сохраняем..." : null}
        {saveState === "saved" ? "Маржа сохранена" : null}
        {saveState === "error" ? "Не удалось сохранить маржу" : null}
      </div>
    </section>
  );
}
