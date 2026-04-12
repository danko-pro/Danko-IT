import type { RecentRequest } from "./app-types";
import { StatusBadge } from "./app-ui";
import { canDeleteRequest, formatDeliveryWindow, formatStatus, requestActionsForStatus, toneForStatus, waitingForLabel } from "./app-utils";

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
    <section className="glass-panel p-4">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Список</div>
          <h3 className="section-title mt-1.5">Последние заявки</h3>
        </div>
        <button type="button" className="secondary-button" onClick={() => void props.onReload()}>
          Обновить
        </button>
      </div>

      {props.error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {props.error}
        </div>
      ) : null}

      <div className="mb-2 grid grid-cols-[72px_minmax(0,1fr)_90px] gap-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <div>ID</div>
        <div>Мастер / объект</div>
        <div className="text-right">Статус</div>
      </div>

      <div className="space-y-2">
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
                    <div className="mt-1 row-kicker">{request.items_count} поз.</div>
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-semibold text-slate-100">{request.master_name}</div>
                    <div className="mt-0.5 truncate text-[12px] text-slate-400">{request.object_name}</div>
                    <div className="mt-1 truncate text-[12px] text-slate-500">
                      {request.waiting_for ? waitingForLabel(request.waiting_for) : "Без активного шага"} ·{" "}
                      {formatDeliveryWindow(request)}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} />
                  </div>
                </div>
              </button>

              {actions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-cyan-400/8 pt-2">
                  {actions.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className="micro-action"
                      disabled={busy}
                      onClick={() => void props.onChangeStatus(request.id, action.status)}
                    >
                      {busy ? "..." : action.label}
                    </button>
                  ))}
                  {canDeleteRequest(request.status) ? (
                    <button
                      type="button"
                      className="micro-action micro-action-danger"
                      disabled={busy}
                      onClick={() => void props.onDeleteRequest(request.id)}
                    >
                      {busy ? "..." : "Удалить"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {!props.requests.length && !props.requestsLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            В базе пока нет активных или последних заявок.
          </div>
        ) : null}
      </div>
    </section>
  );
}
