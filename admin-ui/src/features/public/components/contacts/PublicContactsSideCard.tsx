type PublicContactsSideCardProps = {
  contactsListItems: string[];
};

export function PublicContactsSideCard({ contactsListItems }: PublicContactsSideCardProps) {
  return (
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
  );
}
