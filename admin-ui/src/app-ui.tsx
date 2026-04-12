import type { StatusTone } from "./app-types";

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
    <div className="rounded-[16px] border border-cyan-400/12 bg-slate-950/86 px-3.5 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{props.label}</div>
      <div className="mt-1.5 text-sm font-semibold text-slate-100">{props.value}</div>
    </div>
  );
}

export function MetricCard(props: { label: string; value: number | undefined; accent: "cyan" | "amber" | "emerald" | "rose" }) {
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
    <div className="glass-panel relative min-h-[108px] overflow-hidden border border-white/6 bg-slate-950/88 p-4">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accent.line}`} />
      <div className={`absolute -right-6 -top-8 h-20 w-20 rounded-full blur-2xl ${accent.glow}`} />
      <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${accent.label}`}>{props.label}</div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-white">{props.value ?? "—"}</div>
    </div>
  );
}

export function SettingCard(props: { title: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-cyan-400/12 bg-slate-950/86 px-3.5 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{props.title}</div>
      <div className="mt-1.5 text-xl font-semibold text-white">{props.value}</div>
    </div>
  );
}

export function StatusBadge(props: { label: string; tone: StatusTone }) {
  const tones = {
    ok: "border-emerald-400/24 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-400/24 bg-amber-500/10 text-amber-200",
    neutral: "border-slate-500/30 bg-slate-800/70 text-slate-300",
    active: "border-cyan-400/24 bg-cyan-500/10 text-cyan-200",
    error: "border-rose-400/24 bg-rose-500/10 text-rose-200",
  } as const;

  return <span className={`status-pill ${tones[props.tone]}`}>{props.label}</span>;
}
