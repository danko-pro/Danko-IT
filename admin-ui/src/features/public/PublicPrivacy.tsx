const privacyDataItems = [
  "имя или способ обращения;",
  "телефон, Telegram или другой контакт для связи;",
  "тип объекта, площадь и интересующий формат ремонта;",
  "комментарий к задаче, срокам, объекту или расчету;",
  "технические данные отправки формы, необходимые для защиты от спама.",
];

const privacyPurposeItems = [
  "связаться с вами по заявке;",
  "подготовить предварительный расчет или уточнить вводные;",
  "обработать запрос по ремонту, отделке, комплектации или объекту;",
  "передать заявку менеджеру Danko для дальнейшей работы;",
  "защитить форму от спама и автоматических отправок.",
];

export function PublicPrivacy() {
  return (
    <main className="public-landing public-privacy-page">
      <header className="public-privacy-header">
        <a className="public-brand public-privacy-brand" href="/" aria-label="Danko, на главную">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="public-brand-copy">
            <span className="public-brand-name">Danko</span>
            <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
          </span>
        </a>
        <a className="public-privacy-back" href="/#contacts">
          Вернуться к заявке
        </a>
      </header>

      <section className="public-privacy" aria-labelledby="public-privacy-title">
        <div className="public-privacy-head">
          <p className="public-section-kicker">Персональные данные</p>
          <h1 id="public-privacy-title">Политика обработки персональных данных</h1>
          <p>
            Эта страница описывает, какие данные собираются через форму заявки на сайте Danko,
            для чего они используются и как можно запросить удаление данных.
          </p>
          <span className="public-privacy-date">Актуальная версия: 2026-05-24</span>
        </div>

        <div className="public-privacy-card">
          <h2>1. Какие данные собираются</h2>
          <p>Через форму заявки на сайте могут передаваться следующие данные:</p>
          <ul>
            {privacyDataItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="public-privacy-card">
          <h2>2. Цель обработки</h2>
          <p>Данные используются только для обработки заявки и обратной связи:</p>
          <ul>
            {privacyPurposeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="public-privacy-card">
          <h2>3. Передача заявки менеджеру</h2>
          <p>
            После отправки формы заявка может быть передана в Telegram-группу менеджера Danko,
            чтобы команда увидела вводные и могла связаться с вами выбранным способом. В группу
            передается содержимое заявки: имя, контакт, тип объекта, площадь, формат ремонта и
            комментарий.
          </p>
        </div>

        <div className="public-privacy-card">
          <h2>4. Хранение и защита</h2>
          <p>
            Доступ к заявкам ограничен командой, которая обрабатывает обращения по ремонту и
            комплектации. Публичная страница не содержит токенов, паролей или приватных ключей.
            Отправка формы защищена обязательным согласием, honeypot-полем и ограничением частоты
            запросов.
          </p>
        </div>

        <div className="public-privacy-card">
          <h2>5. Как запросить удаление данных</h2>
          <p>
            Чтобы запросить удаление или уточнение данных по заявке, напишите команде Danko тем
            способом связи, который использовали при обращении. В запросе укажите имя, контакт и
            примерную дату отправки заявки, чтобы ее можно было найти.
          </p>
        </div>

        <div className="public-privacy-note">
          <p>
            Эта политика относится к публичной форме заявки на сайте. Если позже появятся личный
            кабинет, клиентский чат или дополнительные интеграции, политика будет обновлена.
          </p>
        </div>
      </section>
    </main>
  );
}
