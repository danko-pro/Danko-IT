import { type FormEvent, useEffect, useState } from "react";
import type { RequestDetail, RequestDeliveryFormState, RequestItem, RequestItemFormState } from "../../shared/types";
import { emptyRequestDeliveryForm, emptyRequestItemForm } from "../../shared/types";
import { Field, InfoCard } from "../../shared/ui";
import {
  formatAddress,
  formatDateTime,
  formatDimensions,
  formatDraftDelivery,
  formatQuantity,
  formatStatus,
  itemTitle,
  requestItemFormFromItem,
  waitingForLabel,
} from "../../shared/utils";

type RequestsDetailPanelProps = {
  requestDetail: RequestDetail | null;
  requestDetailLoading: boolean;
  requestDetailBusyKey: string | null;
  onSaveDelivery: (draftId: number, form: RequestDeliveryFormState) => Promise<boolean>;
  onCreateItem: (draftId: number, form: RequestItemFormState) => Promise<boolean>;
  onUpdateItem: (item: RequestItem, form: RequestItemFormState) => Promise<boolean>;
  onDeleteItem: (draftId: number, itemId: number) => Promise<boolean>;
};

// Правая панель заявок: карточка, доставка и ручное редактирование позиций.
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

  function beginEditItem(item: RequestItem) {
    setEditingItemId(item.id);
    setEditingItemForm(requestItemFormFromItem(item));
  }

  if (props.requestDetailLoading) {
    return (
      <section className="glass-panel p-5">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Карточка</div>
            <h3 className="panel-title">Детали черновика</h3>
          </div>
        </div>
        <div className="empty-state">Загружаю карточку заявки...</div>
      </section>
    );
  }

  if (!props.requestDetail) {
    return (
      <section className="glass-panel p-5">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Карточка</div>
            <h3 className="panel-title">Детали черновика</h3>
          </div>
        </div>
        <div className="empty-state">Выберите заявку слева, чтобы открыть карточку.</div>
      </section>
    );
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

        <div className="subpanel p-4">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Объект</div>
              <h3 className="section-title mt-1.5">
                {requestDetail.group_profile?.object_name ?? requestDetail.group_profile?.title ?? "Без объекта"}
              </h3>
              <p className="panel-note mt-2">{formatAddress(requestDetail.group_profile)}</p>
            </div>
            <span className="slot-chip">{formatDraftDelivery(requestDetail.draft)}</span>
          </div>

          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => void handleDeliverySubmit(event)}>
            <label className="block">
              <div className="field-label">Дата доставки</div>
              <input
                type="date"
                className="text-input"
                value={deliveryEditForm.delivery_date}
                onChange={(event) =>
                  setDeliveryEditForm((current) => ({
                    ...current,
                    delivery_date: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block">
              <div className="field-label">Время доставки</div>
              <input
                type="time"
                className="text-input"
                value={deliveryEditForm.delivery_time}
                onChange={(event) =>
                  setDeliveryEditForm((current) => ({
                    ...current,
                    delivery_time: event.target.value,
                  }))
                }
              />
            </label>

            <div className="flex items-end">
              <button type="submit" className="action-button w-full md:w-auto" disabled={deliveryBusy}>
                {deliveryBusy ? "Сохраняю..." : "Сохранить доставку"}
              </button>
            </div>
          </form>
        </div>

        <div className="subpanel p-4">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Позиции</div>
              <h3 className="section-title mt-1.5">Состав заявки</h3>
            </div>
            <span className="slot-chip">{requestDetail.items.length}</span>
          </div>

          <div className="space-y-3">
            {requestDetail.items.map((item, index) => (
              <div key={item.id} className="dense-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="slot-chip">{index + 1}</span>
                      <div className="text-sm font-medium text-slate-900">{itemTitle(item)}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.length_mm || item.width_mm || item.thickness_mm ? (
                        <span className="stat-chip">{formatDimensions(item)}</span>
                      ) : null}
                      {item.quantity ? <span className="stat-chip">{formatQuantity(item.quantity, item.unit ?? "шт")}</span> : null}
                      {item.note ? <span className="stat-chip">{item.note}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="micro-action"
                      disabled={props.requestDetailBusyKey === `item-${item.id}`}
                      onClick={() => beginEditItem(item)}
                    >
                      ????????
                    </button>
                    <button
                      type="button"
                      className="micro-action micro-action-danger"
                      disabled={props.requestDetailBusyKey === `delete-item-${item.id}`}
                      onClick={() => void props.onDeleteItem(requestDetail.draft.id, item.id)}
                    >
                      {props.requestDetailBusyKey === `delete-item-${item.id}` ? "..." : "Удалить"}
                    </button>
                  </div>
                </div>

                {editingItemId === item.id ? (
                  <form
                    className="mt-4 space-y-3 border-t border-white/6 pt-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const saved = await props.onUpdateItem(item, editingItemForm);
                      if (saved) {
                        setEditingItemId(null);
                        setEditingItemForm(emptyRequestItemForm);
                      }
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field
                        label="Название позиции"
                        value={editingItemForm.title}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, title: value }))}
                        placeholder="Например, труба канализационная 50"
                      />
                      <Field
                        label="Комментарий"
                        value={editingItemForm.note}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, note: value }))}
                        placeholder="Примечание по позиции"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      <Field
                        label="Количество"
                        value={editingItemForm.quantity}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, quantity: value }))}
                        placeholder="12"
                      />
                      <Field
                        label="Ед."
                        value={editingItemForm.unit}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, unit: value }))}
                        placeholder="шт"
                      />
                      <Field
                        label="Толщина, мм"
                        value={editingItemForm.thickness_mm}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, thickness_mm: value }))}
                        placeholder="12.5"
                      />
                      <Field
                        label="Длина, мм"
                        value={editingItemForm.length_mm}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, length_mm: value }))}
                        placeholder="3000"
                      />
                      <Field
                        label="Ширина, мм"
                        value={editingItemForm.width_mm}
                        onChange={(value) => setEditingItemForm((current) => ({ ...current, width_mm: value }))}
                        placeholder="1200"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="action-button" disabled={props.requestDetailBusyKey === `item-${item.id}`}>
                        {props.requestDetailBusyKey === `item-${item.id}` ? "Сохраняю..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setEditingItemId(null);
                          setEditingItemForm(emptyRequestItemForm);
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ))}

            {!requestDetail.items.length ? <div className="empty-state">В этой заявке пока нет позиций.</div> : null}
          </div>
        </div>

        <div className="subpanel p-4">
          <div className="eyebrow">Добавить позицию</div>
          <h3 className="section-title mt-1.5">Ручное добавление</h3>

          <form className="mt-4 space-y-3" onSubmit={(event) => void handleNewItemSubmit(event)}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Название позиции"
                value={newItemForm.title}
                onChange={(value) => setNewItemForm((current) => ({ ...current, title: value }))}
                placeholder="Например, саморезы по ГКЛ 32 мм"
              />
              <Field
                label="Комментарий"
                value={newItemForm.note}
                onChange={(value) => setNewItemForm((current) => ({ ...current, note: value }))}
                placeholder="Если нужен комментарий"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <Field
                label="Количество"
                value={newItemForm.quantity}
                onChange={(value) => setNewItemForm((current) => ({ ...current, quantity: value }))}
                placeholder="250"
              />
              <Field
                label="Ед."
                value={newItemForm.unit}
                onChange={(value) => setNewItemForm((current) => ({ ...current, unit: value }))}
                placeholder="шт"
              />
              <Field
                label="Толщина, мм"
                value={newItemForm.thickness_mm}
                onChange={(value) => setNewItemForm((current) => ({ ...current, thickness_mm: value }))}
                placeholder="12.5"
              />
              <Field
                label="Длина, мм"
                value={newItemForm.length_mm}
                onChange={(value) => setNewItemForm((current) => ({ ...current, length_mm: value }))}
                placeholder="3000"
              />
              <Field
                label="Ширина, мм"
                value={newItemForm.width_mm}
                onChange={(value) => setNewItemForm((current) => ({ ...current, width_mm: value }))}
                placeholder="1200"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="action-button" disabled={createItemBusy}>
                {createItemBusy ? "Добавляю..." : "Добавить позицию"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function StatusPill(props: { value: string }) {
  return <span className="slot-chip">{props.value}</span>;
}

