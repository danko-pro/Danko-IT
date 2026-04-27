import type { RecentRequest, StatusTone } from "../../shared/types";
import { toneForStatus } from "../../shared/utils";

const statusPriorityOrder = ["collecting", "awaiting_confirmation", "confirmed", "in_progress", "done", "cancelled"] as const;

export const statusPillToneClasses: Record<StatusTone, { dot: string; pill: string }> = {
  ok: {
    dot: "bg-emerald-300",
    pill: "border-emerald-300/16 bg-emerald-300/8 text-emerald-100",
  },
  warn: {
    dot: "bg-amber-300",
    pill: "border-amber-300/16 bg-amber-300/8 text-amber-100",
  },
  neutral: {
    dot: "bg-slate-400",
    pill: "border-white/8 bg-white/5 text-slate-300",
  },
  active: {
    dot: "bg-cyan-300",
    pill: "border-cyan-300/18 bg-cyan-300/8 text-cyan-100",
  },
  error: {
    dot: "bg-rose-300",
    pill: "border-rose-300/16 bg-rose-300/8 text-rose-100",
  },
};

export function compareRequestsByPriority(left: RecentRequest, right: RecentRequest): number {
  const statusWeights: Record<string, number> = {
    awaiting_confirmation: 0,
    collecting: 1,
    confirmed: 2,
    in_progress: 3,
    done: 4,
    cancelled: 5,
  };

  const leftWeight = statusWeights[left.status] ?? 99;
  const rightWeight = statusWeights[right.status] ?? 99;

  if (leftWeight !== rightWeight) {
    return leftWeight - rightWeight;
  }

  return right.updated_at.localeCompare(left.updated_at);
}

export function buildStatusOverview(requests: RecentRequest[]) {
  const counters = new Map<string, number>();

  for (const request of requests) {
    counters.set(request.status, (counters.get(request.status) ?? 0) + 1);
  }

  const overview = statusPriorityOrder
    .map((status) => ({
      status,
      count: counters.get(status) ?? 0,
      label:
        status === "collecting"
          ? "Сбор"
          : status === "awaiting_confirmation"
            ? "Подтв."
            : status === "confirmed"
              ? "Подтверж."
              : status === "in_progress"
                ? "В работе"
                : status === "done"
                  ? "Готово"
                  : "Отмена",
      tone: toneForStatus(status),
    }))
    .filter((entry) => entry.count > 0);

  return { counters, overview };
}
