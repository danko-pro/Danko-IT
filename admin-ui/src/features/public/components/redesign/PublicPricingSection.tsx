import { publicRepairPackages } from "../../public-content";

export function PublicPricingSection() {
  return (
    <section className="dk-section dk-section--paper dk-pricing dk-reveal" id="pricing" aria-labelledby="dk-pricing-title">
      <div className="dk-wrap">
        <div className="dk-head">
          <div>
            <p className="dk-section-kicker">Форматы и стоимость</p>
            <h2 className="dk-section-title" id="dk-pricing-title">
              Типы ремонта и цены за&nbsp;м²
            </h2>
          </div>
          <span className="dk-pill">A / B / C пакеты</span>
        </div>

        <div className="dk-pricing__grid">
          {publicRepairPackages.map((repairPackage) => (
            <article
              key={repairPackage.name}
              className={`dk-pack${repairPackage.isFeatured ? " dk-pack--featured" : ""}`}
            >
              <div className="dk-pack__head">
                <div>
                  <p className="dk-pack__name">{repairPackage.name}</p>
                  <h3 className="dk-pack__subtitle">{repairPackage.subtitle}</h3>
                </div>
                <span className="dk-pack__mark">{repairPackage.name.replace("Пакет ", "")}</span>
              </div>

              <p className="dk-pack__desc">{repairPackage.description}</p>

              <div className="dk-pack__price-block">
                <div className="dk-pack__price">{repairPackage.price}</div>
                <div className="dk-pack__total">{repairPackage.totalExample}</div>
              </div>

              {repairPackage.badge ? <span className="dk-pack__badge">{repairPackage.badge}</span> : null}

              <ul className="dk-pack__items">
                {repairPackage.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <a className="dk-pack__cta" href="#contacts">
                Выбрать формат
              </a>
            </article>
          ))}
        </div>

        <p className="dk-pricing__note">
          Ориентиры для предварительной оценки. Точный расчёт зависит от площади, состояния объекта, состава
          работ, материалов, мебели и техники.
        </p>
      </div>
    </section>
  );
}
