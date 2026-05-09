import { Button, DeleteButton } from "../../shared/controls";
import type { RequestDetail, RequestItem, RequestItemFormState } from "../../shared/types";
import { emptyRequestItemForm } from "../../shared/types";
import { formatDimensions, formatQuantity, itemTitle, requestItemFormFromItem } from "../../shared/utils";
import { RequestItemEditor } from "./item-editor";

type RequestsDetailItemsProps = {
  requestDetail: RequestDetail;
  requestDetailBusyKey: string | null;
  editingItemId: number | null;
  editingItemForm: RequestItemFormState;
  setEditingItemForm: React.Dispatch<React.SetStateAction<RequestItemFormState>>;
  setEditingItemId: React.Dispatch<React.SetStateAction<number | null>>;
  onUpdateItem: (item: RequestItem, form: RequestItemFormState) => Promise<boolean>;
  onDeleteItem: (draftId: number, itemId: number) => Promise<boolean>;
};

export function RequestsDetailItems(props: RequestsDetailItemsProps) {
  function beginEditItem(item: RequestItem) {
    props.setEditingItemId(item.id);
    props.setEditingItemForm(requestItemFormFromItem(item));
  }

  return (
    <div className="subpanel p-4">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Позиции</div>
          <h3 className="section-title mt-1.5">Состав заявки</h3>
        </div>
        <span className="slot-chip">{props.requestDetail.items.length}</span>
      </div>

      <div className="space-y-3">
        {props.requestDetail.items.map((item, index) => (
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
                <Button
                  variant="micro"
                  disabled={props.requestDetailBusyKey === `item-${item.id}`}
                  onClick={() => beginEditItem(item)}
                >
                  Редактировать
                </Button>
                <DeleteButton
                  busy={props.requestDetailBusyKey === `delete-item-${item.id}`}
                  onClick={() => void props.onDeleteItem(props.requestDetail.draft.id, item.id)}
                />
              </div>
            </div>

            {props.editingItemId === item.id ? (
              <RequestItemEditor
                className="mt-4 space-y-3 border-t border-white/6 pt-4"
                form={props.editingItemForm}
                setForm={props.setEditingItemForm}
                busy={props.requestDetailBusyKey === `item-${item.id}`}
                submitLabel="Сохранить"
                busyLabel="Сохраняю..."
                titlePlaceholder="Например, труба канализационная 50"
                notePlaceholder="Примечание по позиции"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const saved = await props.onUpdateItem(item, props.editingItemForm);
                  if (saved) {
                    props.setEditingItemId(null);
                    props.setEditingItemForm(emptyRequestItemForm);
                  }
                }}
                onCancel={() => {
                  props.setEditingItemId(null);
                  props.setEditingItemForm(emptyRequestItemForm);
                }}
              />
            ) : null}
          </div>
        ))}

        {!props.requestDetail.items.length ? <div className="empty-state">В этой заявке пока нет позиций.</div> : null}
      </div>
    </div>
  );
}
