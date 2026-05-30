import { formatMoney } from "../../estimate/format";
import type { PublicEstimateResult } from "../../public-estimate-model";

export type CostsTotalItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type CostsSectionProps = {
  className: string;
  stepLabel: string;
  estimateTotalItems: CostsTotalItem[];
  estimateResult: PublicEstimateResult;
  onOpenFullSpec: () => void;
};

export function CostsSection({
  className,
  stepLabel,
  estimateTotalItems,
  estimateResult,
  onOpenFullSpec,
}: CostsSectionProps) {
  return (
    <section
      id="estimate-costs"
      className={className}
      aria-labelledby="public-estimate-costs-title"
    >
      <div className="public-estimate-costs-head">
        <div>
          <span>{stepLabel}</span>
          <p className="public-section-kicker">Итоговая смета</p>
          <h2 id="public-estimate-costs-title">Стоимость по разделам</h2>
        </div>
      </div>

      <div className="public-estimate-cost-grid">
        {estimateTotalItems.map((item) => (
          <div className={`public-estimate-cost-cell${item.isStrong ? " public-estimate-cost-cell-total" : ""}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {estimateResult.sections.length > 0 ? (
        <div className="public-estimate-cost-sections" aria-label="Стоимость по разделам">
          <div className="public-estimate-cost-sections-head" aria-hidden="true">
            <span>Раздел</span>
            <span>Сумма ₽</span>
          </div>
          <ul className="public-estimate-cost-sections-list">
            {estimateResult.sections.map((section) => (
              <li className="public-estimate-cost-sections-row" key={section.id}>
                <span>{section.title}</span>
                <strong>{formatMoney(section.totals.total)}</strong>
              </li>
            ))}
            <li className="public-estimate-cost-sections-row public-estimate-cost-sections-row-total">
              <span>Итого по разделам</span>
              <strong>{formatMoney(estimateResult.totals.total)}</strong>
            </li>
          </ul>
        </div>
      ) : (
        <p className="public-estimate-cost-empty">
          Заполните геометрию и выберите разделы — разбивка по разделам появится здесь автоматически.
        </p>
      )}

      {estimateResult.sections.length > 0 ? (
        <button
          className="public-estimate-spec-open public-estimate-spec-open-full"
          type="button"
          onClick={onOpenFullSpec}
        >
          Полная спецификация
          <span className="public-estimate-spec-open-count">все разделы</span>
        </button>
      ) : null}

      <p className="public-estimate-cost-note">
        Сейчас в смету включены тёплый пол, полы, стены, потолки, электрика, сантехника, двери, встроенная
        комплектация, выбранная бытовая техника, выбранная свободная мебель, а также выбранная финишная уборка и
        товары для дома. Следующие разделы подключим отдельно: дополнительные работы и экспорт расчёта.
      </p>
    </section>
  );
}
