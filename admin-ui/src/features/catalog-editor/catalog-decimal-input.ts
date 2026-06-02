/**
 * Десятичный ввод в каталоге полов: черновая строка при наборе, число — на blur/commit.
 */

export function sanitizeCatalogDecimalInput(value: string): string {
  const filtered = value.replace(/[^\d.,]/g, "");
  const firstSeparatorIndex = filtered.search(/[.,]/);

  if (firstSeparatorIndex === -1) {
    return filtered;
  }

  const separator = filtered[firstSeparatorIndex];
  const integerPart = filtered.slice(0, firstSeparatorIndex).replace(/[.,]/g, "");
  const fractionPart = filtered.slice(firstSeparatorIndex + 1).replace(/[.,]/g, "");

  return `${integerPart}${separator}${fractionPart}`;
}

export function parseCatalogDecimal(value: string): number {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "" || trimmed === ".") {
    return 0;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function parseCatalogDecimalOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "," || trimmed === ".") {
    return null;
  }
  const parsed = parseCatalogDecimal(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDraftNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return String(Math.round(value * 1000) / 1000);
}

/** Строка для отображения вне фокуса; явный 0 → «0», null/undefined → пусто. */
export function formatCatalogDecimalDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value === 0) {
    return "0";
  }
  return formatDraftNumber(value);
}

export function normalizeCatalogDecimalOnBlur(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "," || trimmed === ".") {
    return "";
  }
  return formatCatalogDecimalDisplay(parseCatalogDecimal(trimmed));
}

/** true, если после sanitize строка — допустимый черновик для commit (не «abc»). */
export function isCatalogDecimalCommitValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "," || trimmed === ".") {
    return true;
  }
  const sanitized = sanitizeCatalogDecimalInput(trimmed);
  if (sanitized === "") {
    return false;
  }
  const normalized = sanitized.replace(",", ".");
  return /^\d*\.?\d*$/.test(normalized) && normalized !== ".";
}
