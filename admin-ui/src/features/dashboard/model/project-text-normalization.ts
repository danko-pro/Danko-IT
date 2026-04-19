// Нормализует старые mojibake-значения, если UTF-8 текст когда-то был
// сохранён как cp1251-строка и потом попал обратно в UI.
const CP1251_EXTRA_BYTES = new Map<string, number>([
  ["Ђ", 0x80],
  ["Ѓ", 0x81],
  ["‚", 0x82],
  ["ѓ", 0x83],
  ["„", 0x84],
  ["…", 0x85],
  ["†", 0x86],
  ["‡", 0x87],
  ["€", 0x88],
  ["‰", 0x89],
  ["Љ", 0x8a],
  ["‹", 0x8b],
  ["Њ", 0x8c],
  ["Ќ", 0x8d],
  ["Ћ", 0x8e],
  ["Џ", 0x8f],
  ["ђ", 0x90],
  ["‘", 0x91],
  ["’", 0x92],
  ["“", 0x93],
  ["”", 0x94],
  ["•", 0x95],
  ["–", 0x96],
  ["—", 0x97],
  ["™", 0x99],
  ["љ", 0x9a],
  ["›", 0x9b],
  ["њ", 0x9c],
  ["ќ", 0x9d],
  ["ћ", 0x9e],
  ["џ", 0x9f],
  [" ", 0xa0],
  ["Ў", 0xa1],
  ["ў", 0xa2],
  ["Ј", 0xa3],
  ["¤", 0xa4],
  ["Ґ", 0xa5],
  ["¦", 0xa6],
  ["§", 0xa7],
  ["Ё", 0xa8],
  ["©", 0xa9],
  ["Є", 0xaa],
  ["«", 0xab],
  ["¬", 0xac],
  ["­", 0xad],
  ["®", 0xae],
  ["Ї", 0xaf],
  ["°", 0xb0],
  ["±", 0xb1],
  ["І", 0xb2],
  ["і", 0xb3],
  ["ґ", 0xb4],
  ["µ", 0xb5],
  ["¶", 0xb6],
  ["·", 0xb7],
  ["ё", 0xb8],
  ["№", 0xb9],
  ["є", 0xba],
  ["»", 0xbb],
  ["ј", 0xbc],
  ["Ѕ", 0xbd],
  ["ѕ", 0xbe],
  ["ї", 0xbf],
]);

function encodeCp1251Byte(character: string) {
  const code = character.charCodeAt(0);

  if (code <= 0x7f) {
    return code;
  }

  if (code >= 0x0410 && code <= 0x044f) {
    return code - 0x350;
  }

  return CP1251_EXTRA_BYTES.get(character) ?? null;
}

export function normalizeDashboardText(value: string) {
  if (!value || !/(?:[РС][^\s]){2,}/.test(value)) {
    return value;
  }

  const bytes: number[] = [];

  for (const character of value) {
    const byte = encodeCp1251Byte(character);
    if (byte === null) {
      return value;
    }

    bytes.push(byte);
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return /[А-Яа-яЁё]/.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}

export function normalizeDashboardData<T>(value: T): T {
  if (typeof value === "string") {
    return normalizeDashboardText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDashboardData(item)) as T;
  }

  if (value && typeof value === "object") {
    const normalizedEntries = Object.entries(value).map(([key, entry]) => [key, normalizeDashboardData(entry)]);
    return Object.fromEntries(normalizedEntries) as T;
  }

  return value;
}
