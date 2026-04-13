import type { ReactNode } from "react";
import type { StatusTone } from "./types";

// Переиспользуемые UI-элементы admin UI.

export function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="field-label">{props.label}</div>
      <input
        className="text-input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
      />
    </label>
  );
}

export function SelectField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <div className="field-label">{props.label}</div>
      <select className="text-input" value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TimeField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div className="field-label">{props.label}</div>
      <input
        type="time"
        className="text-input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

export function InfoCard(props: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,21,29,0.92),rgba(10,14,20,0.98))] px-4 py-3.5 shadow-[0_20px_44px_rgba(0,0,0,0.2)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/28 to-transparent" />
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-sm font-semibold tracking-[-0.01em] text-slate-100">{props.value}</div>
    </div>
  );
}

export function MetricCard(props: {
  label: string;
  value: number | undefined;
  accent: "cyan" | "amber" | "emerald" | "rose";
}) {
  const accents = {
    cyan: {
      line: "bg-cyan-400",
      glow: "bg-cyan-400/20",
      label: "text-cyan-300/70",
    },
    amber: {
      line: "bg-amber-400",
      glow: "bg-amber-400/18",
      label: "text-amber-300/70",
    },
    emerald: {
      line: "bg-emerald-400",
      glow: "bg-emerald-400/18",
      label: "text-emerald-300/70",
    },
    rose: {
      line: "bg-fuchsia-400",
      glow: "bg-fuchsia-400/18",
      label: "text-fuchsia-300/70",
    },
  } as const;

  const accent = accents[props.accent];

  return (
    <div className="glass-panel metric-card relative min-h-[128px] overflow-hidden p-5">
      <div className={`absolute inset-x-6 top-0 h-px ${accent.line} opacity-90`} />
      <div className={`absolute -right-8 top-0 h-24 w-24 rounded-full blur-3xl ${accent.glow}`} />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${accent.label}`}>{props.label}</div>
      <div className="mt-6 text-[2.7rem] font-semibold tracking-[-0.05em] text-white">{props.value ?? "—"}</div>
    </div>
  );
}

export function SettingCard(props: { title: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,21,29,0.9),rgba(10,14,20,0.98))] px-4 py-3.5 shadow-[0_20px_44px_rgba(0,0,0,0.18)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/18 to-transparent" />
      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{props.title}</div>
      <div className="mt-2 text-[1.45rem] font-semibold tracking-[-0.03em] text-white">{props.value}</div>
    </div>
  );
}

export function StatusBadge(props: { label: string; tone: StatusTone }) {
  const tones = {
    ok: "border-emerald-300/18 bg-[linear-gradient(180deg,rgba(10,43,35,0.92),rgba(10,28,24,0.96))] text-emerald-100",
    warn: "border-amber-300/18 bg-[linear-gradient(180deg,rgba(53,36,10,0.92),rgba(36,25,10,0.96))] text-amber-100",
    neutral: "border-white/8 bg-[linear-gradient(180deg,rgba(20,24,32,0.9),rgba(13,17,24,0.96))] text-slate-300",
    active: "border-cyan-300/18 bg-[linear-gradient(180deg,rgba(8,42,51,0.9),rgba(8,25,31,0.96))] text-cyan-100",
    error: "border-rose-300/18 bg-[linear-gradient(180deg,rgba(60,20,30,0.9),rgba(35,15,21,0.96))] text-rose-100",
  } as const;

  return <span className={`status-pill ${tones[props.tone]}`}>{props.label}</span>;
}

export type SignalTone = "cyan" | "amber" | "emerald" | "rose";

export function SignalChip(props: {
  value: number | string | undefined;
  tooltip: string;
  icon: ReactNode;
  tone: SignalTone;
  align?: "center" | "end";
}) {
  const toneClasses = {
    cyan: "border-[#07f8c6]/25 bg-[#07f8c6]/10 text-[#07f8c6]",
    amber: "border-amber-300/22 bg-amber-300/10 text-amber-200",
    emerald: "border-emerald-300/22 bg-emerald-300/10 text-emerald-200",
    rose: "border-fuchsia-300/22 bg-fuchsia-300/10 text-fuchsia-200",
  } as const;

  const value = props.value ?? "—";
  const tooltipAlign = props.align === "end" ? "ui-tooltip-end" : "ui-tooltip-center";

  return (
    <div
      className={`signal-chip ui-tooltip-anchor ${tooltipAlign}`}
      data-tooltip={props.tooltip}
      aria-label={props.tooltip}
    >
      <span className={`signal-chip-icon ${toneClasses[props.tone]}`}>{props.icon}</span>
      <span className="signal-chip-value">{value}</span>
    </div>
  );
}
