import type { Dispatch, SetStateAction } from "react";

import type { PassportDraft } from "./dashboard-passport-draft";

type PassportSectionProps = {
  draft: PassportDraft;
  setDraft: Dispatch<SetStateAction<PassportDraft>>;
};

// Секции формы паспорта объекта.
// Каждая секция отвечает только за свою зону данных: идентичность объекта, доступ и расчётные параметры.

export function DashboardPassportIdentitySection(props: PassportSectionProps) {
  const { draft, setDraft } = props;

  return (
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
  );
}

export function DashboardPassportAccessSection(props: PassportSectionProps) {
  const { draft, setDraft } = props;

  return (
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
            <span className="dashboard-passport-meta">{draft.hasElevator ? "Доступен" : "Нет лифта"}</span>
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
  );
}

export function DashboardPassportMetricsSection(props: PassportSectionProps) {
  const { draft, setDraft } = props;

  return (
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
                plannedMarginPercent: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0,
              }))
            }
          />
        </label>
      </div>
    </section>
  );
}
