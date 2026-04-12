import type { FormEvent } from "react";
import type { DeliverySettings, GroupProfile } from "./app-types";
import { TimeField } from "./app-ui";
import { formatAddress } from "./app-utils";

// Экран настроек доставки и последних профилей групп.

export function SettingsScreen(props: {
  deliveryForm: DeliverySettings;
  groups: GroupProfile[];
  savingDelivery: boolean;
  error: string | null;
  onChangeDelivery: (value: DeliverySettings) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[0.95fr_1.15fr]">
      <section className="glass-panel p-4">
        <div className="eyebrow">Доставка</div>
        <h3 className="section-title mt-1.5">Глобальные часы и fallback</h3>

        {props.error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {props.error}
          </div>
        ) : null}

        <form className="mt-3 space-y-3" onSubmit={(event) => void props.onSubmit(event)}>
          <div className="grid gap-3 md:grid-cols-3">
            <TimeField
              label="Старт окна"
              value={props.deliveryForm.delivery_start}
              onChange={(value) => props.onChangeDelivery({ ...props.deliveryForm, delivery_start: value })}
            />
            <TimeField
              label="Конец окна"
              value={props.deliveryForm.delivery_end}
              onChange={(value) => props.onChangeDelivery({ ...props.deliveryForm, delivery_end: value })}
            />
            <TimeField
              label="Предлагаемый слот"
              value={props.deliveryForm.delivery_fallback}
              onChange={(value) => props.onChangeDelivery({ ...props.deliveryForm, delivery_fallback: value })}
            />
          </div>

          <button type="submit" className="action-button" disabled={props.savingDelivery}>
            {props.savingDelivery ? "Сохраняю..." : "Сохранить окно доставки"}
          </button>
        </form>
      </section>

      <section className="glass-panel p-4">
        <div className="eyebrow">Объекты</div>
        <h3 className="section-title mt-1.5">Последние профили групп</h3>
        <div className="mt-3 space-y-2">
          {props.groups.map((group) => (
            <div key={group.chat_id} className="subpanel px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{group.object_name ?? group.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{formatAddress(group)}</div>
                </div>
                <div className="slot-chip">
                  {group.delivery_start ?? "—"} - {group.delivery_end ?? "—"}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Лифт: {group.elevator ?? "не указан"} · Этаж: {group.floor ?? "—"}
              </div>
            </div>
          ))}

          {!props.groups.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Профили групп пока не заполнены.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
