import type { DeliverySettings, GroupProfile, MaterialFamily, RecentRequest, StatusTone, Summary } from "../../shared/types";
import { SignalChip, StatusBadge, type SignalTone } from "../../shared/ui";
import { formatDeliveryWindow, formatStatus, toneForStatus, waitingForLabel } from "../../shared/utils";

const statusPriorityOrder = ["collecting", "awaiting_confirmation", "confirmed", "in_progress", "done", "cancelled"] as const;

const statusPillToneClasses: Record<StatusTone, { dot: string; pill: string }> = {
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

type LogisticsSignalIcon = "drafts" | "awaiting" | "confirmed" | "objects";

function LogisticsIcon(props: { kind: LogisticsSignalIcon }) {
  switch (props.kind) {
    case "drafts":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <path d="M4.75 7.75h14.5v8.5H4.75z" />
          <path d="m8 11.5 4 3 4-3" />
        </svg>
      );
    case "awaiting":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 8v4.4l2.8 1.75" />
        </svg>
      );
    case "confirmed":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.25" />
          <path d="m8.8 12.3 2.25 2.3 4.35-4.7" />
        </svg>
      );
    case "objects":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <path d="M4.75 19.25h14.5" />
          <path d="M7.25 19.25v-10.5h9.5v10.5" />
          <path d="M9.75 8.75V5.5h4.5v3.25" />
        </svg>
      );
    default:
      return null;
  }
}

function LogisticsSignal(props: {
  label: string;
  value: number | undefined;
  tone: SignalTone;
  icon: LogisticsSignalIcon;
}) {
  return (
    <SignalChip
      value={props.value}
      tooltip={`${props.label}: ${props.value ?? "—"}`}
      tone={props.tone}
      icon={<LogisticsIcon kind={props.icon} />}
    />
  );
}

function LogisticsStatusPill(props: { label: string; count: number; tone: StatusTone }) {
  const tone = statusPillToneClasses[props.tone];

  return (
    <div className={`dashboard-status-pill ${tone.pill}`} title={`${props.label}: ${props.count}`}>
      <span className={`dashboard-status-dot ${tone.dot}`} />
      <span>{props.label}</span>
      <span className="font-semibold text-white">{props.count}</span>
    </div>
  );
}

