import type { SignalTone } from "../../../shared/ui";
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type {
  ProjectCardContract,
  ProjectCardContractMilestone,
  ProjectCardExpenseTone,
} from "../model/project-model";

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

function contractMilestoneStatusPriority(status: ProjectCardContractMilestone["status"]) {
  switch (status) {
    case "due":
      return 0;
    case "upcoming":
      return 1;
    case "completed":
    default:
      return 2;
  }
}

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

export function contractSignalToneClass(milestone: ProjectCardContractMilestone | null) {
  if (!milestone) {
    return "dashboard-project-contract-signal dashboard-project-contract-signal-complete";
  }

  return milestone.status === "due"
    ? "dashboard-project-contract-signal dashboard-project-contract-signal-due"
    : "dashboard-project-contract-signal dashboard-project-contract-signal-upcoming";
}

export function contractSignalTitle(milestone: ProjectCardContractMilestone | null) {
  if (!milestone) {
    return "Все ближайшие договорные вехи закрыты";
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

export function contractSignalDescription(milestone: ProjectCardContractMilestone | null) {
  if (!milestone) {
    return "Следующая часть договора уже под контролем. Можно переходить к следующим условиям или загрузить новый документ.";
  }

  const date = formatDisplayDate(milestone.plannedDate);
  const amount = typeof milestone.amount === "number" ? ` на ${formatMoney(milestone.amount)}` : "";
  const note = milestone.note ? ` ${milestone.note}` : "";

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

export function contractSignalActionLabel(milestone: ProjectCardContractMilestone | null) {
  if (!milestone) {
    return null;
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

export function contractProgressNodeClass(milestone: ProjectCardContractMilestone, isActive: boolean) {
  const baseClass = "dashboard-project-contract-progress-node";
  const stateClass =
    milestone.status === "completed"
      ? "dashboard-project-contract-progress-node-completed"
      : milestone.status === "due"
        ? "dashboard-project-contract-progress-node-due"
        : "dashboard-project-contract-progress-node-upcoming";

  return isActive ? `${baseClass} ${stateClass} dashboard-project-contract-progress-node-active` : `${baseClass} ${stateClass}`;
}

export function contractProgressNodeTooltip(milestone: ProjectCardContractMilestone) {
  const date = formatDisplayDate(milestone.plannedDate);
  const amount = typeof milestone.amount === "number" ? ` • ${formatMoney(milestone.amount)}` : "";

  return `${milestone.title} • ${contractMilestoneStatusLabel(milestone.status)} • ${date}${amount}`;
}

export function getContractSummary(contract: ProjectCardContract): {
  activeMilestone: ProjectCardContractMilestone | null;
  eventCount: number;
  reminderCount: number;
  completedCount: number;
  progressPercent: number;
  eventsTone: SignalTone;
  remindersTone: SignalTone;
} {
  const activeMilestone =
    [...contract.milestones]
      .filter((milestone) => milestone.status !== "completed")
      .sort((left, right) => {
        const statusDelta =
          contractMilestoneStatusPriority(left.status) - contractMilestoneStatusPriority(right.status);
        if (statusDelta !== 0) {
          return statusDelta;
        }

        return left.plannedDate.localeCompare(right.plannedDate);
      })[0] ?? null;

  const eventCount = contract.milestones.filter((milestone) => milestone.status !== "completed").length;
  const reminderCount = contract.milestones.filter((milestone) => milestone.status === "due").length;
  const completedCount = contract.milestones.filter((milestone) => milestone.status === "completed").length;
  const progressPercent =
    contract.milestones.length === 0
      ? 0
      : Math.min(100, ((completedCount + (activeMilestone ? 1 : 0)) / contract.milestones.length) * 100);

  return {
    activeMilestone,
    eventCount,
    reminderCount,
    completedCount,
    progressPercent,
    eventsTone: reminderCount > 0 ? "amber" : eventCount > 0 ? "cyan" : "emerald",
    remindersTone: reminderCount > 0 ? "rose" : "emerald",
  };
}
