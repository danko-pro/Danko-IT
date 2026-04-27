import { formatDateTimeRu } from "../../../shared/formatters/date";
import { formatMoneySuffix } from "../../../shared/formatters/money";
import { trimFloat } from "./number";

export function formatPerSquareRate(value: number, unit: string) {
  return value > 0 ? `${trimFloat(value)} ${unit}/м²` : "—";
}

export function formatArea(value: number) {
  return `${trimFloat(value)} м²`;
}

export function formatMeters(value: number) {
  return `${trimFloat(value)} м.п.`;
}

export function formatMoney(value: number) {
  return formatMoneySuffix(value);
}

export function formatContourWord(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;
  if (remainder10 === 1 && remainder100 !== 11) {
    return "контур";
  }
  if ([2, 3, 4].includes(remainder10) && ![12, 13, 14].includes(remainder100)) {
    return "контура";
  }
  return "контуров";
}

export function formatDateTime(value: string) {
  return formatDateTimeRu(value);
}