function compareRequestsByPriority(left: RecentRequest, right: RecentRequest): number {
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

function buildStatusOverview(requests: RecentRequest[]) {
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

type RequestsOverviewPanelProps = {
  summary: Summary | null;
  requests: RecentRequest[];
  families: MaterialFamily[];
  groups: GroupProfile[];
  deliverySettings: DeliverySettings | null;
  loading: boolean;
  error: string | null;
};

// Верхняя сводка логистики: статусы, приоритетные заявки, объекты и окно доставки.
export function RequestsOverviewPanel(props: RequestsOverviewPanelProps) {
  const prioritizedRequests = [...props.requests].sort(compareRequestsByPriority).slice(0, 6);
  const { counters: statusCounters, overview: statusOverview } = buildStatusOverview(props.requests);

  return (
    <div className="space-y-4">
      {props.error ? (
        <div className="glass-panel border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {props.error}
        </div>
      ) : null}

      <section className="glass-panel p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div>
              <div className="eyebrow">Сводка</div>
              <h3 className="section-title mt-1">Оперативная картина</h3>
            </div>

            <div className="dashboard-status-strip">
              {statusOverview.map((entry) => (
                <LogisticsStatusPill key={entry.status} label={entry.label} count={entry.count} tone={entry.tone} />
              ))}

              {!statusOverview.length && !props.loading ? (
                <div className="dashboard-status-empty">Статусы появятся, когда в ленте будут заявки.</div>
              ) : null}
            </div>
          </div>

          <div className="dashboard-signals">
            <LogisticsSignal label="Активные черновики" value={props.summary?.active_drafts_count} tone="cyan" icon="drafts" />
            <LogisticsSignal
              label="Ждут подтверждения"
              value={statusCounters.get("awaiting_confirmation") ?? 0}
              tone="amber"
              icon="awaiting"
            />
            <LogisticsSignal label="Подтверждено сегодня" value={props.summary?.confirmed_today_count} tone="emerald" icon="confirmed" />
            <LogisticsSignal label="Активных объектов" value={props.summary?.groups_count} tone="cyan" icon="objects" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="glass-panel p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Заявки</div>
              <h3 className="section-title mt-1">Приоритетная лента</h3>
            </div>
            <StatusBadge label={`${props.summary?.confirmed_requests_count ?? 0} всего подтверждено`} tone="neutral" />
          </div>

          <div className="space-y-2.5">
            {prioritizedRequests.map((request) => (
              <div key={request.id} className="dense-row px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="slot-chip">#{request.id}</span>
                      <div className="font-semibold text-slate-900">{request.master_name}</div>
                      {request.waiting_for ? <span className="stat-chip">{waitingForLabel(request.waiting_for)}</span> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
                      <span>{request.object_name}</span>
                      <span className="text-slate-700">·</span>
                      <span>Позиций {request.items_count}</span>
                      <span className="text-slate-700">·</span>
                      <span>{formatDeliveryWindow(request)}</span>
                    </div>
                  </div>
                  <StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} />
                </div>
              </div>
            ))}

            {!prioritizedRequests.length && !props.loading ? <div className="empty-state">Заявок пока нет.</div> : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass-panel p-4">
            <div className="mb-3">
              <div className="eyebrow">Доставка</div>
              <h3 className="section-title mt-1">Окно по умолчанию</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="dashboard-compact-stat">
                <div className="dashboard-compact-label">Старт</div>
                <div className="dashboard-compact-value">{props.deliverySettings?.delivery_start ?? "—"}</div>
              </div>
              <div className="dashboard-compact-stat">
                <div className="dashboard-compact-label">Конец</div>
                <div className="dashboard-compact-value">{props.deliverySettings?.delivery_end ?? "—"}</div>
              </div>
              <div className="dashboard-compact-stat">
                <div className="dashboard-compact-label">Fallback</div>
                <div className="dashboard-compact-value">{props.deliverySettings?.delivery_fallback ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Объекты</div>
                <h3 className="section-title mt-1">Последние группы</h3>
              </div>
              <span className="slot-chip">{props.groups.length}</span>
            </div>
            <div className="space-y-2.5">
              {props.groups.slice(0, 4).map((group) => (
                <div key={group.chat_id} className="subpanel px-3.5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{group.object_name ?? group.title}</div>
                      <div className="mt-1 text-[12px] text-slate-600">
                        {group.address ?? "Адрес не распознан"}
                        {group.flat ? `, кв. ${group.flat}` : ""}
                      </div>
                    </div>
                    <span className="slot-chip">
                      {group.delivery_start ?? "—"} - {group.delivery_end ?? "—"}
                    </span>
                  </div>
                </div>
              ))}

              {!props.groups.length ? <div className="empty-state">Группы пока не появились.</div> : null}
            </div>
          </div>

          <div className="glass-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Каталог</div>
                <h3 className="section-title mt-1">Семейства</h3>
              </div>
              <span className="slot-chip">{props.families.length}</span>
            </div>
            <div className="space-y-2.5">
              {props.families.slice(0, 4).map((family) => (
                <div key={family.id} className="subpanel px-3.5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{family.canonical_name}</div>
                      <div className="mt-1 text-[12px] text-slate-600">
                        {family.category ?? "Без категории"} · ед. {family.default_unit}
                      </div>
                    </div>
                    <span className="stat-chip">SKU {family.skus_count}</span>
                  </div>
                </div>
              ))}

              {!props.families.length ? <div className="empty-state">Каталог пока пустой.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
