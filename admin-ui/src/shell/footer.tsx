import { StatusBadge } from "../shared/ui";
import { API_BASE } from "../shared/utils";

export function AppShellFooter(props: { loading: boolean }) {
  return (
    <footer className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={props.loading ? "Синхронизация" : "API online"} tone={props.loading ? "warn" : "ok"} />
        <span className="slot-chip">React + FastAPI</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span>API {API_BASE}</span>
      </div>
    </footer>
  );
}
