import type { PassportSectionProps } from "./dashboard-passport-section-types";

export function DashboardPassportIdentitySection(props: PassportSectionProps) {
  const { draft, setDraft } = props;

  return (
    <section className="dashboard-passport-section dashboard-passport-section-wide">
      <div className="dashboard-passport-section-head">
        <span className="dashboard-passport-section-kicker">Паспорт объекта</span>
        <h2 className="dashboard-passport-section-title">Данные объекта</h2>
      </div>

      <div className="dashboard-passport-grid dashboard-passport-grid-primary">
        <label className="dashboard-passport-field">
          <span className="dashboard-passport-label">Объект</span>
          <input
            className="dashboard-passport-input"
            value={draft.code}
            onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
          />
        </label>

        <label className="dashboard-passport-field dashboard-passport-field-span-2">
          <span className="dashboard-passport-label">Название ЖК / официальное имя</span>
          <input
            className="dashboard-passport-input"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </label>

        <label className="dashboard-passport-field dashboard-passport-field-full">
          <span className="dashboard-passport-label">Адрес</span>
          <input
            className="dashboard-passport-input"
            value={draft.address}
            onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
          />
        </label>

        <label className="dashboard-passport-field">
          <span className="dashboard-passport-label">Подъезд / секция</span>
          <input
            className="dashboard-passport-input"
            value={draft.entranceSection}
            onChange={(event) => setDraft((current) => ({ ...current, entranceSection: event.target.value }))}
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
