import type { CompletionOptionsDraft } from "../../estimate/context";
import { formatMoney } from "../../estimate/format";
import type { estimateNumericFieldProps } from "../../public-estimate-input";
import type { CompletionCalculationResult } from "../../public-estimate-completion";

export type CompletionSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type CompletionSectionProps = {
  className: string;
  stepLabel: string;
  completionOptions: CompletionOptionsDraft;
  completionResult: CompletionCalculationResult;
  completionSummaryItems: CompletionSummaryItem[];
  numberFieldProps: typeof estimateNumericFieldProps;
  onIncludeKitchenBaseChange: (checked: boolean) => void;
  onKitchenLengthMetersChange: (value: string) => void;
  onKitchenLengthMetersBlur: (value: string) => void;
  onIncludeKitchenAppliancePenalChange: (checked: boolean) => void;
  onIncludeKitchenFridgePenalChange: (checked: boolean) => void;
  onIncludeWardrobeChange: (checked: boolean) => void;
  onIncludeBathroomFurnitureChange: (checked: boolean) => void;
  onOpenSectionSpec: () => void;
};

export function CompletionSection({
  className,
  stepLabel,
  completionOptions,
  completionResult,
  completionSummaryItems,
  numberFieldProps,
  onIncludeKitchenBaseChange,
  onKitchenLengthMetersChange,
  onKitchenLengthMetersBlur,
  onIncludeKitchenAppliancePenalChange,
  onIncludeKitchenFridgePenalChange,
  onIncludeWardrobeChange,
  onIncludeBathroomFurnitureChange,
  onOpenSectionSpec,
}: CompletionSectionProps) {
  return (
    <section
      id="estimate-completion"
      className={className}
      aria-labelledby="public-estimate-completion-title"
    >
      <div className="public-estimate-completion-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-completion-title">Комплектация</h2>
          <p>Кухня, пеналы, гардеробная и мебель санузла включаются отдельно.</p>
        </div>
      </div>

      <div className="public-estimate-completion-groups" aria-label="Опции комплектации">
        <div className="public-estimate-completion-group">
          <div className="public-estimate-completion-group-head">
            <div>
              <span>Кухня</span>
              <strong>{formatMoney(completionResult.kitchenTotal)}</strong>
            </div>
            <small>базовая кухня и высокие модули</small>
          </div>

          <label className="public-estimate-completion-option-zone">
            <input
              type="checkbox"
              checked={completionOptions.includeKitchenBase}
              onChange={(event) => onIncludeKitchenBaseChange(event.target.checked)}
            />
            <span>
              <strong>Кухня базовая</strong>
              <small>расчёт по длине в погонных метрах</small>
            </span>
          </label>

          <label className="public-estimate-field public-estimate-completion-length">
            <span>Длина кухни, м.п.</span>
            <input
              className="public-estimate-input"
              inputMode="decimal"
              min="0"
              type="text"
              value={completionOptions.kitchenLengthMeters}
              {...numberFieldProps}
              onChange={(event) => onKitchenLengthMetersChange(event.target.value)}
              onBlur={(event) => onKitchenLengthMetersBlur(event.target.value)}
            />
          </label>

          <label className="public-estimate-completion-option-zone">
            <input
              type="checkbox"
              checked={completionOptions.includeKitchenAppliancePenal}
              onChange={(event) => onIncludeKitchenAppliancePenalChange(event.target.checked)}
            />
            <span>
              <strong>Пенал под технику</strong>
              <small>отдельный высокий модуль под встроенную технику</small>
            </span>
          </label>

          <label className="public-estimate-completion-option-zone">
            <input
              type="checkbox"
              checked={completionOptions.includeKitchenFridgePenal}
              onChange={(event) => onIncludeKitchenFridgePenalChange(event.target.checked)}
            />
            <span>
              <strong>Пенал под холодильник / высокий модуль</strong>
              <small>отдельная опция, не смешивается с базовой кухней</small>
            </span>
          </label>
        </div>

        <div className="public-estimate-completion-group">
          <div className="public-estimate-completion-group-head">
            <div>
              <span>Мебель</span>
              <strong>{formatMoney(completionResult.furnitureTotal)}</strong>
            </div>
            <small>гардеробная и мебель санузла отдельно</small>
          </div>

          <label className="public-estimate-completion-option-zone">
            <input
              type="checkbox"
              checked={completionOptions.includeWardrobe}
              onChange={(event) => onIncludeWardrobeChange(event.target.checked)}
            />
            <span>
              <strong>Гардеробная / шкаф-купе</strong>
              <small>встроенная мебель отдельным компонентом</small>
            </span>
          </label>

          <label className="public-estimate-completion-option-zone">
            <input
              type="checkbox"
              checked={completionOptions.includeBathroomFurniture}
              onChange={(event) => onIncludeBathroomFurnitureChange(event.target.checked)}
            />
            <span>
              <strong>Мебель санузла / пеналы</strong>
              <small>пеналы и встроенная мебель санузла</small>
            </span>
          </label>
        </div>

      </div>

      <div className="public-estimate-completion-summary" aria-label="Итоги по комплектации">
        {completionSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-completion-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {completionResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Кухня, пеналы, гардеробная и мебель санузла</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{completionResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">Включите кухню, мебельные компоненты или технику, чтобы добавить комплектацию в смету.</p>
      )}
    </section>
  );
}
