import type { SignalTone } from "../../../shared/ui";
import { formatDisplayDate, formatMoney } from "../model/project-accounting-format";
import type {
  ProjectCardAdvanceItem,
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

function parseProjectDate(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const date = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parts = normalized.split(".");
  if (parts.length === 3) {
    const [day, month, year] = parts.map((part) => Number(part));
    if ([day, month, year].every((part) => Number.isFinite(part))) {
      const date = new Date(year, month - 1, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addBusinessDays(startDate: Date, businessDays: number) {
  const cursor = new Date(startDate);
  let remaining = Math.max(0, businessDays);

  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      remaining -= 1;
    }
  }

  return cursor;
}

function extractAdvanceLeadDays(advanceTerms: string) {
  const normalized = advanceTerms.toLowerCase();
  if (!normalized.includes("аванс")) {
    return null;
  }

  const match = normalized.match(/(\d+)\s+(?:рабоч(?:их|ие|ий)|банков(?:ских|ские|ский))\s+дн/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function buildTriggeredStartMilestone(
  contract: ProjectCardContract,
  advances: ProjectCardAdvanceItem[],
): ProjectCardContractMilestone | null {
  if (parseProjectDate(contract.startDate)) {
    return null;
  }

  const leadDays = extractAdvanceLeadDays(contract.advanceTerms);
  if (!leadDays) {
    return null;
  }

  const paidAdvance = [...advances]
    .filter((advance) => advance.status === "paid")
    .sort((left, right) => {
      const leftDate = parseProjectDate(left.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDate = parseProjectDate(right.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate;
    })[0];

  if (!paidAdvance) {
    return null;
  }

  const paidAdvanceDate = parseProjectDate(paidAdvance.date);
  if (!paidAdvanceDate) {
    return null;
  }

  const dueDate = addBusinessDays(paidAdvanceDate, leadDays);
  const today = new Date();
  const todayMarker = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueMarker = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  return {
    id: "synthetic:start-after-advance",
    kind: "deadline",
    title: "Старт работ после аванса",
    plannedDate: toIsoDate(dueDate),
    note: `Работы должны начаться в течение ${leadDays} рабочих дней после поступления аванса от ${formatDisplayDate(
      paidAdvance.date,
    )}.`,
    status: dueMarker <= todayMarker ? "due" : "upcoming",
    synthetic: "start-after-advance",
  };
}

export function getContractTimelineMilestones(contract: ProjectCardContract, advances: ProjectCardAdvanceItem[]) {
  const milestones = [...contract.milestones];
  const triggeredStart = buildTriggeredStartMilestone(contract, advances);
  if (triggeredStart) {
    milestones.push(triggeredStart);
  }

  return milestones.sort((left, right) => {
    const leftTime = parseProjectDate(left.plannedDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = parseProjectDate(right.plannedDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
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

export function contractSignalDescription(milestone: ProjectCardContractMilestone | null) {
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

export function contractSignalActionLabel(milestone: ProjectCardContractMilestone | null) {
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

export function getContractSummary(contract: ProjectCardContract, advances: ProjectCardAdvanceItem[] = []) {
  const timelineMilestones = getContractTimelineMilestones(contract, advances);
  const activeMilestone =
    [...timelineMilestones]
      .filter((milestone) => milestone.status !== "completed")
      .sort((left, right) => {
        const statusDelta =
          contractMilestoneStatusPriority(left.status) - contractMilestoneStatusPriority(right.status);
        if (statusDelta !== 0) {
          return statusDelta;
        }

        const leftTime = parseProjectDate(left.plannedDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = parseProjectDate(right.plannedDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })[0] ?? null;

  const eventCount = timelineMilestones.filter((milestone) => milestone.status !== "completed").length;
  const reminderCount = timelineMilestones.filter((milestone) => milestone.status === "due").length;
  const completedCount = timelineMilestones.filter((milestone) => milestone.status === "completed").length;
  const progressPercent =
    timelineMilestones.length === 0
      ? 0
      : Math.min(100, ((completedCount + (activeMilestone ? 1 : 0)) / timelineMilestones.length) * 100);

  return {
    activeMilestone,
    eventCount,
    reminderCount,
    completedCount,
    progressPercent,
    eventsTone: reminderCount > 0 ? ("amber" as SignalTone) : eventCount > 0 ? ("cyan" as SignalTone) : ("emerald" as SignalTone),
    remindersTone: reminderCount > 0 ? ("rose" as SignalTone) : ("emerald" as SignalTone),
  };
}
