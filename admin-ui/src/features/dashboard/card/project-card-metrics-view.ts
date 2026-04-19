/**
 * Вспомогательные view-helper'ы для общих метрик карточки.
 * Здесь только простое отображение чисел и CSS-тоны без договорной логики.
 */
import { formatMoney } from "../model/project-accounting-format";
import type { ProjectCardExpenseTone } from "../model/project-model";

export function formatPerSquare(value: number) {
  return `${formatMoney(value)}/м²`;
}

export function expenseToneClass(tone: ProjectCardExpenseTone) {
  switch (tone) {
    case "cyan":
      return "dashboard-project-expense-cyan";
    case "emerald":
      return "dashboard-project-expense-emerald";
    case "amber":
      return "dashboard-project-expense-amber";
    case "rose":
      return "dashboard-project-expense-rose";
    case "slate":
    default:
      return "dashboard-project-expense-slate";
  }
}
