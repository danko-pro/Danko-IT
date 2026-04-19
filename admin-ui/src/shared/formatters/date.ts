/**
 * Общие date/time formatter'ы для admin UI.
 * Здесь собрана безопасная нормализация ISO- и date-only строк в русском формате.
 */
export function formatDateTimeRu(value: string | null | undefined, emptyLabel = "—"): string {
  if (!value) {
    return emptyLabel;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function formatDateRu(value: string | null | undefined, emptyLabel = "—"): string {
  if (!value) {
    return emptyLabel;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("ru-RU");
    }
  }

  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  return value;
}
