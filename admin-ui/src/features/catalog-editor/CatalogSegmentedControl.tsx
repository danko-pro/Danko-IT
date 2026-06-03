export type CatalogSegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
  title?: string;
  disabled?: boolean;
};

export type CatalogSegmentedControlProps<TValue extends string> = {
  options: readonly CatalogSegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  ariaLabel: string;
  className?: string;
};

export function CatalogSegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: CatalogSegmentedControlProps<TValue>) {
  return (
    <div className={`ce-segmented-control${className ? ` ${className}` : ""}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ce-segmented-option${value === option.value ? " is-active" : ""}`}
          disabled={option.disabled}
          title={option.title}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
