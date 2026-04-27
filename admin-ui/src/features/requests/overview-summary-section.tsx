import type { Summary } from "../../shared/types";
import { SignalChip, type SignalTone } from "../../shared/ui";
import { statusPillToneClasses } from "./overview-utils";

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

function LogisticsStatusPill(props: { label: string; count: number; tone: keyof typeof statusPillToneClasses }) {
  const tone = statusPillToneClasses[props.tone];

  return (
    <div className={`dashboard-status-pill ${tone.pill}`} title={`${props.label}: ${props.count}`}>
      <span className={`dashboard-status-dot ${tone.dot}`} />
      <span>{props.label}</span>
      <span className="font-semibold text-white">{props.count}</span>
    </div>
  );
}

type RequestsOverviewSummarySectionProps = {
  summary: Summary | null;
  statusOverview: Array<{ status: string; count: number; label: string; tone: keyof typeof statusPillToneClasses }>;
  awaitingConfirmationCount: number;
  loading: boolean;
};

export function RequestsOverviewSummarySection(props: RequestsOverviewSummarySectionProps) {
  return (
    <section className="glass-panel p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <div className="eyebrow">Сводка</div>
            <h3 className="section-title mt-1">Оперативная картина</h3>
          </div>

          <div className="dashboard-status-strip">
            {props.statusOverview.map((entry) => (
              <LogisticsStatusPill key={entry.status} label={entry.label} count={entry.count} tone={entry.tone} />
            ))}

            {!props.statusOverview.length && !props.loading ? (
              <div className="dashboard-status-empty">Статусы появятся, когда в ленте будут заявки.</div>
            ) : null}
          </div>
        </div>

        <div className="dashboard-signals">
          <LogisticsSignal label="Активные черновики" value={props.summary?.active_drafts_count} tone="cyan" icon="drafts" />
          <LogisticsSignal
            label="Ждут подтверждения"
            value={props.awaitingConfirmationCount}
            tone="amber"
            icon="awaiting"
          />
          <LogisticsSignal label="Подтверждено сегодня" value={props.summary?.confirmed_today_count} tone="emerald" icon="confirmed" />
          <LogisticsSignal label="Активных объектов" value={props.summary?.groups_count} tone="cyan" icon="objects" />
        </div>
      </div>
    </section>
  );
}
