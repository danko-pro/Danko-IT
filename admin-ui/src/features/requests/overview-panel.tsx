import type { DeliverySettings, GroupProfile, MaterialFamily, RecentRequest, Summary } from "../../shared/types";
import { Button } from "../../shared/controls";
import { RequestsOverviewPriorityRequestsSection } from "./overview-priority-requests-section";
import { RequestsOverviewSideSections } from "./overview-side-sections";
import { RequestsOverviewSummarySection } from "./overview-summary-section";
import { buildStatusOverview, compareRequestsByPriority } from "./overview-utils";

type RequestsOverviewPanelProps = {
  summary: Summary | null;
  requests: RecentRequest[];
  families: MaterialFamily[];
  groups: GroupProfile[];
  deliverySettings: DeliverySettings | null;
  loading: boolean;
  error: string | null;
  onReloadOverview: () => Promise<void>;
};

// Верхняя сводка логистики: статусы, приоритетные заявки, объекты и окно доставки.
export function RequestsOverviewPanel(props: RequestsOverviewPanelProps) {
  const prioritizedRequests = [...props.requests].sort(compareRequestsByPriority).slice(0, 6);
  const { counters: statusCounters, overview: statusOverview } = buildStatusOverview(props.requests);

  return (
    <div className="space-y-4">
      {props.error ? (
        <div className="glass-panel flex items-center justify-between gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{props.error}</span>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-2 text-xs"
            onClick={() => void props.onReloadOverview()}
          >
            Повторить
          </Button>
        </div>
      ) : null}

      <RequestsOverviewSummarySection
        summary={props.summary}
        statusOverview={statusOverview}
        awaitingConfirmationCount={statusCounters.get("awaiting_confirmation") ?? 0}
        loading={props.loading}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.95fr]">
        <RequestsOverviewPriorityRequestsSection
          prioritizedRequests={prioritizedRequests}
          confirmedRequestsCount={props.summary?.confirmed_requests_count ?? 0}
          loading={props.loading}
        />
        <RequestsOverviewSideSections
          deliverySettings={props.deliverySettings}
          groups={props.groups}
          families={props.families}
        />
      </section>
    </div>
  );
}
