import type { AppliancesOptionsDraft } from "../../estimate/context";
import { formatMoney } from "../../estimate/format";
import type { estimateNumericFieldProps } from "../../public-estimate-input";
import {
  applianceItemCatalog,
  appliancePackageLabels,
  fridgeVariantLabels,
  type ApplianceItemKey,
  type AppliancePackageLevel,
  type AppliancesCalculationResult,
  type FridgeVariant,
} from "../../public-estimate-appliances";

export type AppliancesSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type AppliancesSectionProps = {
  className: string;
  stepLabel: string;
  appliancesOptions: AppliancesOptionsDraft;
  appliancesSummaryItems: AppliancesSummaryItem[];
  appliancesResult: AppliancesCalculationResult;
  numberFieldProps: typeof estimateNumericFieldProps;
  getUnitPrice: (key: ApplianceItemKey) => number;
  getLineTotal: (key: ApplianceItemKey, isIncluded: boolean, quantity: string) => number;
  onPackageLevelChange: (level: AppliancePackageLevel) => void;
  onFridgeVariantChange: (variant: FridgeVariant) => void;
  onApplianceIncludeChange: (key: ApplianceItemKey, checked: boolean) => void;
  onQuantityChange: (key: ApplianceItemKey, value: string) => void;
  onQuantityBlur: (key: ApplianceItemKey, value: string) => void;
  onOpenSectionSpec: () => void;
};

export function AppliancesSection({
  className,
  stepLabel,
  appliancesOptions,
  appliancesSummaryItems,
  appliancesResult,
  numberFieldProps,
  getUnitPrice,
  getLineTotal,
  onPackageLevelChange,
  onFridgeVariantChange,
  onApplianceIncludeChange,
  onQuantityChange,
  onQuantityBlur,
  onOpenSectionSpec,
}: AppliancesSectionProps) {
  return (
    <section
      id="estimate-appliances"
      className={className}
      aria-labelledby="public-estimate-appliances-title"
    >
      <div className="public-estimate-appliances-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-appliances-title">Бытовая техника</h2>
          <p>Техника выбирается по позициям, а уровень цены задаётся пакетом C / B / A.</p>
        </div>
      </div>

      <div className="public-estimate-appliances-package" aria-label="Пакет техники">
        <div className="public-estimate-appliances-package-copy">
          <span>Пакет техники</span>
          <small>
            Модели и бренды уточняются при финальной комплектации. Сейчас расчёт показывает публичный ориентир по
            классу техники.
          </small>
        </div>
        <div className="public-estimate-toggle-group public-estimate-appliances-toggle-group" role="group" aria-label="Пакет техники">
          {(["c", "b", "a"] as AppliancePackageLevel[]).map((level) => (
            <button
              key={level}
              className={appliancesOptions.packageLevel === level ? "public-estimate-toggle-active" : undefined}
              type="button"
              aria-pressed={appliancesOptions.packageLevel === level}
              onClick={() => onPackageLevelChange(level)}
            >
              {appliancePackageLabels[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="public-estimate-appliances-header" aria-hidden="true">
        <span>Включить</span>
        <span>Позиция</span>
        <span>Вариант</span>
        <span>Кол-во</span>
        <span>Цена за ед.</span>
        <span>Итого</span>
      </div>

      <div className="public-estimate-appliances-list" aria-label="Позиции бытовой техники">
        {applianceItemCatalog.map((catalogItem) => {
          const itemDraft = appliancesOptions.items[catalogItem.key];
          const isIncluded = itemDraft.isIncluded;
          const quantity = itemDraft.quantity;
          const unitPrice = getUnitPrice(catalogItem.key);
          const lineTotal = getLineTotal(catalogItem.key, isIncluded, quantity);

          return (
            <article className="public-estimate-appliances-row" key={catalogItem.key}>
              <label className="public-estimate-appliances-include">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(event) => onApplianceIncludeChange(catalogItem.key, event.target.checked)}
                />
                <span className="public-estimate-mobile-label">Включить</span>
              </label>

              <div className="public-estimate-appliances-title-cell">
                <span className="public-estimate-mobile-label">Позиция</span>
                <strong>{catalogItem.title}</strong>
                {catalogItem.note ? <small>{catalogItem.note}</small> : null}
              </div>

              <div className="public-estimate-appliances-variant-cell">
                <span className="public-estimate-mobile-label">Вариант</span>
                {catalogItem.key === "fridge" ? (
                  <select
                    className="public-estimate-select"
                    value={appliancesOptions.fridgeVariant}
                    disabled={!isIncluded}
                    onChange={(event) => onFridgeVariantChange(event.target.value as FridgeVariant)}
                  >
                    {(Object.keys(fridgeVariantLabels) as FridgeVariant[]).map((variant) => (
                      <option key={variant} value={variant}>
                        {fridgeVariantLabels[variant]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="public-estimate-appliances-variant-placeholder">—</span>
                )}
              </div>

              <label className="public-estimate-appliances-quantity">
                <span className="public-estimate-mobile-label">Кол-во</span>
                <input
                  className="public-estimate-input"
                  disabled={!isIncluded}
                  inputMode="numeric"
                  type="text"
                  value={quantity}
                  {...numberFieldProps}
                  onChange={(event) => onQuantityChange(catalogItem.key, event.target.value)}
                  onBlur={(event) => onQuantityBlur(catalogItem.key, event.target.value)}
                />
              </label>

              <div className="public-estimate-appliances-unit-price">
                <span className="public-estimate-mobile-label">Цена за ед.</span>
                <strong>{formatMoney(unitPrice)}</strong>
              </div>

              <div className="public-estimate-appliances-line-total">
                <span className="public-estimate-mobile-label">Итого</span>
                <strong>{formatMoney(lineTotal)}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-appliances-summary" aria-label="Итоги по бытовой технике">
        {appliancesSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-appliances-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {appliancesResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Бытовая техника по выбранному пакету</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{appliancesResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">
          Включите нужные позиции техники, чтобы добавить их в смету.
        </p>
      )}
    </section>
  );
}
