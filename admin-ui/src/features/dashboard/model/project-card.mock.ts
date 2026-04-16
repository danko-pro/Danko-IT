import type {
  DashboardProjectCardData,
  ProjectCardLedgerCounterparty,
  ProjectCardLedgerDocument,
  ProjectCardSourceFile,
} from "./project-model";

function sourceFile(id: string, fileName: string, uploadedAt: string, mimeType = "application/pdf"): ProjectCardSourceFile {
  return { id, fileName, uploadedAt, mimeType };
}

function ledgerDocument(
  id: string,
  kind: "invoice" | "act",
  title: string,
  date: string,
  amount: number,
  source: ProjectCardSourceFile,
  extractedByAi = true,
  verifiedByUser = true,
): ProjectCardLedgerDocument {
  return {
    id,
    kind,
    title,
    date,
    amount,
    sourceFile: source,
    extractedByAi,
    verifiedByUser,
  };
}

function counterpartyDetails(
  inn: string,
  legalName: string,
  managerName: string,
  email: string,
  phone: string,
  messenger: string,
): ProjectCardLedgerCounterparty {
  return {
    inn,
    legalName,
    managerName,
    email,
    phone,
    messenger,
  };
}

export const firstProjectCardMock: DashboardProjectCardData = {
  id: "project-ib-22",
  code: "ИБ / 22",
  name: "Карточка объекта",
  stageLabel: "В работе",
  stageTone: "active",
  areaM2: 173.6,
  estimateSource: "Смета калькулятора + ручной учёт",
  receivedTotal: 2446704,
  remainingTotal: 908094.16,
  deferredTotal: 0,
  plannedTotal: 163000,
  actualTotal: 1538609.84,
  workPerM2: 10770.55,
  materialsPerM2: 8859.14,
  plannedMarginPercent: 30,
  nextDeliveryLabel: "10.05 сб",
  expenses: [
    { label: "Работы", amount: 560668.72, tone: "cyan" },
    { label: "Материалы", amount: 460675.12, tone: "emerald" },
    { label: "Услуги", amount: 25000, tone: "amber" },
    { label: "Техника", amount: 143940, tone: "rose" },
    { label: "Мебель", amount: 43200, tone: "slate" },
    { label: "Двери", amount: 67766, tone: "slate" },
  ],
  advances: [{ id: "advance-main", title: "Аванс", amount: 2446704, date: "08.02.2026", status: "paid" }],
  ledgerEntries: [
    {
      id: "ledger-rough-work",
      category: "Работы",
      item: "Черновые работы",
      owner: "Прохоров Д.",
      counterparty: "ООО Баумастер Рус",
      counterpartyDetails: counterpartyDetails(
        "7704123456",
        "ООО Баумастер Рус",
        "Илья Смирнов",
        "smirnov@baumaster.ru",
        "+7 915 220-11-44",
        "@baumaster_ilya",
      ),
      status: "paid",
      invoiceDocument: ledgerDocument(
        "invoice-rough-work",
        "invoice",
        "Счёт / черновые / 01",
        "2026-03-16",
        320000,
        sourceFile("source-invoice-rough-work", "Счёт_черновые_01.pdf", "2026-03-16T10:20:00"),
      ),
      actDocument: ledgerDocument(
        "act-rough-work",
        "act",
        "Акт / черновые / 01",
        "2026-03-22",
        318400,
        sourceFile("source-act-rough-work", "Акт_черновые_01.pdf", "2026-03-22T17:45:00"),
      ),
      planAmount: 320000,
      actualAmount: 318400,
      controlDate: "2026-03-22",
    },
  ],
  contract: {
    fileName: "ДОГОВОР ПОДРЯДА 01-02-26.pdf",
    title: "Договор подряда на ремонт и комплектацию объекта",
    number: "ДОГОВОР ПОДРЯДА № 01/02/26",
    signedAt: "2026-02-08",
    startDate: "2026-02-10",
    plannedEndDate: "2026-08-30",
    amount: 2446704,
    advanceTerms: "Первичный аванс 30%, далее оплата по выставленным счетам и актам этапов.",
    extractionStatus: "review",
    sourceFile: sourceFile(
      "contract-source-ib-22",
      "Р”РћР“РћР’РћР _РџРћР”Р РЇР”Рђ_01-02-26.pdf",
      "2026-02-08T10:00:00",
    ),
    downloadUrl: "/api/projects/1/contract/download",
    milestones: [
      {
        id: "contract-invoice-2",
        kind: "invoice",
        title: "Выставить второй счёт на материалы",
        plannedDate: "2026-04-20",
        amount: 620000,
        note: "После подтверждения поставки чистовых материалов.",
        status: "due",
      },
      {
        id: "contract-payment-2",
        kind: "payment",
        title: "Получить второй аванс от заказчика",
        plannedDate: "2026-04-25",
        amount: 620000,
        note: "Оплата привязана к счёту №2.",
        status: "upcoming",
      },
      {
        id: "contract-deadline-rough",
        kind: "deadline",
        title: "Закрыть этап черновых работ",
        plannedDate: "2026-05-12",
        note: "Нужен акт и фотофиксация перед следующим этапом.",
        status: "upcoming",
      },
      {
        id: "contract-payment-1",
        kind: "payment",
        title: "Первичный аванс получен",
        plannedDate: "2026-02-08",
        amount: 2446704,
        status: "completed",
      },
    ],
  },
};

export function createEmptyProjectContract(): DashboardProjectCardData["contract"] {
  return {
    fileName: "Договор не загружен",
    title: "Договор не загружен",
    number: "Без номера",
    signedAt: "",
    startDate: "",
    plannedEndDate: "",
    amount: 0,
    advanceTerms: "Загрузите договор, чтобы система выделила условия оплаты и ближайшие вехи.",
    extractionStatus: "review",
    sourceFile: null,
    downloadUrl: null,
    milestones: [],
  };
}

export function createDashboardProjectDraft(sequence: number): DashboardProjectCardData {
  const codeNumber = String(sequence).padStart(2, "0");

  return {
    id: `project-draft-${sequence}-${Date.now()}`,
    code: `НОВ / ${codeNumber}`,
    name: "Новый объект",
    stageLabel: "Черновик",
    stageTone: "neutral",
    areaM2: 0,
    estimateSource: "",
    receivedTotal: 0,
    remainingTotal: 0,
    deferredTotal: 0,
    plannedTotal: 0,
    actualTotal: 0,
    workPerM2: 0,
    materialsPerM2: 0,
    plannedMarginPercent: 0,
    nextDeliveryLabel: "—",
    expenses: [],
    advances: [],
    ledgerEntries: [],
    contract: {
      fileName: "Договор не загружен",
      title: "Договор не загружен",
      number: "Без номера",
      signedAt: "",
      startDate: "",
      plannedEndDate: "",
      amount: 0,
      advanceTerms: "Загрузите договор, чтобы система выделила условия оплаты и ближайшие вехи.",
      extractionStatus: "review",
      sourceFile: null,
      downloadUrl: null,
      milestones: [],
    },
  };
}

export function cloneDashboardProjectData(project: DashboardProjectCardData): DashboardProjectCardData {
  return structuredClone(project);
}
