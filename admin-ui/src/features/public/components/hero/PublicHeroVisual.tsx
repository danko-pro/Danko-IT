export function PublicHeroVisual() {
  return (
    <div className="public-calc-shell">
      <aside className="public-calc-card" aria-label="Клиентский калькулятор сметы">
        <img className="public-calc-image" src="/brand/1.jpg" alt="" aria-hidden="true" />

        <div className="public-calc-head">
          <p className="public-calc-kicker">Клиентский калькулятор</p>
          <span className="public-calc-badge">PDF-смета</span>
        </div>

        <h2 className="public-calc-title">Смета для старта ремонта</h2>

        <div className="public-calc-route" aria-hidden="true">
          <span>Состав</span>
          <span>PDF</span>
          <strong>Старт</strong>
        </div>

        <a className="public-action public-calc-cta" href="/estimate">
          Открыть калькулятор
        </a>
        <p className="public-calc-note">
          Перед запуском команда проверит вводные и подтвердит рабочую смету.
        </p>
      </aside>

      <p className="public-calc-promise">
        <span className="public-calc-promise-text">Рассчитайте свой ремонт.</span>
      </p>
    </div>
  );
}
