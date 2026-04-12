import type { RequestDetail, RequestDeliveryFormState, RequestItem, RequestItemFormState, RecentRequest } from "./app-types";
import { RequestsDetailPanel } from "./app-screen-requests-detail";
import { RequestsListPanel } from "./app-screen-requests-list";

// Экран заявок: shell из списка черновиков и карточки активной заявки.
export function RequestsScreen(props: {
  requests: RecentRequest[];
  requestsLoading: boolean;
  requestDetail: RequestDetail | null;
  requestDetailLoading: boolean;
  selectedRequestId: number | null;
  requestActionId: number | null;
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
    <div className="grid gap-3 xl:grid-cols-[0.88fr_1.32fr]">
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
  );
}
