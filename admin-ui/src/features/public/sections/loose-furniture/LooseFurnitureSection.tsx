import type { LooseFurnitureOptionsDraft } from "../../estimate/context";
import { formatMoney } from "../../estimate/format";
import type { estimateNumericFieldProps } from "../../public-estimate-input";
import {
  looseFurnitureGroupLabels,
  looseFurnitureItemCatalog,
  looseFurniturePackageLabels,
  type LooseFurnitureCalculationResult,
  type LooseFurnitureItemKey,
  type LooseFurniturePackageLevel,
} from "../../public-estimate-loose-furniture";

export type LooseFurnitureSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type LooseFurnitureSectionProps = {
  className: string;
  stepLabel: string;
  looseFurnitureOptions: LooseFurnitureOptionsDraft;
  looseFurnitureSummaryItems: LooseFurnitureSummaryItem[];
  looseFurnitureResult: LooseFurnitureCalculationResult;
  numberFieldProps: typeof estimateNumericFieldProps;
  getUnitPrice: (key: LooseFurnitureItemKey) => number;
  getLineTotal: (key: LooseFurnitureItemKey, isIncluded: boolean, quantity: string) => number;
  onPackageLevelChange: (level: LooseFurniturePackageLevel) => void;
  onLooseFurnitureIncludeChange: (key: LooseFurnitureItemKey, checked: boolean) => void;
  onQuantityChange: (key: LooseFurnitureItemKey, value: string) => void;
  onQuantityBlur: (key: LooseFurnitureItemKey, value: string) => void;
  onOpenSectionSpec: () => void;
};

export function LooseFurnitureSection({
  className,
  stepLabel,
  looseFurnitureOptions,
  looseFurnitureSummaryItems,
  looseFurnitureResult,
  numberFieldProps,
  getUnitPrice,
  getLineTotal,
  onPackageLevelChange,
  onLooseFurnitureIncludeChange,
  onQuantityChange,
  onQuantityBlur,
  onOpenSectionSpec,
}: LooseFurnitureSectionProps) {
  return (
    <section
      id="estimate-loose-furniture"
      className={className}
      aria-labelledby="public-estimate-loose-furniture-title"
    >
      <div className="public-estimate-loose-furniture-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-loose-furniture-title">Свободная мебель</h2>
          <p>Мебель выбирается по позициям, а уровень цены задаётся пакетом C / B / A.</p>
        </div>
      </div>

      <div className="public-estimate-loose-furniture-package" aria-label="Пакет мебели">
        <div className="public-estimate-loose-furniture-package-copy">
          <span>Пакет мебели</span>
          <small>
            Модели и бренды уточняются при финальной комплектации. Сейчас расчёт показывает публичный ориентир по
            классу мебели.
          </small>
        </div>
        <div
          className="public-estimate-toggle-group public-estimate-loose-furniture-toggle-group"
          role="group"
          aria-label="Пакет мебели"
        >
          {(["c", "b", "a"] as LooseFurniturePackageLevel[]).map((level) => (
            <button
              key={level}
              className={
                looseFurnitureOptions.packageLevel === level ? "public-estimate-toggle-active" : undefined
              }
              type="button"
              aria-pressed={looseFurnitureOptions.packageLevel === level}
              onClick={() => onPackageLevelChange(level)}
            >
              {looseFurniturePackageLabels[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="public-estimate-loose-furniture-header" aria-hidden="true">
        <span>Включить</span>
        <span>Позиция</span>
        <span>Группа</span>
        <span>Кол-во</span>
        <span>Цена за ед.</span>
        <span>Итого</span>
      </div>

      <div className="public-estimate-loose-furniture-list" aria-label="Позиции свободной мебели">
        {looseFurnitureItemCatalog.map((catalogItem) => {
          const itemDraft = looseFurnitureOptions.items[catalogItem.key];
          const isIncluded = itemDraft.isIncluded;
          const quantity = itemDraft.quantity;
          const unitPrice = getUnitPrice(catalogItem.key);
          const lineTotal = getLineTotal(catalogItem.key, isIncluded, quantity);

          return (
            <article className="public-estimate-loose-furniture-row" key={catalogItem.key}>
              <label className="public-estimate-loose-furniture-include">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(event) => onLooseFurnitureIncludeChange(catalogItem.key, event.target.checked)}
                />
                <span className="public-estimate-mobile-label">Включить</span>
              </label>

              <div className="public-estimate-loose-furniture-title-cell">
                <span className="public-estimate-mobile-label">Позиция</span>
                <strong>{catalogItem.title}</strong>
              </div>

              <div className="public-estimate-loose-furniture-group-cell">
                <span className="public-estimate-mobile-label">Группа</span>
                <strong>{looseFurnitureGroupLabels[catalogItem.group]}</strong>
              </div>

              <label className="public-estimate-loose-furniture-quantity">
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

              <div className="public-estimate-loose-furniture-unit-price">
                <span className="public-estimate-mobile-label">Цена за ед.</span>
                <strong>{formatMoney(unitPrice)}</strong>
              </div>

              <div className="public-estimate-loose-furniture-line-total">
                <span className="public-estimate-mobile-label">Итого</span>
                <strong>{formatMoney(lineTotal)}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-loose-furniture-summary" aria-label="Итоги по свободной мебели">
        {looseFurnitureSummaryItems.map((item) => (
          <div
            className={item.isStrong ? "public-estimate-loose-furniture-total-cell" : undefined}
            key={item.label}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {looseFurnitureResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Свободная мебель по выбранному пакету</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{looseFurnitureResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">
          Включите нужные позиции мебели, чтобы добавить их в смету.
        </p>
      )}
    </section>
  );
}
