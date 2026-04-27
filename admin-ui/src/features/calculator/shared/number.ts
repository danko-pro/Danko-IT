import { trimFloatFixed } from "../../../shared/formatters/number";

export function trimFloat(value: number) {
  return trimFloatFixed(value);
}

export function toNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toInteger(value: string) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}
