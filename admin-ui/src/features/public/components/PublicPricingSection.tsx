import { useState } from "react";

import { publicRepairPackages } from "../public-content";
import { PublicPricingCards } from "./pricing/PublicPricingCards";

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

      <PublicPricingCards
        packages={publicRepairPackages}
        activePackageIndex={activePackageIndex}
        onPackageActivate={setActivePackageIndex}
      />

      <p className="public-package-note">
        Ориентиры приведены для предварительной оценки. Точный расчёт зависит от площади,
        состояния объекта, состава работ, выбранных материалов, мебели и техники.
      </p>
    </>
  );
}
