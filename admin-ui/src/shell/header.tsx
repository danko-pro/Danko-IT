import type { ScreenKey } from "../shared/types";
import { SignalChip } from "../shared/ui";

function TermsSignal(props: { value: number | undefined }) {
  return (
    <SignalChip
      value={props.value}
      tooltip={`Новых неизвестных терминов: ${props.value ?? "—"}`}
      tone="rose"
      align="end"
      icon={
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <path d="M12 4.5 4.75 18h14.5L12 4.5Z" />
          <path d="M12 9v4.5" />
          <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      }
    />
  );
}

export function AppShellHeader(props: {
  screen: ScreenKey;
  eyebrow: string;
  title: string;
  unknownTermsCount: number | undefined;
  successMessage: string | null;
}) {
  return (
    <section className="glass-panel overflow-visible px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="eyebrow">{props.eyebrow}</div>
          <h2 className="text-[1.95rem] font-semibold tracking-[-0.035em] text-slate-50">{props.title}</h2>
        </div>

        {props.screen === "materials" ? <TermsSignal value={props.unknownTermsCount} /> : null}
      </div>

      {props.successMessage ? (
        <div className="mt-4 rounded-[18px] border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(9,39,34,0.85),rgba(8,28,25,0.92))] px-4 py-3 text-sm text-emerald-100 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
          {props.successMessage}
        </div>
      ) : null}
    </section>
  );
}
