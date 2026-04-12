import type { DeliverySettings, GroupProfile, MaterialFamily, RecentRequest, Summary } from "./app-types";
import { MetricCard, SettingCard, StatusBadge } from "./app-ui";
import { formatDeliveryWindow, formatStatus, toneForStatus } from "./app-utils";

// Экран дашборда: краткая сводка по заявкам, объектам и каталогу.

export function DashboardScreen(props: {
  summary: Summary | null;
  requests: RecentRequest[];
  families: MaterialFamily[];
  groups: GroupProfile[];
  deliverySettings: DeliverySettings | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      {props.error ? (
        <div className="glass-panel border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {props.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Активные черновики" value={props.summary?.active_drafts_count} accent="cyan" />
        <MetricCard label="Подтверждено сегодня" value={props.summary?.confirmed_today_count} accent="amber" />
        <MetricCard label="Семейств материалов" value={props.summary?.families_count} accent="emerald" />
        <MetricCard label="Новых неизвестных терминов" value={props.summary?.new_unknown_terms_count} accent="rose" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="glass-panel p-4">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Заявки</div>
              <h3 className="section-title mt-1.5">Последние черновики</h3>
            </div>
            <StatusBadge label={`${props.summary?.confirmed_requests_count ?? 0} всего подтверждено`} tone="neutral" />
          </div>

          <div className="space-y-2">
            {props.requests.map((request) => (
              <div key={request.id} className="dense-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      #{request.id} · {request.master_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{request.object_name}</div>
                  </div>
                  <StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} />
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  Позиции: {request.items_count} · Доставка: {formatDeliveryWindow(request)}
                </div>
              </div>
            ))}

            {!props.requests.length && !props.loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Заявок пока нет.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-4">
            <div className="eyebrow">Доставка</div>
            <h3 className="section-title mt-1.5">Глобальные дефолты</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SettingCard title="Старт окна" value={props.deliverySettings?.delivery_start ?? "—"} />
              <SettingCard title="Конец окна" value={props.deliverySettings?.delivery_end ?? "—"} />
              <SettingCard title="Предлагаемый слот" value={props.deliverySettings?.delivery_fallback ?? "—"} />
            </div>
          </div>

          <div className="glass-panel p-4">
            <div className="eyebrow">Объекты</div>
            <h3 className="section-title mt-1.5">Последние группы</h3>
            <div className="mt-3 space-y-2">
              {props.groups.map((group) => (
                <div key={group.chat_id} className="subpanel px-3 py-2.5">
                  <div className="font-medium text-slate-900">{group.object_name ?? group.title}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {group.address ?? "Адрес не распознан"}
                    {group.flat ? `, кв. ${group.flat}` : ""}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Окно доставки: {group.delivery_start ?? "—"} - {group.delivery_end ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-4">
            <div className="eyebrow">Каталог</div>
            <h3 className="section-title mt-1.5">Первые семейства</h3>
            <div className="mt-3 space-y-2">
              {props.families.map((family) => (
                <div key={family.id} className="subpanel px-3 py-2.5">
                  <div className="font-medium text-slate-900">{family.canonical_name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {family.category ?? "Без категории"} · ед. {family.default_unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
