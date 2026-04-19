/**
 * Базовые числовые formatter'ы для разных сценариев UI.
 * Они разделены по семантике, потому что loose и calculator-форматирование
 * намеренно отличаются количеством сохраняемых знаков после запятой.
 */
export function trimFloatLoose(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toString();
}

export function trimFloatFixed(value: number, fractionDigits = 2): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(fractionDigits).replace(/\.?0+$/, "");
}
