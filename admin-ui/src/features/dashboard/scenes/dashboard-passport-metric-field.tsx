import { useEffect, useState } from "react";

import type { MetricInputMode } from "./dashboard-passport-section-types";

type PassportMetricFieldProps = {
  label: string;
  value: number;
  suffix?: string;
  mode?: MetricInputMode;
  className?: string;
  setValue: (nextValue: number) => void;
};

function formatMetricValue(value: number, mode: MetricInputMode) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0001) {
    return "0";
  }

  if (mode === "integer") {
    return String(Math.trunc(value));
  }

  return String(value).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function parseMetricValue(rawValue: string, mode: MetricInputMode) {
  const normalizedValue = rawValue.replace(",", ".").trim();
  if (!normalizedValue) {
    return 0;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  if (mode === "integer" && !Number.isInteger(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export function DashboardPassportMetricField(props: PassportMetricFieldProps) {
  const { label, value, suffix, mode = "decimal", className, setValue } = props;
  const [inputValue, setInputValue] = useState(() => formatMetricValue(value, mode));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatMetricValue(value, mode));
    }
  }, [isFocused, mode, value]);

  function commitValue(nextRawValue: string) {
    const parsedValue = parseMetricValue(nextRawValue, mode);
    if (parsedValue === null) {
      setInputValue(formatMetricValue(value, mode));
      return;
    }

    setValue(parsedValue);
    setInputValue(formatMetricValue(parsedValue, mode));
  }

  const resolvedClassName = ["dashboard-passport-input", "dashboard-passport-input-metrics", className]
    .filter(Boolean)
    .join(" ");

  return (
    <label className="dashboard-passport-field">
      <span className="dashboard-passport-label">{label}</span>
      <input
        type="text"
        inputMode={mode === "integer" ? "numeric" : "decimal"}
        className={resolvedClassName}
        value={isFocused ? inputValue : `${formatMetricValue(value, mode)}${suffix ? ` ${suffix}` : ""}`}
        onFocus={() => {
          setIsFocused(true);
          if (Math.abs(value) < 0.0001) {
            setInputValue("");
            return;
          }

          setInputValue(formatMetricValue(value, mode));
        }}
        onBlur={() => {
          setIsFocused(false);
          commitValue(inputValue);
        }}
        onChange={(event) => {
          const nextRawValue = event.target.value.replace(",", ".");
          setInputValue(nextRawValue);

          const parsedValue = parseMetricValue(nextRawValue, mode);
          if (parsedValue !== null) {
            setValue(parsedValue);
          }
        }}
      />
    </label>
  );
}
