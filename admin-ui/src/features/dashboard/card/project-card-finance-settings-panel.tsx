import { useEffect, useState, type KeyboardEvent } from "react";
import type { ProjectFinanceSettings, ProjectTaxBaseMode } from "../model/project-model";

type ProjectCardFinanceSettingsPanelProps = ProjectFinanceSettings & {
  onUpdateFinanceSettings: (settings: ProjectFinanceSettings) => void | Promise<void>;
};

type FinanceSettingsDraft = {
  plannedMarginPercent: string;
  taxRatePercent: string;
  taxBaseMode: ProjectTaxBaseMode;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatPercentInput(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function normalizePercentValue(rawValue: string) {
  const parsed = Number.parseFloat(rawValue.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
}

function normalizeTaxBaseMode(value: string): ProjectTaxBaseMode {
  return value === "received_total" ? "received_total" : "received_total";
}

function buildDraftFromSettings(settings: ProjectFinanceSettings): FinanceSettingsDraft {
  return {
    plannedMarginPercent: formatPercentInput(settings.plannedMarginPercent),
    taxRatePercent: formatPercentInput(settings.taxRatePercent),
    taxBaseMode: settings.taxBaseMode,
  };
}

function buildSettingsFromDraft(draft: FinanceSettingsDraft): ProjectFinanceSettings {
  return {
    plannedMarginPercent: normalizePercentValue(draft.plannedMarginPercent),
    taxRatePercent: normalizePercentValue(draft.taxRatePercent),
    taxBaseMode: draft.taxBaseMode,
  };
}

function settingsAreEqual(left: ProjectFinanceSettings, right: ProjectFinanceSettings) {
  return (
    Math.abs(left.plannedMarginPercent - right.plannedMarginPercent) < 0.001 &&
    Math.abs(left.taxRatePercent - right.taxRatePercent) < 0.001 &&
    left.taxBaseMode === right.taxBaseMode
  );
}

export function ProjectCardFinanceSettingsPanel(props: ProjectCardFinanceSettingsPanelProps) {
  const currentSettings: ProjectFinanceSettings = {
    plannedMarginPercent: props.plannedMarginPercent,
    taxRatePercent: props.taxRatePercent,
    taxBaseMode: props.taxBaseMode,
  };
  const [draft, setDraft] = useState(() => buildDraftFromSettings(currentSettings));
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    setDraft(buildDraftFromSettings(currentSettings));
    setSaveState("idle");
  }, [props.plannedMarginPercent, props.taxRatePercent, props.taxBaseMode]);

  async function commit(nextDraft = draft) {
    const nextSettings = buildSettingsFromDraft(nextDraft);
    if (settingsAreEqual(nextSettings, currentSettings)) {
      setDraft(buildDraftFromSettings(currentSettings));
      return;
    }

    setSaveState("saving");
    try {
      await props.onUpdateFinanceSettings(nextSettings);
      setDraft(buildDraftFromSettings(nextSettings));
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

  function updateNumberDraft(field: "plannedMarginPercent" | "taxRatePercent", value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveState("idle");
  }

  function updateTaxBaseMode(value: string) {
    const nextDraft = {
      ...draft,
      taxBaseMode: normalizeTaxBaseMode(value),
    };
    setDraft(nextDraft);
    setSaveState("idle");
    void commit(nextDraft);
  }

  return (
    <section className="dashboard-project-panel dashboard-project-panel-finance-settings">
      <div className="dashboard-project-panel-head">
        <div className="dashboard-project-finance-settings-copy">
          <div className="eyebrow">Финансы</div>
          <h4 className="dashboard-project-panel-title">Финансовые настройки</h4>
          <div className="dashboard-project-finance-settings-note">
            Маржа и налоговая ставка сохраняются как настройки объекта. Итоговые суммы считает backend.
          </div>
        </div>
        <span className="slot-chip">%</span>
      </div>

      <div className="dashboard-project-finance-settings-grid">
        <label className="dashboard-project-finance-settings-field">
          <span className="dashboard-project-finance-settings-label">Плановая маржа</span>
          <div className="dashboard-project-finance-settings-input-shell">
            <input
              type="number"
              min="0"
              step="0.1"
              className="dashboard-project-finance-settings-input"
              value={draft.plannedMarginPercent}
              onChange={(event) => updateNumberDraft("plannedMarginPercent", event.target.value)}
              onBlur={() => {
                void commit();
              }}
              onKeyDown={handleKeyDown}
              disabled={saveState === "saving"}
            />
            <span className="dashboard-project-finance-settings-suffix">%</span>
          </div>
        </label>

        <label className="dashboard-project-finance-settings-field">
          <span className="dashboard-project-finance-settings-label">Налоговая ставка</span>
          <div className="dashboard-project-finance-settings-input-shell">
            <input
              type="number"
              min="0"
              step="0.1"
              className="dashboard-project-finance-settings-input"
              value={draft.taxRatePercent}
              onChange={(event) => updateNumberDraft("taxRatePercent", event.target.value)}
              onBlur={() => {
                void commit();
              }}
              onKeyDown={handleKeyDown}
              disabled={saveState === "saving"}
            />
            <span className="dashboard-project-finance-settings-suffix">%</span>
          </div>
        </label>

        <label className="dashboard-project-finance-settings-field dashboard-project-finance-settings-field-wide">
          <span className="dashboard-project-finance-settings-label">Налоговая база</span>
          <select
            className="dashboard-project-finance-settings-input dashboard-project-finance-settings-select"
            value={draft.taxBaseMode}
            onChange={(event) => updateTaxBaseMode(event.target.value)}
            disabled={saveState === "saving"}
          >
            <option value="received_total">Полученные авансы</option>
          </select>
        </label>
      </div>

      <div className="dashboard-project-finance-settings-status" data-state={saveState}>
        {saveState === "saving" ? "Сохраняем..." : null}
        {saveState === "saved" ? "Финансовые настройки сохранены" : null}
        {saveState === "error" ? "Не удалось сохранить финансовые настройки" : null}
      </div>
    </section>
  );
}
