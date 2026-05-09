import type { ReactNode } from "react";
import type { StatusTone } from "./types";

// Статусные и сигнальные UI-элементы admin UI.

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

export function StatChip(props: { children: ReactNode; className?: string }) {
  const className = props.className ? `stat-chip ${props.className}` : "stat-chip";

  return <span className={className}>{props.children}</span>;
}
