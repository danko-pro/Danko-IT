import { type FormEvent, useEffect, useState } from "react";
import type { RequestDetail, RequestDeliveryFormState, RequestItem, RequestItemFormState } from "./app-types";
import { emptyRequestDeliveryForm, emptyRequestItemForm } from "./app-types";
import { Field, InfoCard } from "./app-ui";
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
} from "./app-utils";

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

  return (
    <section className="glass-panel p-4">
      <div className="panel-header">
        <div className="eyebrow">Карточка</div>
        <h3 className="panel-title">Детали черновика</h3>
      </div>

      {props.requestDetailLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
          Загружаю карточку заявки...
        </div>
      ) : null}

      {!props.requestDetailLoading && props.requestDetail ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard label="Мастер" value={props.requestDetail.draft.master_name} />
            <InfoCard label="Статус" value={formatStatus(props.requestDetail.draft.status)} />
            <InfoCard
              label="Ожидает"
              value={props.requestDetail.draft.waiting_for ? waitingForLabel(props.requestDetail.draft.waiting_for) : "—"}
            />
            <InfoCard label="Обновлено" value={formatDateTime(props.requestDetail.draft.updated_at)} />
          </div>

          <div className="subpanel p-3.5">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Объект</div>
            <div className="mt-1.5 text-sm font-semibold text-slate-900">
              {props.requestDetail.group_profile?.object_name ?? props.requestDetail.group_profile?.title ?? "Без объекта"}
            </div>
            <div className="mt-1 text-[12px] text-slate-600">{formatAddress(props.requestDetail.group_profile)}</div>
            <div className="mt-2 text-[12px] text-slate-600">Доставка: {formatDraftDelivery(props.requestDetail.draft)}</div>

            <form className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => void handleDeliverySubmit(event)}>
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

          <div className="subpanel p-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Позиции</div>
              <div className="text-[11px] text-slate-500">Правка вручную без Telegram</div>
            </div>
            <div className="space-y-2">
              {props.requestDetail.items.map((item, index) => (
                <div key={item.id} className="rounded-[12px] border border-cyan-400/10 bg-slate-950/82 px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {index + 1}. {itemTitle(item)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-sm text-slate-600">
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
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="micro-action micro-action-danger"
                        disabled={props.requestDetailBusyKey === `delete-item-${item.id}`}
                        onClick={() => void props.onDeleteItem(props.requestDetail!.draft.id, item.id)}
                      >
                        {props.requestDetailBusyKey === `delete-item-${item.id}` ? "..." : "Удалить"}
                      </button>
                    </div>
                  </div>

                  {editingItemId === item.id ? (
                    <form
                      className="mt-3 space-y-2 border-t border-cyan-400/10 pt-3"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const saved = await props.onUpdateItem(item, editingItemForm);
                        if (saved) {
                          setEditingItemId(null);
                          setEditingItemForm(emptyRequestItemForm);
                        }
                      }}
                    >
                      <div className="grid gap-2 md:grid-cols-2">
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
                      <div className="grid gap-2 md:grid-cols-5">
                        <Field
                          label="Количество"
                          value={editingItemForm.quantity}
                          onChange={(value) => setEditingItemForm((current) => ({ ...current, quantity: value }))}
                          placeholder="Например, 12"
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

              {!props.requestDetail.items.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  В этой заявке пока нет позиций.
                </div>
              ) : null}
            </div>

            <form className="mt-3 space-y-2 border-t border-cyan-400/10 pt-3" onSubmit={(event) => void handleNewItemSubmit(event)}>
              <div className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-500">Добавить позицию вручную</div>
              <div className="grid gap-2 md:grid-cols-2">
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
              <div className="grid gap-2 md:grid-cols-5">
                <Field
                  label="Количество"
                  value={newItemForm.quantity}
                  onChange={(value) => setNewItemForm((current) => ({ ...current, quantity: value }))}
                  placeholder="Например, 250"
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
      ) : null}

      {!props.requestDetailLoading && !props.requestDetail ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Выберите заявку слева, чтобы открыть карточку.
        </div>
      ) : null}
    </section>
  );
}
