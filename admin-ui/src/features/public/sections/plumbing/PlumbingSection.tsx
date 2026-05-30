import type { ComponentType, ReactNode } from "react";
import type { PlumbingCalculationResult, PlumbingOptions } from "../../public-estimate-plumbing";
import type { PlumbingPackageLevel } from "../../public-estimate-plumbing-zones";

export type PlumbingCompositionItem = {
  label: string;
  value: string;
};

export type PlumbingSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type PlumbingZoneCardProps = {
  ariaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  active: boolean;
  icon: ReactNode;
  label: string;
  total: number;
  packageLevel?: PlumbingPackageLevel;
  packageLabels?: Record<PlumbingPackageLevel, string>;
  onPackageLevelChange?: (level: PlumbingPackageLevel) => void;
  totalAriaLabel: string;
  packageGroupAriaLabel?: string;
};

export type PlumbingSectionProps = {
  className: string;
  stepLabel: string;
  plumbingCompositionItems: PlumbingCompositionItem[];
  plumbingSummaryItems: PlumbingSummaryItem[];
  plumbingOptions: PlumbingOptions;
  plumbingResult: PlumbingCalculationResult;
  kitchenSinkPackageLabels: Record<PlumbingPackageLevel, string>;
  dishwasherPackageLabels: Record<PlumbingPackageLevel, string>;
  showerPackageLabels: Record<PlumbingPackageLevel, string>;
  getKitchenSinkZonePackageTotal: (level: PlumbingPackageLevel) => number;
  getDishwasherZonePackageTotal: (level: PlumbingPackageLevel) => number;
  getShowerZonePackageTotal: (level: PlumbingPackageLevel) => number;
  getInstallRelocationZoneTotal: () => number;
  ZoneCard: ComponentType<PlumbingZoneCardProps>;
  onIncludeBathroomSetChange: (checked: boolean) => void;
  onIncludeBathChange: (checked: boolean) => void;
  onIncludeHygienicShowerChange: (checked: boolean) => void;
  onIncludeElectricTowelRailChange: (checked: boolean) => void;
  onIncludeKitchenSinkChange: (checked: boolean) => void;
  onKitchenSinkPackageLevelChange: (level: PlumbingPackageLevel) => void;
  onIncludeDishwasherOutputChange: (checked: boolean) => void;
  onDishwasherPackageLevelChange: (level: PlumbingPackageLevel) => void;
  onIncludeShowerZoneChange: (checked: boolean) => void;
  onShowerPackageLevelChange: (level: PlumbingPackageLevel) => void;
  onIncludeInstallRelocationChange: (checked: boolean) => void;
  onIncludeWasherOutputChange: (checked: boolean) => void;
  onIncludeWaterNodeChange: (checked: boolean) => void;
  onIncludeLeakProtectionChange: (checked: boolean) => void;
  onOpenSectionSpec: () => void;
};

function KitchenSinkZoneIcon() {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg {...commonProps}>
      <path d="M3 9h18" />
      <path d="M5 9v1.5a7 7 0 0 0 14 0V9" />
      <path d="M12 3v3.5" />
      <path d="M9.5 6.5h5" />
      <path d="M12 6.5v2.25" />
      <circle cx="12" cy="14.25" r="1.1" />
      <path d="M8 18h8" />
    </svg>
  );
}

function DishwasherZoneIcon() {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg {...commonProps}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 10h16" />
      <circle cx="8" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="11" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M8 14h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function ShowerZoneIcon() {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg {...commonProps}>
      <path d="M12 3v3" />
      <path d="M8.5 6h7" />
      <path d="M10 6v1.5a2 2 0 0 0 4 0V6" />
      <path d="M7 12c0 2.8 2.2 5 5 5s5-2.2 5-5" />
      <path d="M9.5 14.5v2" />
      <path d="M12 15v2.5" />
      <path d="M14.5 14.5v2" />
    </svg>
  );
}

