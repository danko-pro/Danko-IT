/**
 * Денежные formatter'ы вынесены в shared, чтобы feature-модули не держали
 * собственные Intl.NumberFormat-конфигурации с почти одинаковым назначением.
 */
const moneySuffixFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const moneyCurrencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoneySuffix(value: number): string {
  return `${moneySuffixFormatter.format(value)} ₽`;
}

export function formatMoneyCurrency(value: number): string {
  return moneyCurrencyFormatter.format(value);
}
