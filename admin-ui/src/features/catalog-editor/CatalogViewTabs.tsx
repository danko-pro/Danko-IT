export type CatalogViewTabOption<TValue extends string> = {
  value: TValue;
  label: string;
  title?: string;
  disabled?: boolean;
};

export type CatalogViewTabsProps<TValue extends string> = {
  options: readonly CatalogViewTabOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  ariaLabel: string;
};

export function CatalogViewTabs<TValue extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: CatalogViewTabsProps<TValue>) {
  return (
    <div className="ce-subtabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ce-subtab${value === option.value ? " is-active" : ""}`}
          disabled={option.disabled}
          title={option.title}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