function InstallRelocationZoneIcon() {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg {...commonProps}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8h6" />
      <path d="M12 12v5" />
      <path d="M9.5 15.5 12 18l2.5-2.5" />
    </svg>
  );
}

export function PlumbingSection({
  className,
  stepLabel,
  plumbingCompositionItems,
  plumbingSummaryItems,
  plumbingOptions,
  plumbingResult,
  kitchenSinkPackageLabels,
  dishwasherPackageLabels,
  showerPackageLabels,
  getKitchenSinkZonePackageTotal,
  getDishwasherZonePackageTotal,
  getShowerZonePackageTotal,
  getInstallRelocationZoneTotal,
  ZoneCard,
  onIncludeBathroomSetChange,
  onIncludeBathChange,
  onIncludeHygienicShowerChange,
  onIncludeElectricTowelRailChange,
  onIncludeKitchenSinkChange,
  onKitchenSinkPackageLevelChange,
  onIncludeDishwasherOutputChange,
  onDishwasherPackageLevelChange,
  onIncludeShowerZoneChange,
  onShowerPackageLevelChange,
  onIncludeInstallRelocationChange,
  onIncludeWasherOutputChange,
  onIncludeWaterNodeChange,
  onIncludeLeakProtectionChange,
  onOpenSectionSpec,
}: PlumbingSectionProps) {
  return (
    <section id="estimate-plumbing" className={className} aria-labelledby="public-estimate-plumbing-title">
      <div className="public-estimate-plumbing-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-plumbing-title">Сантехника</h2>
          <p>Предварительный расчёт санузла, кухни, выводов под технику и базового сантехнического узла.</p>
        </div>
      </div>

      <div className="public-estimate-plumbing-composition" aria-label="Состав сантехнического расчёта">
        {plumbingCompositionItems.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="public-estimate-plumbing-options" aria-label="Опции сантехники">
        <label className="public-estimate-plumbing-option-zone">
          <input
            type="checkbox"
            checked={plumbingOptions.includeBathroomSet}
            onChange={(event) => onIncludeBathroomSetChange(event.target.checked)}
          />
          <span>
            <strong>Санузел: тумба, смеситель, инсталляция</strong>
            <small>комплект базовых приборов на каждый санузел</small>
          </span>
        </label>

        <label className="public-estimate-plumbing-option-zone">
          <input
            type="checkbox"
            checked={plumbingOptions.includeBath}
            onChange={(event) => onIncludeBathChange(event.target.checked)}
          />
          <span>
            <strong>Ванна со смесителем</strong>
            <small>акриловая ванна, сифон и смеситель с лейкой</small>
          </span>
        </label>

        <label className="public-estimate-plumbing-option-zone">
          <input
            type="checkbox"
            checked={plumbingOptions.includeHygienicShower}
            onChange={(event) => onIncludeHygienicShowerChange(event.target.checked)}
          />
          <span>
            <strong>Гигиенический душ</strong>
            <small>выводы и подключение в санузле</small>
          </span>
        </label>

        <label className="public-estimate-plumbing-option-zone">
          <input
            type="checkbox"
            checked={plumbingOptions.includeElectricTowelRail}
            onChange={(event) => onIncludeElectricTowelRailChange(event.target.checked)}
          />
          <span>
            <strong>Электрический полотенцесушитель</strong>
            <small>монтаж и подключение к электрике</small>
          </span>
        </label>

        <ZoneCard
          ariaLabel="Зона мойки"
          checked={plumbingOptions.includeKitchenSink}
          onCheckedChange={onIncludeKitchenSinkChange}
          active={plumbingResult.hasKitchen && plumbingOptions.includeKitchenSink}
          icon={<KitchenSinkZoneIcon />}
          label="Зона мойки"
          packageLevel={plumbingOptions.kitchenSinkPackageLevel}
          packageLabels={kitchenSinkPackageLabels}
          onPackageLevelChange={onKitchenSinkPackageLevelChange}
          total={getKitchenSinkZonePackageTotal(plumbingOptions.kitchenSinkPackageLevel)}
          totalAriaLabel="Итог зоны мойки"
          packageGroupAriaLabel="Пакет зоны мойки"
        />

        <ZoneCard
          ariaLabel="Зона ПММ"
          checked={plumbingOptions.includeDishwasherOutput}
          onCheckedChange={onIncludeDishwasherOutputChange}
          active={plumbingResult.hasKitchen && plumbingOptions.includeDishwasherOutput}
          icon={<DishwasherZoneIcon />}
          label="Зона ПММ"
          packageLevel={plumbingOptions.dishwasherPackageLevel}
          packageLabels={dishwasherPackageLabels}
          onPackageLevelChange={onDishwasherPackageLevelChange}
          total={getDishwasherZonePackageTotal(plumbingOptions.dishwasherPackageLevel)}
          totalAriaLabel="Итог зоны ПММ"
          packageGroupAriaLabel="Пакет зоны ПММ"
        />

        <ZoneCard
          ariaLabel="Душевая зона"
          checked={plumbingOptions.includeShowerZone}
          onCheckedChange={onIncludeShowerZoneChange}
          active={plumbingResult.bathroomCount > 0 && plumbingOptions.includeShowerZone}
          icon={<ShowerZoneIcon />}
          label="Душевая зона"
          packageLevel={plumbingOptions.showerPackageLevel}
          packageLabels={showerPackageLabels}
          onPackageLevelChange={onShowerPackageLevelChange}
          total={getShowerZonePackageTotal(plumbingOptions.showerPackageLevel)}
          totalAriaLabel="Итог душевой зоны"
          packageGroupAriaLabel="Пакет душевой зоны"
        />

        <ZoneCard
          ariaLabel="Перенос инсталляции"
          checked={plumbingOptions.includeInstallRelocation}
          onCheckedChange={onIncludeInstallRelocationChange}
          active={plumbingResult.bathroomCount > 0 && plumbingOptions.includeInstallRelocation}
          icon={<InstallRelocationZoneIcon />}
          label="Перенос инсталляции"
          total={getInstallRelocationZoneTotal()}
          totalAriaLabel="Итог переноса инсталляции"
        />

        <label className="public-estimate-plumbing-option-zone">
          <input
            type="checkbox"
            checked={plumbingOptions.includeWasherOutput}
            onChange={(event) => onIncludeWasherOutputChange(event.target.checked)}
          />
          <span>
            <strong>Вывод под стиральную машину</strong>
            <small>выводы под стиральную и сушильную машину</small>
          </span>
        </label>

        <label className="public-estimate-plumbing-option-zone">
          <input
            type="checkbox"
            checked={plumbingOptions.includeWaterNode}
            onChange={(event) => onIncludeWaterNodeChange(event.target.checked)}
          />
          <span>
            <strong>Коллектор, фильтры и отсечные краны</strong>
            <small>базовый сантехнический узел объекта</small>
          </span>
        </label>

        <label className="public-estimate-plumbing-option-zone public-estimate-plumbing-option-zone-wide">
          <input
            type="checkbox"
            checked={plumbingOptions.includeLeakProtection}
            onChange={(event) => onIncludeLeakProtectionChange(event.target.checked)}
          />
          <span>
            <strong>Система защиты от протечек</strong>
            <small>датчики и перекрытие воды, опционально</small>
          </span>
        </label>
      </div>

      <div className="public-estimate-plumbing-summary" aria-label="Итоги по сантехнике">
        {plumbingSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-plumbing-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {plumbingResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Санузел, кухня, выводы под технику и сантехнический узел</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{plumbingResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">
          Добавьте санузел, кухню или вывод под технику, чтобы включить сантехнику в смету.
        </p>
      )}
    </section>
  );
}
