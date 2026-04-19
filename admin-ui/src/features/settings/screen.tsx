import type { FormEvent } from "react";
import { Button } from "../../shared/controls";
import type { DeliverySettings, GroupProfile } from "../../shared/types";
import { TimeField } from "../../shared/ui";
import { formatAddress } from "../../shared/utils";

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
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.15fr]">
      <section className="glass-panel p-5">
        <div className="eyebrow">Доставка</div>
        <h3 className="section-title mt-1.5">Глобальные часы и fallback</h3>
        <p className="panel-note mt-2">Базовое окно отгрузки, которое используется при согласовании доставки и как запасной слот.</p>

        {props.error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {props.error}
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={(event) => void props.onSubmit(event)}>
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

          <Button type="submit" disabled={props.savingDelivery}>
            {props.savingDelivery ? "Сохраняю..." : "Сохранить окно доставки"}
          </Button>
        </form>
      </section>

      <section className="glass-panel p-5">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Объекты</div>
            <h3 className="section-title mt-1.5">Последние профили групп</h3>
            <p className="panel-note mt-2">Профили, привязанные к объектам и адресам, с быстрым обзором текущего окна доставки.</p>
          </div>
          <span className="slot-chip">{props.groups.length}</span>
        </div>

        <div className="mt-3 space-y-3">
          {props.groups.map((group) => (
            <div key={group.chat_id} className="subpanel px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{group.object_name ?? group.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{formatAddress(group)}</div>
                </div>
                <div className="slot-chip">
                  {group.delivery_start ?? "—"} - {group.delivery_end ?? "—"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="stat-chip">Лифт: {group.elevator ?? "не указан"}</span>
                <span className="stat-chip">Этаж: {group.floor ?? "—"}</span>
              </div>
            </div>
          ))}

          {!props.groups.length ? <div className="empty-state">Профили групп пока не заполнены.</div> : null}
        </div>
      </section>
    </div>
  );
}
