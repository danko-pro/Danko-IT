import { Button } from "../../shared/controls";
import type { RecentRequest } from "../../shared/types";
import { StatusBadge } from "../../shared/ui";
import { canDeleteRequest, formatDeliveryWindow, formatStatus, requestActionsForStatus, toneForStatus, waitingForLabel } from "../../shared/utils";

type RequestsListPanelProps = {
  requests: RecentRequest[];
  requestsLoading: boolean;
  selectedRequestId: number | null;
  requestActionId: number | null;
  error: string | null;
  onReload: () => Promise<void>;
  onSelectRequest: (draftId: number) => void;
  onChangeStatus: (draftId: number, status: string) => Promise<void>;
  onDeleteRequest: (draftId: number) => Promise<void>;
};

// Левая панель заявок: список черновиков и быстрые действия по статусам.
export function RequestsListPanel(props: RequestsListPanelProps) {
  return (
    <section className="glass-panel p-5">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Список</div>
          <h3 className="section-title mt-1.5">Последние заявки</h3>
          <p className="panel-note mt-2">Активные черновики и быстрые действия по статусам без перехода в Telegram.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="slot-chip">{props.requests.length}</span>
          <Button variant="secondary" onClick={() => void props.onReload()}>
            Обновить
          </Button>
        </div>
      </div>

      {props.error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {props.error}
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-[72px_minmax(0,1fr)_96px] gap-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <div>ID</div>
        <div>Мастер / объект</div>
        <div className="text-right">Статус</div>
      </div>

      <div className="space-y-3">
        {props.requests.map((request) => {
          const active = props.selectedRequestId === request.id;
          const actions = requestActionsForStatus(request.status);
          const busy = props.requestActionId === request.id;

          return (
            <div key={request.id} className={active ? "dense-row dense-row-active" : "dense-row"}>
              <button type="button" className="block w-full text-left" onClick={() => props.onSelectRequest(request.id)}>
                <div className="grid grid-cols-[72px_minmax(0,1fr)_96px] items-start gap-3">
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-100">#{request.id}</div>
                    <div className="mt-2">
                      <span className="stat-chip">{request.items_count} поз.</span>
                    </div>
                  </div>

                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-semibold text-slate-100">{request.master_name}</div>
                    <div className="mt-0.5 truncate text-[12px] text-slate-400">{request.object_name}</div>
                    <div className="mt-2 truncate text-[12px] text-slate-500">
                      {request.waiting_for ? waitingForLabel(request.waiting_for) : "Без активного шага"} · {formatDeliveryWindow(request)}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} />
                  </div>
                </div>
              </button>

              {actions.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/6 pt-3">
                  {actions.map((action) => (
                    <Button
                      key={action.status}
                      variant="micro"
                      disabled={busy}
                      onClick={() => void props.onChangeStatus(request.id, action.status)}
                    >
                      {busy ? "..." : action.label}
                    </Button>
                  ))}

                  {canDeleteRequest(request.status) ? (
                    <Button
                      variant="micro"
                      tone="danger"
                      disabled={busy}
                      onClick={() => void props.onDeleteRequest(request.id)}
                    >
                      {busy ? "..." : "Удалить"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {!props.requests.length && !props.requestsLoading ? (
          <div className="empty-state">В базе пока нет активных или последних заявок.</div>
        ) : null}
      </div>
    </section>
  );
}
