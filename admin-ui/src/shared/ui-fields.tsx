// Базовые form-controls для admin UI.

export function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "default" | "compact";
  tooltip?: string;
}) {
  const labelClassName = props.size === "compact" ? "field-label field-label-compact" : "field-label";
  const inputClassName = props.size === "compact" ? "text-input text-input-compact text-input-select-with-help" : "text-input text-input-select-with-help";

  return (
    <label className="block">
      <FieldLabel className={labelClassName} label={props.label} />
      <div className="field-control-shell">
        <input
          className={inputClassName}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
        />
        <FieldHelp label={props.label} tooltip={props.tooltip} />
      </div>
    </label>
  );
}

export function SelectField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  size?: "default" | "compact";
  tooltip?: string;
}) {
  const labelClassName = props.size === "compact" ? "field-label field-label-compact" : "field-label";
  const inputClassName = props.size === "compact" ? "text-input text-input-compact" : "text-input";

  return (
    <label className="block">
      <FieldLabel className={labelClassName} label={props.label} />
      <div className="field-control-shell">
        <select className={inputClassName} value={props.value} onChange={(event) => props.onChange(event.target.value)}>
          {props.options.map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldHelp label={props.label} tooltip={props.tooltip} />
      </div>
    </label>
  );
}

export function TimeField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "default" | "compact";
  tooltip?: string;
}) {
  const labelClassName = props.size === "compact" ? "field-label field-label-compact" : "field-label";
  const inputClassName = props.size === "compact" ? "text-input text-input-compact" : "text-input";

  return (
    <label className="block">
      <FieldLabel className={labelClassName} label={props.label} />
      <div className="field-control-shell">
        <input
          type="time"
          className={inputClassName}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
        <FieldHelp label={props.label} tooltip={props.tooltip} />
      </div>
    </label>
  );
}

function FieldLabel(props: { className: string; label: string }) {
  return (
    <div className={`${props.className} field-label-row`}>
      <span>{props.label}</span>
    </div>
  );
}

function FieldHelp(props: { label: string; tooltip?: string }) {
  return (
    <span className="field-help-icon field-help-tooltip ui-tooltip-anchor ui-tooltip-end" data-tooltip={props.tooltip ?? defaultFieldTooltip(props.label)} tabIndex={0}>
      ?
    </span>
  );
}

function defaultFieldTooltip(label: string): string {
  return `Что вводить: ${label}. Значение используется в расчете и попадет в смету после сохранения.`;
}
