import { formatMeasurement, formatMoney } from "../../estimate/format";
import {
  cleaningRatePerM2,
  homeGoodsPackageLabels,
  homeGoodsPackageRates,
  type HomeGoodsCalculationResult,
  type HomeGoodsOptions,
  type HomeGoodsPackageLevel,
} from "../../public-estimate-home-goods";

export type HomeGoodsSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type HomeGoodsSectionProps = {
  className: string;
  stepLabel: string;
  floorArea: number;
  homeGoodsOptions: HomeGoodsOptions;
  homeGoodsSummaryItems: HomeGoodsSummaryItem[];
  homeGoodsResult: HomeGoodsCalculationResult;
  onIncludeCleaningChange: (checked: boolean) => void;
  onIncludeHomeGoodsChange: (checked: boolean) => void;
  onPackageLevelChange: (level: HomeGoodsPackageLevel) => void;
  onOpenSectionSpec: () => void;
};

export function HomeGoodsSection({
  className,
  stepLabel,
  floorArea,
  homeGoodsOptions,
  homeGoodsSummaryItems,
  homeGoodsResult,
  onIncludeCleaningChange,
  onIncludeHomeGoodsChange,
  onPackageLevelChange,
  onOpenSectionSpec,
}: HomeGoodsSectionProps) {
  return (
    <section
      id="estimate-home-goods"
      className={className}
      aria-labelledby="public-estimate-home-goods-title"
    >
      <div className="public-estimate-home-goods-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-home-goods-title">Уборка и товары для дома</h2>
          <p>
            Финишная уборка считается по площади пола, а комплект товаров для дома — фиксированным пакетом C / B /
            A.
          </p>
        </div>
      </div>

      <div className="public-estimate-home-goods-cards" aria-label="Опции уборки и товаров для дома">
        <article className="public-estimate-home-goods-card">
          <label className="public-estimate-home-goods-card-head">
            <input
              type="checkbox"
              checked={homeGoodsOptions.includeCleaning}
              onChange={(event) => onIncludeCleaningChange(event.target.checked)}
            />
            <span className="public-estimate-home-goods-card-title">Финишная уборка</span>
          </label>
          <div className="public-estimate-home-goods-card-body">
            <div className="public-estimate-home-goods-metric">
              <span className="public-estimate-mobile-label">Площадь</span>
              <span>Площадь</span>
              <strong>{formatMeasurement(floorArea, "м²")}</strong>
            </div>
            <div className="public-estimate-home-goods-metric">
              <span className="public-estimate-mobile-label">Ставка</span>
              <span>Ставка</span>
              <strong>{formatMoney(cleaningRatePerM2)}/м²</strong>
            </div>
            <div className="public-estimate-home-goods-metric public-estimate-home-goods-metric-total">
              <span className="public-estimate-mobile-label">Итого</span>
              <span>Итого</span>
              <strong>{formatMoney(homeGoodsResult.cleaningTotal)}</strong>
            </div>
          </div>
        </article>

        <article className="public-estimate-home-goods-card">
          <label className="public-estimate-home-goods-card-head">
            <input
              type="checkbox"
              checked={homeGoodsOptions.includeHomeGoods}
              onChange={(event) => onIncludeHomeGoodsChange(event.target.checked)}
            />
            <span className="public-estimate-home-goods-card-title">Товары для дома</span>
          </label>
          <div className="public-estimate-home-goods-card-body">
            <div className="public-estimate-home-goods-package" aria-label="Пакет товаров для дома">
              <span className="public-estimate-mobile-label">Пакет</span>
              <span>Пакет</span>
              <div
                className="public-estimate-toggle-group public-estimate-home-goods-toggle-group"
                role="group"
                aria-label="Пакет товаров для дома"
              >
                {(["c", "b", "a"] as HomeGoodsPackageLevel[]).map((level) => (
                  <button
                    key={level}
                    className={
                      homeGoodsOptions.packageLevel === level ? "public-estimate-toggle-active" : undefined
                    }
                    type="button"
                    aria-pressed={homeGoodsOptions.packageLevel === level}
                    onClick={() => onPackageLevelChange(level)}
                  >
                    {homeGoodsPackageLabels[level]}
                  </button>
                ))}
              </div>
            </div>
            <div className="public-estimate-home-goods-metric">
              <span className="public-estimate-mobile-label">Стоимость пакета</span>
              <span>Стоимость пакета</span>
              <strong>{formatMoney(homeGoodsPackageRates[homeGoodsOptions.packageLevel])}</strong>
            </div>
            <div className="public-estimate-home-goods-metric public-estimate-home-goods-metric-total">
              <span className="public-estimate-mobile-label">Итого</span>
              <span>Итого</span>
              <strong>{formatMoney(homeGoodsResult.homeGoodsTotal)}</strong>
            </div>
          </div>
        </article>
      </div>

      <div className="public-estimate-home-goods-summary" aria-label="Итоги по уборке и товарам для дома">
        {homeGoodsSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-home-goods-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {homeGoodsResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Финишная уборка и комплект товаров для дома</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{homeGoodsResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">
          Включите финишную уборку или комплект товаров для дома, чтобы добавить их в смету.
        </p>
      )}
    </section>
  );
}
