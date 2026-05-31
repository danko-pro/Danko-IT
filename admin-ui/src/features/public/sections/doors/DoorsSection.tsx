import type { DoorCalculationResult, DoorOptions, DoorPackageType } from "../../public-estimate-doors";

export type DoorCompositionItem = {
  label: string;
  value: string;
};

export type DoorSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type DoorPackageOption = {
  value: DoorPackageType;
  label: string;
};

export type DoorsSectionProps = {
  className: string;
  stepLabel: string;
  doorCompositionItems: DoorCompositionItem[];
  doorSummaryItems: DoorSummaryItem[];
  doorOptions: DoorOptions;
  doorsResult: DoorCalculationResult;
  doorPackageOptions: DoorPackageOption[];
  onPackageTypeChange: (packageType: DoorPackageType) => void;
  onIncludeHandlesChange: (checked: boolean) => void;
  onIncludePrivacyLocksChange: (checked: boolean) => void;
  onIncludeLogisticsChange: (checked: boolean) => void;
  onIncludeInstallationChange: (checked: boolean) => void;
  onOpenSectionSpec: () => void;
};

export function DoorsSection({
  className,
  stepLabel,
  doorCompositionItems,
  doorSummaryItems,
  doorOptions,
  doorsResult,
  doorPackageOptions,
  onPackageTypeChange,
  onIncludeHandlesChange,
  onIncludePrivacyLocksChange,
  onIncludeLogisticsChange,
  onIncludeInstallationChange,
  onOpenSectionSpec,
}: DoorsSectionProps) {
  return (
    <section id="estimate-doors" className={className} aria-labelledby="public-estimate-doors-title">
      <div className="public-estimate-doors-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-doors-title">Двери</h2>
          <p>Предварительный расчёт дверных комплектов, фурнитуры, доставки, подъёма и монтажа.</p>
        </div>
      </div>

      <div className="public-estimate-doors-composition" aria-label="Состав расчёта дверей">
        {doorCompositionItems.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="public-estimate-doors-options" aria-label="Опции дверей">
        <label className="public-estimate-field public-estimate-doors-package">
          <span>Пакет дверей</span>
          <select
            className="public-estimate-select"
            value={doorOptions.packageType}
            onChange={(event) => onPackageTypeChange(event.target.value as DoorPackageType)}
          >
            {doorPackageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="public-estimate-doors-option-zone">
          <input
            type="checkbox"
            checked={doorOptions.includeHandles}
            onChange={(event) => onIncludeHandlesChange(event.target.checked)}
          />
          <span>
            <strong>Ручки</strong>
            <small>по одной ручке на каждый дверной комплект</small>
          </span>
        </label>

        <label className="public-estimate-doors-option-zone">
          <input
            type="checkbox"
            checked={doorOptions.includePrivacyLocks}
            onChange={(event) => onIncludePrivacyLocksChange(event.target.checked)}
          />
          <span>
            <strong>Завертки для санузлов</strong>
            <small>считаются по дверям помещений типа санузел</small>
          </span>
        </label>

        <label className="public-estimate-doors-option-zone">
          <input
            type="checkbox"
            checked={doorOptions.includeLogistics}
            onChange={(event) => onIncludeLogisticsChange(event.target.checked)}
          />
          <span>
            <strong>Доставка и подъём</strong>
            <small>одна доставка и подъём по количеству дверей</small>
          </span>
        </label>

        <label className="public-estimate-doors-option-zone">
          <input
            type="checkbox"
            checked={doorOptions.includeInstallation}
            onChange={(event) => onIncludeInstallationChange(event.target.checked)}
          />
          <span>
            <strong>Монтаж</strong>
            <small>монтаж каждого дверного комплекта</small>
          </span>
        </label>
      </div>

      <div className="public-estimate-doors-summary" aria-label="Итоги по дверям">
        {doorSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-doors-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {doorsResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Дверные комплекты, фурнитура, логистика и монтаж</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{doorsResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">Укажите двери в помещениях, чтобы добавить дверные комплекты в смету.</p>
      )}
    </section>
  );
}
