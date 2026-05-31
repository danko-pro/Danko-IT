import { contactsListItems } from "../public-content";
import { useLeadFormDraft } from "../hooks/useLeadFormDraft";
import { PublicLeadForm } from "./contacts/PublicLeadForm";
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
          <PublicLeadForm
            leadForm={leadForm}
            leadFormStatus={leadFormStatus}
            isLeadFormSubmitting={isLeadFormSubmitting}
            onChange={handleLeadFormChange}
            onSubmit={handleLeadFormSubmit}
          />
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
