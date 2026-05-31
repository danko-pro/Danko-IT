import { type ChangeEvent, type FormEvent } from "react";

import {
  contactMethodOptions,
  objectTypeOptions,
  packageTypeOptions,
} from "../../public-content";
import type { PublicLeadForm as PublicLeadFormValues } from "../../public-types";

export type PublicLeadFormProps = {
  leadForm: PublicLeadFormValues;
  leadFormStatus: string;
  isLeadFormSubmitting: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PublicLeadForm({
  leadForm,
  leadFormStatus,
  isLeadFormSubmitting,
  onChange,
  onSubmit,
}: PublicLeadFormProps) {
  return (
    <form className="public-lead-form" onSubmit={onSubmit}>
      <label className="public-form-honeypot" htmlFor="public-lead-website" aria-hidden="true">
        <span>Website</span>
        <input
          id="public-lead-website"
          name="website"
          type="text"
          value={leadForm.website}
          onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
          onChange={onChange}
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
  );
}
