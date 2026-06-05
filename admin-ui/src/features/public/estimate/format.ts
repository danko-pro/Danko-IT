const DISPLAY_UNIT_ALIASES: Record<string, string> = {
  kg: "кг",
  l: "л",
  liter: "л",
  litre: "л",
  pcs: "шт",
  pc: "шт",
  m2: "м²",
  "m²": "м²",
  m: "м",
  package: "уп.",
  pack: "уп.",
  уп: "уп.",
  "уп.": "уп.",
};

const RAW_CONSUMPTION_NOTE_PATTERN = /^Исходный расход:\s*([\d.,eE+-]+)\s+(.+)$/;

function normalizeDisplayQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded = Math.round(value * 100) / 100;
  const nearestInteger = Math.round(rounded);

  if (Math.abs(rounded - nearestInteger) < 1e-9) {
    return nearestInteger;
  }

  return rounded;
}

export function formatDisplayUnit(unit: string): string {
  const trimmed = unit.trim();

  if (!trimmed) {
    return "уп.";
  }

  const mapped = DISPLAY_UNIT_ALIASES[trimmed.toLowerCase()];

  return mapped ?? trimmed;
}

export function formatDisplayQuantity(value: number): string {
  const normalized = normalizeDisplayQuantity(value);

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: Number.isInteger(normalized) ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(normalized);
}

export function formatPresentationNote(note: string): string {
  const trimmed = note.trim();

  if (!trimmed) {
    return note;
  }

  return trimmed
    .split("; ")
    .map((part) => {
      const match = part.match(RAW_CONSUMPTION_NOTE_PATTERN);

      if (!match) {
        return part;
      }

      const rawQuantity = Number.parseFloat(match[1].replace(",", "."));
      const rawUnit = formatDisplayUnit(match[2].trim());

      if (!Number.isFinite(rawQuantity)) {
        return part;
      }

      return `Исходный расход: ${formatDisplayQuantity(rawQuantity)} ${rawUnit}`;
    })
    .join("; ");
}

export function formatMeasurement(value: number, unit: "м" | "м²" | "м.п.") {
  return `${formatDisplayQuantity(value)} ${unit}`;
}

export function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)} ₽`;
}

export function formatEstimateQuantity(value: number) {
  return formatDisplayQuantity(value);
}
