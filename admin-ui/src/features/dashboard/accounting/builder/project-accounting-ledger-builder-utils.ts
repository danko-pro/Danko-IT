import { formatMoney } from "../../model/project-accounting-format";
import type {
  ProjectCardLedgerCounterparty,
  ProjectCardLedgerEntry,
  ProjectCardLedgerStatus,
} from "../../model/project-model";

const triggerAmountFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const EXPENSE_ITEM_OPTIONS = [
  "Сантехника (чш)",
  "Нет",
  "Укрывка",
  "Демонтаж / Монтаж",
  "Отделка (ч)",
  "Подрядчик",
  "Доставка",
  "Прочие",
  "Счет в Бау",
  "Кеска",
  "Кондиционер",
  "Электрика (чш)",
  "Штукатурка",
  "Алюминиевые профиля",
  "Напольные покрытия",
  "Двери",
  "ГКЛ",
  "Укладка плитки",
  "Чистовая отделка",
  "Вентиляция",
  "Влагоуловитель",
  "Натяжные потолки",
  "Розетки / выключатели",
  "Чист (зеркала)",
  "Мебель / индивидуал",
  "Бытовая техника",
  "Подоконники",
  "Сантехника (чист)",
  "Перенос ГК",
  "Электрика (чист)",
];

export const LEDGER_STATUS_OPTIONS: Array<{
  value: ProjectCardLedgerStatus;
  note: string;
}> = [
  { value: "planned", note: "Есть только плановая сумма" },
  { value: "invoice", note: "Счет получен от исполнителя" },
  { value: "waiting-payment", note: "Сумма подтверждена и ожидает оплаты контрагенту" },
  { value: "paid", note: "Оплата прошла, расход зафиксирован" },
  { value: "completed", note: "Позиция закрыта и больше не меняется" },
];

export function createEmptyCounterpartyDetails(legalName = ""): ProjectCardLedgerCounterparty {
  return {
    inn: "",
    legalName,
    managerName: "",
    email: "",
    phone: "",
    messenger: "",
  };
}

export function mergeUniqueLabels(labels: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawLabel of labels) {
    const label = rawLabel.trim();
    if (!label) {
      continue;
    }

    const key = label.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(label);
  }

  return result;
}

export function counterpartyFromEntry(
  entry: ProjectCardLedgerEntry | null | undefined,
): ProjectCardLedgerCounterparty | null {
  if (!entry) {
    return null;
  }

  if (entry.counterpartyDetails) {
    return entry.counterpartyDetails;
  }

  if (!entry.counterparty.trim()) {
    return null;
  }

  return createEmptyCounterpartyDetails(entry.counterparty);
}

export function mergeUniqueCounterparties(records: Array<ProjectCardLedgerCounterparty | null | undefined>) {
  const result: ProjectCardLedgerCounterparty[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (!record) {
      continue;
    }

    const normalized = {
      inn: record.inn.trim(),
      legalName: record.legalName.trim(),
      managerName: record.managerName.trim(),
      email: record.email.trim(),
      phone: record.phone.trim(),
      messenger: record.messenger.trim(),
    };

    const primaryLabel = normalized.legalName || normalized.managerName || normalized.inn;
    if (!primaryLabel) {
      continue;
    }

    const key = normalized.inn
      ? `inn:${normalized.inn}`
      : `name:${primaryLabel.toLocaleLowerCase("ru-RU")}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function counterpartyTriggerLabel(details: ProjectCardLedgerCounterparty | null, fallback: string) {
  if (details?.legalName.trim()) {
    return details.legalName.trim();
  }

  if (fallback.trim()) {
    return fallback.trim();
  }

  return "Выбрать контрагента";
}

export function counterpartyTriggerMeta(details: ProjectCardLedgerCounterparty | null) {
  if (details?.inn.trim()) {
    return `ИНН ${details.inn.trim()}`;
  }

  if (details?.managerName.trim()) {
    return details.managerName.trim();
  }

  return "Карточка контрагента";
}

export function parseLedgerAmountInput(value: string) {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ledgerDeviationView(planAmount: number, actualAmount: number) {
  if (actualAmount <= 0) {
    return {
      label: "Факт не внесен",
      amountLabel: "Отклонение появится после счета",
      tone: "neutral" as const,
    };
  }

  const delta = actualAmount - planAmount;
  if (Math.abs(delta) < 0.005) {
    return {
      label: "По плану",
      amountLabel: formatMoney(0),
      tone: "active" as const,
    };
  }

  if (delta > 0) {
    return {
      label: "Перерасход",
      amountLabel: formatMoney(delta),
      tone: "error" as const,
    };
  }

  return {
    label: "Экономия",
    amountLabel: formatMoney(Math.abs(delta)),
    tone: "ok" as const,
  };
}

function formatTriggerAmountValue(value: number) {
  return triggerAmountFormatter.format(value);
}

export function ledgerTriggerAmountView(status: ProjectCardLedgerStatus, planAmount: number, actualAmount: number) {
  if (status === "paid" || status === "completed") {
    const delta = planAmount - actualAmount;
    if (Math.abs(delta) < 0.005) {
      return {
        label: "0",
        tone: "neutral" as const,
      };
    }

    return {
      label: `${delta > 0 ? "+" : "-"}${formatTriggerAmountValue(Math.abs(delta))}`,
      tone: delta > 0 ? ("positive" as const) : ("negative" as const),
    };
  }

  const amount = status === "planned" || actualAmount <= 0 ? planAmount : actualAmount;

  return {
    label: formatTriggerAmountValue(amount),
    tone: status === "invoice" || status === "waiting-payment" ? ("accent" as const) : ("neutral" as const),
  };
}
