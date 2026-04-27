import type { RecentRequest } from "../../shared/types";
import { StatusBadge } from "../../shared/ui";
import { formatDeliveryWindow, formatStatus, toneForStatus, waitingForLabel } from "../../shared/utils";

type RequestsOverviewPriorityRequestsSectionProps = {
  prioritizedRequests: RecentRequest[];
  confirmedRequestsCount: number;
  loading: boolean;
};

export function RequestsOverviewPriorityRequestsSection(props: RequestsOverviewPriorityRequestsSectionProps) {
  return (
    <div className="glass-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Заявки</div>
          <h3 className="section-title mt-1">Приоритетная лента</h3>
        </div>
        <StatusBadge label={`${props.confirmedRequestsCount} всего подтверждено`} tone="neutral" />
      </div>

      <div className="space-y-2.5">
        {props.prioritizedRequests.map((request) => (
          <div key={request.id} className="dense-row px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="slot-chip">#{request.id}</span>
                  <div className="font-semibold text-slate-900">{request.master_name}</div>
                  {request.waiting_for ? <span className="stat-chip">{waitingForLabel(request.waiting_for)}</span> : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
                  <span>{request.object_name}</span>
                  <span className="text-slate-700">·</span>
                  <span>Позиций {request.items_count}</span>
                  <span className="text-slate-700">·</span>
                  <span>{formatDeliveryWindow(request)}</span>
                </div>
              </div>
              <StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} />
            </div>
          </div>
        ))}

        {!props.prioritizedRequests.length && !props.loading ? <div className="empty-state">Заявок пока нет.</div> : null}
      </div>
    </div>
  );
}
