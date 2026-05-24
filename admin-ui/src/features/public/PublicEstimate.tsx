const estimateSteps = [
  "объект и помещения",
  "объём объекта",
  "стены и полы",
  "тёплый пол",
  "потолки, электрика, сантехника",
  "итоговая смета",
  "скачать / отправить заявку",
];

export function PublicEstimate() {
  return (
    <main className="public-landing public-estimate-page">
      <header className="public-estimate-header">
        <a className="public-brand public-privacy-brand" href="/" aria-label="Danko, на главную">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="public-brand-copy">
            <span className="public-brand-name">Danko</span>
            <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
          </span>
        </a>
        <a className="public-privacy-back" href="/">
          Вернуться на главную
        </a>
      </header>

      <section className="public-estimate" aria-labelledby="public-estimate-title">
        <div className="public-estimate-card public-estimate-card-main">
          <p className="public-section-kicker">Калькулятор ремонта</p>
          <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
          <p className="public-estimate-subtitle">
            Введите параметры объекта и получите предварительную смету по работам, материалам и комплектации.
          </p>
          <p className="public-estimate-description">
            Калькулятор будет считать ремонт по логике Danko: площади помещений, стены, полы, тёплый пол,
            потолки, электрика, сантехника и итоговая смета.
          </p>

          <div className="public-estimate-status" role="status">
            Калькулятор готовится к запуску
          </div>

          <div className="public-estimate-actions" aria-label="Действия на странице калькулятора">
            <a className="public-action" href="/#contacts">
              Оставить заявку
            </a>
            <a className="public-hero-secondary" href="/">
              Вернуться на главную
            </a>
          </div>
        </div>

        <aside className="public-estimate-card" aria-label="Будущий сценарий расчёта">
          <div className="public-estimate-preview-head">
            <span>Сценарий</span>
            <h2>Как будет устроен расчёт</h2>
          </div>
          <ol className="public-estimate-steps">
            {estimateSteps.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
