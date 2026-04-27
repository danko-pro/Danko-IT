import { formatMoney, ledgerStatusView } from "../../model/project-accounting-format";
import type { ProjectCardLedgerStatus } from "../../model/project-model";

const triggerAmountFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type LedgerDeltaTone = "neutral" | "positive" | "negative";
type LedgerSummaryTone = "neutral" | "ok" | "error";

function formatTriggerAmountValue(value: number) {
  return triggerAmountFormatter.format(value);
}

function getDisplayAmount(status: ProjectCardLedgerStatus, planAmount: number, actualAmount: number) {
  if (status === "planned") {
    return planAmount;
  }

  return actualAmount > 0 ? actualAmount : planAmount;
}

function getDeltaView(planAmount: number, actualAmount: number): {
  shortLabel: string | null;
  shortTone: LedgerDeltaTone;
  summaryTitle: string;
  summaryAmount: string;
  summaryTone: LedgerSummaryTone;
} {
  if (actualAmount <= 0) {
    return {
      shortLabel: "без факта",
      shortTone: "neutral",
      summaryTitle: "Факт не внесён",
      summaryAmount: "Отклонение появится после счёта",
      summaryTone: "neutral",
    };
  }

  const delta = actualAmount - planAmount;
  if (Math.abs(delta) < 0.005) {
    return {
      shortLabel: "по плану",
      shortTone: "neutral",
      summaryTitle: "По плану",
      summaryAmount: formatMoney(0),
      summaryTone: "ok",
    };
  }

  if (delta > 0) {
    return {
      shortLabel: `+${formatTriggerAmountValue(delta)} ₽`,
      shortTone: "negative",
      summaryTitle: "Перерасход",
      summaryAmount: formatMoney(delta),
      summaryTone: "error",
    };
  }

  return {
    shortLabel: `-${formatTriggerAmountValue(Math.abs(delta))} ₽`,
    shortTone: "positive",
    summaryTitle: "Экономия",
    summaryAmount: formatMoney(Math.abs(delta)),
    summaryTone: "ok",
  };
}

export function parseLedgerAmountInput(value: string) {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ledgerDeviationView(status: ProjectCardLedgerStatus, planAmount: number, actualAmount: number) {
  const statusLabel = ledgerStatusView(status).label;
  const delta = getDeltaView(planAmount, actualAmount);

  return {
    title: statusLabel,
    amountLabel: formatMoney(getDisplayAmount(status, planAmount, actualAmount)),
    deltaTitle: delta.summaryTitle,
    deltaAmount: delta.summaryAmount,
    tone: delta.summaryTone,
  };
}

export function ledgerTriggerAmountView(status: ProjectCardLedgerStatus, planAmount: number, actualAmount: number) {
  const delta = getDeltaView(planAmount, actualAmount);

  return {
    amountLabel: formatTriggerAmountValue(getDisplayAmount(status, planAmount, actualAmount)),
    amountTone:
      status === "invoice" || status === "waiting-payment"
        ? ("accent" as const)
        : status === "paid" || status === "completed"
          ? ("positive" as const)
          : ("neutral" as const),
    metaLabel: status === "planned" ? null : delta.shortLabel,
    metaTone: delta.shortTone,
  };
}
