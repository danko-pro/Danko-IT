// Визуальные карточки для сводок и настроек admin UI.

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
