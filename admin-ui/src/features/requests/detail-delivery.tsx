import { Button } from "../../shared/controls";
import type { RequestDeliveryFormState, RequestDetail } from "../../shared/types";
import { formatAddress, formatDraftDelivery } from "../../shared/utils";

type RequestsDetailDeliveryProps = {
  requestDetail: RequestDetail;
  deliveryEditForm: RequestDeliveryFormState;
  setDeliveryEditForm: React.Dispatch<React.SetStateAction<RequestDeliveryFormState>>;
  deliveryBusy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function RequestsDetailDelivery(props: RequestsDetailDeliveryProps) {
  return (
    <div className="subpanel p-4">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Объект</div>
          <h3 className="section-title mt-1.5">
            {props.requestDetail.group_profile?.object_name ?? props.requestDetail.group_profile?.title ?? "Без объекта"}
          </h3>
          <p className="panel-note mt-2">{formatAddress(props.requestDetail.group_profile)}</p>
        </div>
        <span className="slot-chip">{formatDraftDelivery(props.requestDetail.draft)}</span>
      </div>

      <form
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={(event) => void props.onSubmit(event)}
      >
        <label className="block">
          <div className="field-label">Дата доставки</div>
          <input
            type="date"
            className="text-input"
            value={props.deliveryEditForm.delivery_date}
            onChange={(event) =>
              props.setDeliveryEditForm((current) => ({
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
            value={props.deliveryEditForm.delivery_time}
            onChange={(event) =>
              props.setDeliveryEditForm((current) => ({
                ...current,
                delivery_time: event.target.value,
              }))
            }
          />
        </label>

        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto" disabled={props.deliveryBusy}>
            {props.deliveryBusy ? "Сохраняю..." : "Сохранить доставку"}
          </Button>
        </div>
      </form>
    </div>
  );
}
