import { type FormEvent, useEffect, useState } from "react";

import { Button } from "../../shared/controls";
import type { RequestDetail, RequestDeliveryFormState, RequestItem, RequestItemFormState } from "../../shared/types";
import { emptyRequestDeliveryForm, emptyRequestItemForm } from "../../shared/types";
import { InfoCard } from "../../shared/ui";
import { formatDateTime, formatStatus, waitingForLabel } from "../../shared/utils";
import { RequestsDetailDelivery } from "./detail-delivery";
import { RequestsDetailItems } from "./detail-items";
import { RequestItemEditor } from "./item-editor";

type RequestsDetailPanelProps = {
  requestDetail: RequestDetail | null;
  requestDetailLoading: boolean;
  requestDetailBusyKey: string | null;
  onSaveDelivery: (draftId: number, form: RequestDeliveryFormState) => Promise<boolean>;
  onCreateItem: (draftId: number, form: RequestItemFormState) => Promise<boolean>;
  onUpdateItem: (item: RequestItem, form: RequestItemFormState) => Promise<boolean>;
  onDeleteItem: (draftId: number, itemId: number) => Promise<boolean>;
};

export function RequestsDetailPanel(props: RequestsDetailPanelProps) {
  const [deliveryEditForm, setDeliveryEditForm] = useState<RequestDeliveryFormState>(emptyRequestDeliveryForm);
  const [newItemForm, setNewItemForm] = useState<RequestItemFormState>(emptyRequestItemForm);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<RequestItemFormState>(emptyRequestItemForm);

  useEffect(() => {
    if (!props.requestDetail) {
      setDeliveryEditForm(emptyRequestDeliveryForm);
      return;
    }

    setDeliveryEditForm({
      delivery_date:
        props.requestDetail.draft.confirmed_delivery_date ?? props.requestDetail.draft.requested_delivery_date ?? "",
      delivery_time:
        props.requestDetail.draft.confirmed_delivery_time ?? props.requestDetail.draft.requested_delivery_time ?? "",
    });
  }, [
    props.requestDetail?.draft.id,
    props.requestDetail?.draft.confirmed_delivery_date,
    props.requestDetail?.draft.confirmed_delivery_time,
    props.requestDetail?.draft.requested_delivery_date,
    props.requestDetail?.draft.requested_delivery_time,
  ]);

  useEffect(() => {
    setNewItemForm(emptyRequestItemForm);
    setEditingItemId(null);
    setEditingItemForm(emptyRequestItemForm);
  }, [props.requestDetail?.draft.id]);

  const activeDraftId = props.requestDetail?.draft.id ?? null;
  const deliveryBusy = activeDraftId !== null && props.requestDetailBusyKey === `delivery-${activeDraftId}`;
  const createItemBusy = activeDraftId !== null && props.requestDetailBusyKey === `create-item-${activeDraftId}`;

  async function handleDeliverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeDraftId === null) {
      return;
    }
    await props.onSaveDelivery(activeDraftId, deliveryEditForm);
  }

  async function handleNewItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeDraftId === null) {
      return;
    }
    const saved = await props.onCreateItem(activeDraftId, newItemForm);
    if (saved) {
      setNewItemForm(emptyRequestItemForm);
    }
  }

  if (props.requestDetailLoading) {
    return <RequestsDetailState message="Загружаю карточку заявки..." />;
  }

  if (!props.requestDetail) {
    return <RequestsDetailState message="Выберите заявку слева, чтобы открыть карточку." />;
  }

  const requestDetail = props.requestDetail;

  return (
    <section className="glass-panel p-5">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Карточка</div>
          <h3 className="panel-title">Детали черновика</h3>
          <p className="panel-note mt-2">Ручная правка доставки и позиций без Telegram-интерфейса.</p>
        </div>
        <StatusPill value={formatStatus(requestDetail.draft.status)} />
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Мастер" value={requestDetail.draft.master_name} />
          <InfoCard label="Статус" value={formatStatus(requestDetail.draft.status)} />
          <InfoCard
            label="Ожидает"
            value={requestDetail.draft.waiting_for ? waitingForLabel(requestDetail.draft.waiting_for) : "—"}
          />
          <InfoCard label="Обновлено" value={formatDateTime(requestDetail.draft.updated_at)} />
        </div>

        <RequestsDetailDelivery
          requestDetail={requestDetail}
          deliveryEditForm={deliveryEditForm}
          setDeliveryEditForm={setDeliveryEditForm}
          deliveryBusy={deliveryBusy}
          onSubmit={handleDeliverySubmit}
        />

        <RequestsDetailItems
          requestDetail={requestDetail}
          requestDetailBusyKey={props.requestDetailBusyKey}
          editingItemId={editingItemId}
          editingItemForm={editingItemForm}
          setEditingItemForm={setEditingItemForm}
          setEditingItemId={setEditingItemId}
          onUpdateItem={props.onUpdateItem}
          onDeleteItem={props.onDeleteItem}
        />

        <div className="subpanel p-4">
          <div className="eyebrow">Добавить позицию</div>
          <h3 className="section-title mt-1.5">Ручное добавление</h3>
          <RequestItemEditor
            className="mt-4 space-y-3"
            form={newItemForm}
            setForm={setNewItemForm}
            busy={createItemBusy}
            submitLabel="Добавить позицию"
            busyLabel="Добавляю..."
            titlePlaceholder="Например, саморезы по ГКЛ 32 мм"
            notePlaceholder="Если нужен комментарий"
            onSubmit={handleNewItemSubmit}
          />
        </div>
      </div>
    </section>
  );
}

function RequestsDetailState(props: { message: string }) {
  return (
    <section className="glass-panel p-5">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Карточка</div>
          <h3 className="panel-title">Детали черновика</h3>
        </div>
      </div>
      <div className="empty-state">{props.message}</div>
    </section>
  );
}

function StatusPill(props: { value: string }) {
  return <span className="slot-chip">{props.value}</span>;
}
