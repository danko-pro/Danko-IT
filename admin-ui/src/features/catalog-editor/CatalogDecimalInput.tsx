import { useEffect, useState, type InputHTMLAttributes } from "react";

import {
  formatCatalogDecimalDisplay,
  isCatalogDecimalCommitValid,
  normalizeCatalogDecimalOnBlur,
  parseCatalogDecimal,
  parseCatalogDecimalOrNull,
  sanitizeCatalogDecimalInput,
} from "./catalog-decimal-input";

type CatalogDecimalInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "inputMode"> & {
  value: number | null | undefined;
  onCommit: (value: number | null) => void;
  /** Пустой blur → null вместо 0 (packageSize, layerMm). */
  nullable?: boolean;
};

export function CatalogDecimalInput({
  value,
  onCommit,
  nullable = false,
  className,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}: CatalogDecimalInputProps) {
  const [localValue, setLocalValue] = useState(() => formatCatalogDecimalDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setLocalValue(formatCatalogDecimalDisplay(value));
    }
  }, [focused, value]);

  function commitFromString(raw: string) {
    if (!isCatalogDecimalCommitValid(raw)) {
      setLocalValue(formatCatalogDecimalDisplay(value));
      return;
    }

    if (nullable) {
      const parsed = parseCatalogDecimalOrNull(raw);
      onCommit(parsed);
      setLocalValue(parsed === null ? "" : formatCatalogDecimalDisplay(parsed));
      return;
    }

    const parsed = parseCatalogDecimal(raw);
    onCommit(parsed);
    setLocalValue(normalizeCatalogDecimalOnBlur(raw) || formatCatalogDecimalDisplay(parsed));
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className}
      value={localValue}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => {
        setLocalValue(sanitizeCatalogDecimalInput(event.target.value));
      }}
      onBlur={(event) => {
        setFocused(false);
        commitFromString(localValue);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
    />
  );
}
