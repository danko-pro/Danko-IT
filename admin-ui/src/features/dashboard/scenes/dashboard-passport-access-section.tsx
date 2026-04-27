import type { PassportSectionProps } from "./dashboard-passport-section-types";

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

        <label className="dashboard-passport-field">
          <span className="dashboard-passport-label">Часы доступа</span>
          <input
            className="dashboard-passport-input"
            value={draft.accessHours}
            onChange={(event) => setDraft((current) => ({ ...current, accessHours: event.target.value }))}
          />
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

        <label className="dashboard-passport-field dashboard-passport-field-wide">
          <span className="dashboard-passport-label">Комментарий по объекту</span>
          <textarea
            className="dashboard-passport-input dashboard-passport-textarea"
            value={draft.comment}
            onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))}
          />
        </label>
      </div>
    </section>
  );
}
