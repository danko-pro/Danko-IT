import type { AdminAuthSession } from "../shared/types";

import { Button } from "../shared/controls";
import { StatusBadge } from "../shared/ui";
import { API_BASE } from "../shared/utils";

export function AppShellFooter(props: {
  loading: boolean;
  authSession: AdminAuthSession | null;
  authPending: boolean;
  onLogout: () => Promise<void>;
}) {
  const authEnabled = props.authSession?.auth_enabled ?? false;
  const authenticated = props.authSession?.authenticated ?? false;
  const authLabel = authEnabled ? (authenticated ? "Сессия активна" : "Без доступа") : "Локальный режим";
  const authTone = authEnabled ? (authenticated ? "active" : "error") : "neutral";

  return (
    <footer className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={props.loading ? "Синхронизация" : "API доступен"} tone={props.loading ? "warn" : "ok"} />
        <StatusBadge label={authLabel} tone={authTone} />
        <span className="slot-chip">Интерфейс + API</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span>API {API_BASE}</span>
        {authEnabled && authenticated ? (
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-2 text-xs"
            disabled={props.authPending}
            onClick={() => void props.onLogout()}
          >
            {props.authPending ? "Выход..." : "Выйти"}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}
