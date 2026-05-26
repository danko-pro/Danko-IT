import { useState } from "react";

import { publicRepairPackages } from "../public-content";

export function PublicPricingSection() {
  const [activePackageIndex, setActivePackageIndex] = useState(0);

  return (
    <>
      <div className="public-projects-head">
        <div className="public-section-heading">
          <p className="public-section-kicker">Форматы и стоимость</p>
          <h2 id="public-projects-title">
            Типы ремонта и цены <span className="public-nowrap">за м²</span>
          </h2>
          <p>
            Считаем ремонт по составу работ, материалов, мебели, техники и логистики. Клиент
            заранее видит формат, наполнение и порядок бюджета.
          </p>
        </div>
        <span className="public-projects-badge">A / B / C пакеты</span>
      </div>

      <div className="public-package-grid" aria-label="Пакеты ремонта">
        {publicRepairPackages.map((repairPackage, index) => {
          const isActive = activePackageIndex === index;

          return (
            <article
              className={`public-package-card${isActive ? " public-package-card-active" : ""}${
                repairPackage.isFeatured ? " public-package-card-featured" : ""
              }`}
              key={repairPackage.name}
              tabIndex={0}
              onMouseEnter={() => setActivePackageIndex(index)}
              onFocus={() => setActivePackageIndex(index)}
              onClick={() => setActivePackageIndex(index)}
            >
              <div className="public-package-card-header">
                <div>
                  <p className="public-package-name">{repairPackage.name}</p>
                  <h3>{repairPackage.subtitle}</h3>
                </div>
                <span className="public-package-mark" aria-hidden="true">
                  {repairPackage.name.replace("Пакет ", "")}
                </span>
              </div>

              <p className="public-package-description">{repairPackage.description}</p>

              <div className="public-package-price-block">
                <strong>{repairPackage.price}</strong>
                <span>расчётный ориентир: {repairPackage.exactPrice}</span>
                <em>{repairPackage.totalExample}</em>
              </div>

              {(repairPackage.badge || repairPackage.metric) && (
                <div className="public-package-highlights" aria-label="Особенности пакета">
                  {repairPackage.badge && <span>{repairPackage.badge}</span>}
                  {repairPackage.metric && <strong>{repairPackage.metric}</strong>}
                </div>
              )}

              <ul className="public-package-items">
                {repairPackage.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <p className="public-package-note">
        Ориентиры приведены для предварительной оценки. Точный расчёт зависит от площади,
        состояния объекта, состава работ, выбранных материалов, мебели и техники.
      </p>
    </>
  );
}
