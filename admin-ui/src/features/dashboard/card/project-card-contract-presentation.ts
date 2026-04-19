/**
 * Presentation-helper'ы договорной карточки.
 * Здесь только текст, CSS-классы и tooltip/signals для уже рассчитанных вех.
 */
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type { ProjectCardContractMilestone } from "../model/project-model";
import type { ProjectCardTimelineMilestone } from "./project-card-contract-timeline";

export function contractMilestoneStatusLabel(status: ProjectCardContractMilestone["status"]) {
  switch (status) {
    case "due":
      return "Сейчас";
    case "upcoming":
      return "Далее";
    case "completed":
    default:
      return "Закрыто";
  }
}

export function contractMilestoneStatusClass(status: ProjectCardContractMilestone["status"]) {
  switch (status) {
    case "due":
      return "dashboard-project-contract-chip dashboard-project-contract-chip-due";
    case "upcoming":
      return "dashboard-project-contract-chip dashboard-project-contract-chip-upcoming";
    case "completed":
    default:
      return "dashboard-project-contract-chip dashboard-project-contract-chip-completed";
  }
}

export function contractSignalToneClass(milestone: ProjectCardTimelineMilestone | null) {
  if (!milestone) {
    return "dashboard-project-contract-signal dashboard-project-contract-signal-complete";
  }

  return milestone.status === "due"
    ? "dashboard-project-contract-signal dashboard-project-contract-signal-due"
    : "dashboard-project-contract-signal dashboard-project-contract-signal-upcoming";
}

export function contractSignalTitle(milestone: ProjectCardTimelineMilestone | null) {
  if (!milestone) {
    return "Все ближайшие договорные вехи закрыты";
  }

  if (milestone.synthetic === "start-after-advance") {
    return milestone.status === "due" ? "Пора запускать работы" : "Скоро должен начаться старт работ";
  }

  switch (milestone.kind) {
    case "invoice":
      return milestone.status === "due" ? "Пора выставить счёт" : "Скоро нужно выставить счёт";
    case "payment":
      return milestone.status === "due" ? "Ожидается платёж заказчика" : "Приближается оплата по договору";
    case "deadline":
    default:
      return milestone.status === "due" ? "Контрольная веха уже на подходе" : "Приближается ключевая веха";
  }
}

export function contractSignalDescription(milestone: ProjectCardTimelineMilestone | null) {
  if (!milestone) {
    return "Следующая часть договора уже под контролем. Можно переходить к следующим условиям или загрузить новый документ.";
  }

  const date = formatDisplayDate(milestone.plannedDate);
  const amount = typeof milestone.amount === "number" ? ` на ${formatMoney(milestone.amount)}` : "";
  const note = milestone.note ? ` ${milestone.note}` : "";

  if (milestone.synthetic === "start-after-advance") {
    return `После поступления аванса нужно запустить работы до ${date}.${note}`;
  }

  switch (milestone.kind) {
    case "invoice":
      return `До ${date} нужно выставить заказчику счёт${amount}.${note}`;
    case "payment":
      return `Менеджеру важно проконтролировать оплату${amount} до ${date}.${note}`;
    case "deadline":
    default:
      return `До ${date} нужно закрыть договорную веху и не пропустить следующий этап.${note}`;
  }
}

export function contractSignalActionLabel(milestone: ProjectCardTimelineMilestone | null) {
  if (!milestone) {
    return null;
  }

  if (milestone.synthetic === "start-after-advance") {
    return "Работы начаты";
  }

  switch (milestone.kind) {
    case "invoice":
      return "Счёт выставлен";
    case "payment":
      return "Оплата пришла";
    case "deadline":
    default:
      return "Веха закрыта";
  }
}

export function contractProgressNodeClass(milestone: ProjectCardTimelineMilestone, isActive: boolean) {
  const baseClass = "dashboard-project-contract-progress-node";
  const stateClass =
    milestone.status === "completed"
      ? "dashboard-project-contract-progress-node-completed"
      : milestone.status === "due"
        ? "dashboard-project-contract-progress-node-due"
        : "dashboard-project-contract-progress-node-upcoming";

  return isActive ? `${baseClass} ${stateClass} dashboard-project-contract-progress-node-active` : `${baseClass} ${stateClass}`;
}

export function contractProgressNodeTooltip(milestone: ProjectCardTimelineMilestone) {
  const date = formatDisplayDate(milestone.plannedDate);
  const amount = typeof milestone.amount === "number" ? ` • ${formatMoney(milestone.amount)}` : "";
  return `${milestone.title} • ${contractMilestoneStatusLabel(milestone.status)} • ${date}${amount}`;
}
