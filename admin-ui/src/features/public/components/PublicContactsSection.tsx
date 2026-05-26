import {
  contactMethodOptions,
  contactsListItems,
  objectTypeOptions,
  packageTypeOptions,
} from "../public-content";
import { useLeadFormDraft } from "../hooks/useLeadFormDraft";
import { PublicSectionContour } from "./PublicSectionContour";

type PublicContactsSectionProps = {
  getContourClassName: (sectionName: string, side: "left" | "right") => string;
};

export function PublicContactsSection({ getContourClassName }: PublicContactsSectionProps) {
  const { leadForm, leadFormStatus, isLeadFormSubmitting, handleLeadFormChange, handleLeadFormSubmit } =
    useLeadFormDraft();

  return (
    <section
      className="public-contacts"
      id="contacts"
      aria-labelledby="public-contacts-title"
      data-public-contour-section="contacts"
    >
      <PublicSectionContour sectionName="contacts" side="left" getContourClassName={getContourClassName} />

      <div className="public-section-heading public-contacts-head">
        <p className="public-section-kicker">Контакты</p>
        <h2 id="public-contacts-title">Оставьте вводные по объекту</h2>
        <p>
          Заполните короткую форму: тип объекта, площадь, формат ремонта и комментарий.
          Форма уже отправляет вводные в backend. Следующим этапом подключим уведомление
          менеджеру в Telegram.
        </p>
      </div>

      <div className="public-contacts-layout">
        <div className="public-contacts-panel">
          <form className="public-lead-form" onSubmit={handleLeadFormSubmit}>
            <label className="public-form-honeypot" htmlFor="public-lead-website" aria-hidden="true">
              <span>Website</span>
              <input
                id="public-lead-website"
                name="website"
                type="text"
                value={leadForm.website}
                onChange={handleLeadFormChange}
                autoComplete="off"
                tabIndex={-1}
              />
            </label>

            <div className="public-form-grid">
              <label className="public-form-field" htmlFor="public-lead-name">
                <span className="public-form-label">Имя</span>
                <input
                  className="public-form-input"
                  id="public-lead-name"
                  name="name"
                  type="text"
                  value={leadForm.name}
                  onChange={handleLeadFormChange}
                  placeholder="Как к вам обращаться"
                />
              </label>

              <label className="public-form-field" htmlFor="public-lead-phone">
                <span className="public-form-label">Телефон или Telegram</span>
                <input
                  className="public-form-input"
                  id="public-lead-phone"
                  name="phone"
                  type="text"
                  value={leadForm.phone}
                  onChange={handleLeadFormChange}
                  placeholder="+7 / @username"
                />
              </label>

              <label className="public-form-field" htmlFor="public-lead-object-type">
                <span className="public-form-label">Тип объекта</span>
                <select
                  className="public-form-select"
                  id="public-lead-object-type"
                  name="objectType"
                  value={leadForm.objectType}
                  onChange={handleLeadFormChange}
                >
                  <option value="">Выберите тип объекта</option>
                  {objectTypeOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-form-field" htmlFor="public-lead-area">
                <span className="public-form-label">Площадь</span>
                <input
                  className="public-form-input"
                  id="public-lead-area"
                  name="area"
                  type="text"
                  value={leadForm.area}
                  onChange={handleLeadFormChange}
                  placeholder="Например, 52 м²"
                />
              </label>

              <label className="public-form-field" htmlFor="public-lead-package-type">
                <span className="public-form-label">Интересующий формат</span>
                <select
                  className="public-form-select"
                  id="public-lead-package-type"
                  name="packageType"
                  value={leadForm.packageType}
                  onChange={handleLeadFormChange}
                >
                  <option value="">Выберите формат</option>
                  {packageTypeOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-form-field" htmlFor="public-lead-contact-method">
                <span className="public-form-label">Удобный способ связи</span>
                <select
                  className="public-form-select"
                  id="public-lead-contact-method"
                  name="contactMethod"
                  value={leadForm.contactMethod}
                  onChange={handleLeadFormChange}
                >
                  {contactMethodOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-form-field public-form-field-wide" htmlFor="public-lead-comment">
                <span className="public-form-label">Комментарий</span>
                <textarea
                  className="public-form-textarea"
                  id="public-lead-comment"
                  name="comment"
                  value={leadForm.comment}
                  onChange={handleLeadFormChange}
                  placeholder="Кратко опишите объект, задачу, сроки или что уже известно"
                  rows={5}
                />
              </label>
            </div>

            <label className="public-form-consent" htmlFor="public-lead-personal-data-consent">
              <input
                id="public-lead-personal-data-consent"
                name="personalDataConsent"
                type="checkbox"
                checked={leadForm.personalDataConsent}
                onChange={handleLeadFormChange}
                required
              />
              <span>
                Я согласен на{" "}
                <a className="public-form-consent-link" href="/privacy">
                  обработку персональных данных
                </a>{" "}
                для обработки заявки и обратной связи.
              </span>
            </label>

            <div className="public-form-footer">
              <button
                className="public-form-submit"
                type="submit"
                disabled={isLeadFormSubmitting || !leadForm.personalDataConsent}
              >
                {isLeadFormSubmitting ? "Отправляем..." : "Отправить заявку"}
              </button>
              {leadFormStatus && (
                <p className="public-form-status" role="status" aria-live="polite">
                  {leadFormStatus}
                </p>
              )}
            </div>
          </form>
        </div>

        <aside className="public-contacts-side" aria-label="Будущая QR-визитка">
          <div className="public-contacts-qr-card">
            <div>
              <h3>QR-визитка</h3>
              <p>
                Здесь будет QR-код на персональную визитку Danko BuildTech: контакты, сайт,
                быстрый переход в мессенджер и информация по ремонту.
              </p>
            </div>

            <div className="public-contacts-qr-placeholder" aria-label="Место под будущий QR-код визитки">
              <strong>QR</strong>
              <span>место под визитку</span>
            </div>

            <span className="public-contacts-qr-note">Визитка появится позже</span>

            <div className="public-contacts-list">
              <h4>Что можно отправить:</h4>
              <ul>
                {contactsListItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
