import { publicHeroStats } from "../../public-content";

export function PublicHero() {
  return (
    <section className="dk-hero" id="top" aria-labelledby="dk-hero-title">
      <img className="dk-hero__bg" src="/projects/re/re-23.jpeg" alt="" aria-hidden="true" />
      <div className="dk-hero__scrim" aria-hidden="true" />
      <div className="dk-hero__scrim dk-hero__scrim--left" aria-hidden="true" />

      <div className="dk-hero__content">
        <p className="dk-kicker">
          <span className="dk-kicker__dash" aria-hidden="true" />
          Ремонт под ключ · Калининград
        </p>
        <h1 className="dk-hero__title" id="dk-hero-title">
          Продуманный ремонт <span>от проекта до заселения</span>
        </h1>
        <p className="dk-hero__lead">
          Берём на себя дизайн, работы и комплектацию. Вы видите понятную смету, ход проекта и результат на каждом этапе.
        </p>

        <div className="dk-hero__actions">
          <a className="dk-btn dk-btn--gold" href="/estimate">
            Рассчитать стоимость
          </a>
          <a className="dk-btn dk-btn--ghost" href="#projects">
            Смотреть объекты
          </a>
        </div>

        <dl className="dk-hero__facts">
          {publicHeroStats.map((fact) => (
            <div className="dk-fact" key={fact.value}>
              <dt className="dk-fact__num">{fact.value}</dt>
              <dd className="dk-fact__label">{fact.label}</dd>
            </div>
          ))}
        </dl>

        <a className="dk-hero__control" href="#platform">
          <span className="dk-hero__control-icon" aria-hidden="true">✓</span>
          <span><small>Весь проект под контролем</small><strong>Сроки, смета и комплектация</strong></span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
