import type { ProjectCardLedgerStatus } from "../../model/project-model";

export const EXPENSE_ITEM_OPTIONS = [
  "Сантехника (чш)",
  "Нет",
  "Укрывка",
  "Демонтаж / Монтаж",
  "Отделка (ч)",
  "Подрядчик",
  "Доставка",
  "Прочие",
  "Счёт в Бау",
  "Кеска",
  "Кондиционер",
  "Электрика (чш)",
  "Штукатурка",
  "Алюминиевые профили",
  "Напольные покрытия",
  "Двери",
  "ГКЛ",
  "Укладка плитки",
  "Чистовая отделка",
  "Вентиляция",
  "Влагоуловитель",
  "Натяжные потолки",
  "Розетки / выключатели",
  "Чистка зеркал",
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
  { value: "invoice", note: "Счёт получен от исполнителя" },
  { value: "waiting-payment", note: "Сумма подтверждена и ожидает оплаты контрагенту" },
  { value: "paid", note: "Оплата прошла, расход зафиксирован" },
  { value: "completed", note: "Позиция закрыта и больше не меняется" },
];

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
