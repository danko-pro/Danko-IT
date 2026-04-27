// Базовые form-controls для admin UI.

export function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "default" | "compact";
}) {
  const labelClassName = props.size === "compact" ? "field-label field-label-compact" : "field-label";
  const inputClassName = props.size === "compact" ? "text-input text-input-compact" : "text-input";

  return (
    <label className="block">
      <div className={labelClassName}>{props.label}</div>
      <input
        className={inputClassName}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
      />
    </label>
  );
}

export function SelectField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  size?: "default" | "compact";
}) {
  const labelClassName = props.size === "compact" ? "field-label field-label-compact" : "field-label";
  const inputClassName = props.size === "compact" ? "text-input text-input-compact" : "text-input";

  return (
    <label className="block">
      <div className={labelClassName}>{props.label}</div>
      <select className={inputClassName} value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TimeField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "default" | "compact";
}) {
  const labelClassName = props.size === "compact" ? "field-label field-label-compact" : "field-label";
  const inputClassName = props.size === "compact" ? "text-input text-input-compact" : "text-input";

  return (
    <label className="block">
      <div className={labelClassName}>{props.label}</div>
      <input
        type="time"
        className={inputClassName}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
