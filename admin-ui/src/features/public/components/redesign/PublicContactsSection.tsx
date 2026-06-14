import { contactMethodOptions, objectTypeOptions, packageTypeOptions } from "../../public-content";
import { useLeadFormDraft } from "../../hooks/useLeadFormDraft";

const NEXT_STEPS = [
  "Получаем заявку и вводные по объекту",
  "Уточняем детали удобным способом связи",
  "Готовим детальную смету и план старта",
];

export function PublicContactsSection() {
  const { leadForm, leadFormStatus, isLeadFormSubmitting, handleLeadFormChange, handleLeadFormSubmit } =
    useLeadFormDraft();

  return (
    <section className="dk-section dk-contact dk-reveal" id="contacts" aria-labelledby="dk-contact-title">
      <div className="dk-contact__bg" aria-hidden="true" />

      <div className="dk-wrap dk-contact__grid">
        <div className="dk-contact__promo">
          <p className="dk-kicker dk-kicker--on-dark">Калькулятор · PDF-смета</p>
          <h2 className="dk-contact__title" id="dk-contact-title">
            Соберите смету
            <br />
            и оставьте заявку
          </h2>
          <p className="dk-contact__lead">
            Заполните короткую форму по объекту — мы вернёмся с уточнениями и предложим детальный расчёт.
            Перед запуском команда подтвердит рабочую смету.
          </p>
          <ol className="dk-steps123">
            {NEXT_STEPS.map((text, index) => (
              <li key={text}>
                <span className="dk-step123__num">{index + 1}</span>
                {text}
              </li>
            ))}
          </ol>
          <p className="dk-contact__area">Работаем по Калининграду и области</p>
        </div>

        <div className="dk-form-card">
          {/* Реальная отправка: useLeadFormDraft → POST /api/public/leads (honeypot + согласие сохранены). */}
          <form className="dk-form" onSubmit={handleLeadFormSubmit}>
            <label className="dk-form__honeypot" htmlFor="dk-lead-website" aria-hidden="true">
              <span>Website</span>
              <input
                id="dk-lead-website"
                name="website"
                type="text"
                value={leadForm.website}
                onChange={handleLeadFormChange}
                autoComplete="off"
                tabIndex={-1}
              />
            </label>

            <div className="dk-form__grid">
              <label className="dk-field" htmlFor="dk-lead-name">
                <span className="dk-label">Имя</span>
                <input
                  className="dk-input"
                  id="dk-lead-name"
                  name="name"
                  type="text"
                  value={leadForm.name}
                  onChange={handleLeadFormChange}
                  placeholder="Как к вам обращаться"
                />
              </label>

              <label className="dk-field" htmlFor="dk-lead-phone">
                <span className="dk-label">Телефон или Telegram</span>
                <input
                  className="dk-input"
                  id="dk-lead-phone"
                  name="phone"
                  type="text"
                  value={leadForm.phone}
                  onChange={handleLeadFormChange}
                  placeholder="+7 / @username"
                />
              </label>

              <label className="dk-field" htmlFor="dk-lead-object-type">
                <span className="dk-label">Тип объекта</span>
                <select
                  className="dk-select"
                  id="dk-lead-object-type"
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

              <label className="dk-field" htmlFor="dk-lead-area">
                <span className="dk-label">Площадь</span>
                <input
                  className="dk-input"
                  id="dk-lead-area"
                  name="area"
                  type="text"
                  value={leadForm.area}
                  onChange={handleLeadFormChange}
                  placeholder="Например, 52 м²"
                />
              </label>

              <label className="dk-field dk-field--wide" htmlFor="dk-lead-package-type">
                <span className="dk-label">Интересующий формат</span>
                <select
                  className="dk-select"
                  id="dk-lead-package-type"
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

              <label className="dk-field dk-field--wide" htmlFor="dk-lead-contact-method">
                <span className="dk-label">Удобный способ связи</span>
                <select
                  className="dk-select"
                  id="dk-lead-contact-method"
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

              <label className="dk-field dk-field--wide" htmlFor="dk-lead-comment">
                <span className="dk-label">Комментарий</span>
                <textarea
                  className="dk-textarea"
                  id="dk-lead-comment"
                  name="comment"
                  value={leadForm.comment}
                  onChange={handleLeadFormChange}
                  placeholder="Кратко опишите объект, задачу или сроки"
                  rows={3}
                />
              </label>
            </div>

            <label className="dk-consent" htmlFor="dk-lead-consent">
              <input
                id="dk-lead-consent"
                name="personalDataConsent"
                type="checkbox"
                checked={leadForm.personalDataConsent}
                onChange={handleLeadFormChange}
                required
              />
              <span>
                Я согласен на{" "}
                <a href="/privacy">обработку персональных данных</a> для обработки заявки и обратной связи.
              </span>
            </label>

            <button
              className="dk-submit"
              type="submit"
              disabled={isLeadFormSubmitting || !leadForm.personalDataConsent}
            >
              {isLeadFormSubmitting ? "Отправляем…" : "Отправить заявку"}
            </button>

            {leadFormStatus ? (
              <p className="dk-status" role="status" aria-live="polite">
                {leadFormStatus}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
