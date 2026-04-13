import type {
  DeliverySettings,
  GroupProfile,
  MaterialFamily,
  RequestDetail,
  RequestDeliveryFormState,
  RequestItem,
  RequestItemFormState,
  RecentRequest,
  Summary,
} from "../../shared/types";
import { RequestsDetailPanel } from "./detail-panel";
import { RequestsListPanel } from "./list-panel";
import { RequestsOverviewPanel } from "./overview-panel";

// Экран логистики: верхняя сводка, список заявок и карточка активной заявки.
export function RequestsScreen(props: {
  summary: Summary | null;
  requests: RecentRequest[];
  families: MaterialFamily[];
  groups: GroupProfile[];
  deliverySettings: DeliverySettings | null;
  loading: boolean;
  requestsLoading: boolean;
  requestDetail: RequestDetail | null;
  requestDetailLoading: boolean;
  selectedRequestId: number | null;
  requestActionId: number | null;
  overviewError: string | null;
  requestDetailBusyKey: string | null;
  error: string | null;
  onReload: () => Promise<void>;
  onSelectRequest: (draftId: number) => void;
  onChangeStatus: (draftId: number, status: string) => Promise<void>;
  onDeleteRequest: (draftId: number) => Promise<void>;
  onSaveDelivery: (draftId: number, form: RequestDeliveryFormState) => Promise<boolean>;
  onCreateItem: (draftId: number, form: RequestItemFormState) => Promise<boolean>;
  onUpdateItem: (item: RequestItem, form: RequestItemFormState) => Promise<boolean>;
  onDeleteItem: (draftId: number, itemId: number) => Promise<boolean>;
}) {
  return (
    <div className="space-y-4">
      <RequestsOverviewPanel
        summary={props.summary}
        requests={props.requests}
        families={props.families}
        groups={props.groups}
        deliverySettings={props.deliverySettings}
        loading={props.loading}
        error={props.overviewError}
      />

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.32fr]">
        <RequestsListPanel
          requests={props.requests}
          requestsLoading={props.requestsLoading}
          selectedRequestId={props.selectedRequestId}
          requestActionId={props.requestActionId}
          error={props.error}
          onReload={props.onReload}
          onSelectRequest={props.onSelectRequest}
          onChangeStatus={props.onChangeStatus}
          onDeleteRequest={props.onDeleteRequest}
        />

        <RequestsDetailPanel
          requestDetail={props.requestDetail}
          requestDetailLoading={props.requestDetailLoading}
          requestDetailBusyKey={props.requestDetailBusyKey}
          onSaveDelivery={props.onSaveDelivery}
          onCreateItem={props.onCreateItem}
          onUpdateItem={props.onUpdateItem}
          onDeleteItem={props.onDeleteItem}
        />
      </div>
    </div>
  );
}
