import { type FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardSceneChrome } from "../dashboard-scene-chrome";
import type { DashboardSceneView } from "../dashboard-scene-types";
import type { DashboardProjectCardData } from "../model/project-model";
import type { ProjectPassportPatch } from "../state/project-record-actions";

type PassportDraft = ProjectPassportPatch;

function createPassportDraft(project: DashboardProjectCardData): PassportDraft {
  return {
    name: project.name,
    address: project.address,
    apartment: project.apartment,
    floor: project.floor,
    hasElevator: project.hasElevator,
    siteAccess: project.siteAccess,
    intercomCode: project.intercomCode,
    responsiblePerson: project.responsiblePerson,
    areaM2: project.areaM2,
    plannedMarginPercent: project.plannedMarginPercent,
  };
}

function samePassportDraft(left: PassportDraft, right: PassportDraft) {
  return (
    left.name === right.name &&
    left.address === right.address &&
    left.apartment === right.apartment &&
    left.floor === right.floor &&
    left.hasElevator === right.hasElevator &&
    left.siteAccess === right.siteAccess &&
    left.intercomCode === right.intercomCode &&
    left.responsiblePerson === right.responsiblePerson &&
    left.areaM2 === right.areaM2 &&
    left.plannedMarginPercent === right.plannedMarginPercent
  );
}

export function DashboardPassportScene(props: {
  project: DashboardProjectCardData;
  activeView: DashboardSceneView;
  onSelectView: (view: DashboardSceneView) => void;
  onSavePassport: (passport: PassportDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PassportDraft>(() => createPassportDraft(props.project));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setDraft(createPassportDraft(props.project));
    setSaveState("idle");
  }, [props.project]);

  const baseDraft = useMemo(() => createPassportDraft(props.project), [props.project]);
  const isDirty = !samePassportDraft(draft, baseDraft);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDirty) {
      return;
    }

    setSaveState("saving");
    try {
      await props.onSavePassport(draft);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <article className="dashboard-project-card dashboard-passport-card">
      <div className="dashboard-project-card__glow" />
      <DashboardSceneChrome activeView={props.activeView} onSelect={props.onSelectView} />

      <form className="dashboard-passport-form" onSubmit={handleSubmit}>
        <section className="dashboard-passport-section dashboard-passport-section-wide">
          <div className="dashboard-passport-section-head">
            <span className="dashboard-passport-section-kicker">Паспорт объекта</span>
            <h2 className="dashboard-passport-section-title">Данные объекта и параметры расчёта</h2>
          </div>

          <div className="dashboard-passport-grid dashboard-passport-grid-primary">
            <label className="dashboard-passport-field dashboard-passport-field-wide">
              <span className="dashboard-passport-label">Название</span>
              <input
                className="dashboard-passport-input"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="dashboard-passport-field dashboard-passport-field-wide">
              <span className="dashboard-passport-label">Адрес</span>
              <input
                className="dashboard-passport-input"
                value={draft.address}
                onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
              />
            </label>

            <label className="dashboard-passport-field">
              <span className="dashboard-passport-label">Квартира</span>
              <input
                className="dashboard-passport-input"
                value={draft.apartment}
                onChange={(event) => setDraft((current) => ({ ...current, apartment: event.target.value }))}
              />
            </label>

            <label className="dashboard-passport-field">
              <span className="dashboard-passport-label">Этаж</span>
              <input
                className="dashboard-passport-input"
                value={draft.floor}
                onChange={(event) => setDraft((current) => ({ ...current, floor: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="dashboard-passport-section">
          <div className="dashboard-passport-section-head">
            <span className="dashboard-passport-section-kicker">Доступ</span>
            <h3 className="dashboard-passport-section-title">Логистика и доступ на объект</h3>
          </div>

          <div className="dashboard-passport-grid">
            <label className="dashboard-passport-switch">
              <input
                type="checkbox"
                checked={draft.hasElevator}
                onChange={(event) => setDraft((current) => ({ ...current, hasElevator: event.target.checked }))}
              />
              <span className="dashboard-passport-switch-box" aria-hidden="true" />
              <span className="dashboard-passport-switch-copy">
                <span className="dashboard-passport-label">Лифт</span>
                <span className="dashboard-passport-meta">
                  {draft.hasElevator ? "Доступен" : "Нет лифта"}
                </span>
              </span>
            </label>

            <label className="dashboard-passport-field dashboard-passport-field-wide">
              <span className="dashboard-passport-label">Въезд на территорию</span>
              <input
                className="dashboard-passport-input"
                value={draft.siteAccess}
                onChange={(event) => setDraft((current) => ({ ...current, siteAccess: event.target.value }))}
              />
            </label>

            <label className="dashboard-passport-field">
              <span className="dashboard-passport-label">Код домофона</span>
              <input
                className="dashboard-passport-input"
                value={draft.intercomCode}
                onChange={(event) => setDraft((current) => ({ ...current, intercomCode: event.target.value }))}
              />
            </label>

            <label className="dashboard-passport-field">
              <span className="dashboard-passport-label">Ответственный</span>
              <input
                className="dashboard-passport-input"
                value={draft.responsiblePerson}
                onChange={(event) => setDraft((current) => ({ ...current, responsiblePerson: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="dashboard-passport-section">
          <div className="dashboard-passport-section-head">
            <span className="dashboard-passport-section-kicker">Параметры</span>
            <h3 className="dashboard-passport-section-title">База для расчёта</h3>
          </div>

          <div className="dashboard-passport-grid">
            <label className="dashboard-passport-field">
              <span className="dashboard-passport-label">Площадь квартиры по полу</span>
              <input
                type="number"
                min="0"
                step="0.1"
                className="dashboard-passport-input"
                value={draft.areaM2}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    areaM2: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0,
                  }))
                }
              />
            </label>

            <label className="dashboard-passport-field">
              <span className="dashboard-passport-label">Плановая маржа</span>
              <input
                type="number"
                min="0"
                step="0.1"
                className="dashboard-passport-input"
                value={draft.plannedMarginPercent}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    plannedMarginPercent: Number.isFinite(event.target.valueAsNumber)
                      ? event.target.valueAsNumber
                      : 0,
                  }))
                }
              />
            </label>
          </div>
        </section>

        <div className="dashboard-passport-actions">
          <span className="dashboard-passport-status" data-state={saveState}>
            {saveState === "saving"
              ? "Сохраняю паспорт объекта..."
              : saveState === "saved"
                ? "Паспорт объекта сохранён"
                : saveState === "error"
                  ? "Не удалось сохранить паспорт объекта"
                  : "Паспорт объекта хранит только исходные данные и параметры"}
          </span>
          <button
            type="submit"
            className="dashboard-passport-save-button"
            disabled={!isDirty || saveState === "saving"}
          >
            Сохранить
          </button>
        </div>
      </form>
    </article>
  );
}
