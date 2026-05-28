import type { FocusEvent, KeyboardEvent } from "react";
import { parseEstimateDecimal, parseEstimateInteger } from "./public-estimate-geometry";

/**
 * Хелперы нормализации полей ввода калькулятора сметы.
 *
 * Идея: поля хранят «черновую» строку, чтобы пользователь мог свободно печатать
 * (включая пустое промежуточное состояние и запятую как разделитель), а строгая
 * нормализация выполняется на blur. Парсинг в число делают parseEstimateDecimal /
 * parseEstimateInteger — здесь мы только чистим строку от недопустимых символов.
 */

export const ESTIMATE_CEILING_HEIGHT_MIN = 2;
export const ESTIMATE_CEILING_HEIGHT_MAX = 4.5;
export const ESTIMATE_CEILING_HEIGHT_FALLBACK = 2.7;

/**
 * Чистит десятичную строку: оставляет цифры и один разделитель (точку или запятую,
 * сохраняя символ, который ввёл пользователь). Пустую строку не трогает, чтобы не
 * мешать набору. Не приводит к числу — это задача parseEstimateDecimal.
 */
export function sanitizeEstimateDecimalInput(value: string): string {
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

/**
 * Чистит целочисленную строку: только цифры, без знака и разделителей.
 */
export function sanitizeEstimateIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * Форматирует число в строку черновика без хвостовых нулей (для blur-нормализации).
 */
function formatDraftNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  return String(Math.round(value * 1000) / 1000);
}

/**
 * Нормализует десятичное поле на blur: пустое/невалидное превращает в пустую строку
 * (поле остаётся пустым, расчёт трактует как 0), иначе приводит к числовой строке
 * с точкой как разделителем.
 */
export function normalizeEstimateDecimalOnBlur(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "" || trimmed === "," || trimmed === ".") {
    return "";
  }

  return formatDraftNumber(parseEstimateDecimal(trimmed));
}

/**
 * Нормализует счётчик (целое >= 0) на blur: пустое поле приводит к "0".
 */
export function normalizeEstimateCountOnBlur(value: string): string {
  return String(parseEstimateInteger(value));
}

/**
 * Нормализует количество позиции (целое >= минимума, по умолчанию 1) на blur.
 */
export function normalizeEstimateQuantityOnBlur(value: string, minimum = 1): string {
  const parsed = parseEstimateInteger(value);
  return String(Math.max(minimum, parsed));
}

/**
 * Клампит высоту потолка в разумный диапазон на blur и подставляет дефолт,
 * если значение пустое/невалидное.
 */
export function normalizeEstimateCeilingHeightOnBlur(value: string): string {
  const trimmed = value.trim();
  const parsed = parseEstimateDecimal(trimmed);
  const safeValue = parsed > 0 ? parsed : ESTIMATE_CEILING_HEIGHT_FALLBACK;
  const clamped = Math.min(
    ESTIMATE_CEILING_HEIGHT_MAX,
    Math.max(ESTIMATE_CEILING_HEIGHT_MIN, safeValue),
  );

  return formatDraftNumber(clamped);
}

/**
 * Выделяет всё содержимое поля при фокусе — пользователь сразу перепечатывает
 * значение одним кликом, без необходимости предварительно его очищать.
 */
export function selectEstimateInputContent(event: FocusEvent<HTMLInputElement>): void {
  event.currentTarget.select();
}

/**
 * Подтверждение значения по Enter: применяем нормализацию (через blur, который уже
 * вызывает onBlur-обработчик поля) и убираем фокус, не отправляя форму. На мобильных
 * этот же blur срабатывает при нажатии кнопки подтверждения клавиатуры (см.
 * enterKeyHint="done" ниже).
 */
export function handleEstimateInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

/**
 * Общий набор пропсов для всех числовых полей калькулятора: выделение по фокусу,
 * подтверждение по Enter и подсказка мобильной клавиатуре показать кнопку «Готово».
 * Не включает onChange/onBlur/inputMode — они зависят от типа поля (десятичное/целое).
 */
export const estimateNumericFieldProps = {
  onFocus: selectEstimateInputContent,
  onKeyDown: handleEstimateInputKeyDown,
  enterKeyHint: "done",
} as const;
