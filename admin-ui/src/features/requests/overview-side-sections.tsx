import type { DeliverySettings, GroupProfile, MaterialFamily } from "../../shared/types";

type RequestsOverviewSideSectionsProps = {
  deliverySettings: DeliverySettings | null;
  groups: GroupProfile[];
  families: MaterialFamily[];
};

export function RequestsOverviewSideSections(props: RequestsOverviewSideSectionsProps) {
  return (
    <div className="space-y-3">
      <div className="glass-panel p-4">
        <div className="mb-3">
          <div className="eyebrow">Доставка</div>
          <h3 className="section-title mt-1">Окно по умолчанию</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="dashboard-compact-stat">
            <div className="dashboard-compact-label">Старт</div>
            <div className="dashboard-compact-value">{props.deliverySettings?.delivery_start ?? "—"}</div>
          </div>
          <div className="dashboard-compact-stat">
            <div className="dashboard-compact-label">Конец</div>
            <div className="dashboard-compact-value">{props.deliverySettings?.delivery_end ?? "—"}</div>
          </div>
          <div className="dashboard-compact-stat">
            <div className="dashboard-compact-label">Резерв</div>
            <div className="dashboard-compact-value">{props.deliverySettings?.delivery_fallback ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Объекты</div>
            <h3 className="section-title mt-1">Последние группы</h3>
          </div>
          <span className="slot-chip">{props.groups.length}</span>
        </div>
        <div className="space-y-2.5">
          {props.groups.slice(0, 4).map((group) => (
            <div key={group.chat_id} className="subpanel px-3.5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{group.object_name ?? group.title}</div>
                  <div className="mt-1 text-[12px] text-slate-600">
                    {group.address ?? "Адрес не распознан"}
                    {group.flat ? `, кв. ${group.flat}` : ""}
                  </div>
                </div>
                <span className="slot-chip">
                  {group.delivery_start ?? "—"} - {group.delivery_end ?? "—"}
                </span>
              </div>
            </div>
          ))}

          {!props.groups.length ? <div className="empty-state">Группы пока не появились.</div> : null}
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Каталог</div>
            <h3 className="section-title mt-1">Семейства</h3>
          </div>
          <span className="slot-chip">{props.families.length}</span>
        </div>
        <div className="space-y-2.5">
          {props.families.slice(0, 4).map((family) => (
            <div key={family.id} className="subpanel px-3.5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{family.canonical_name}</div>
                  <div className="mt-1 text-[12px] text-slate-600">
                    {family.category ?? "Без категории"} · ед. {family.default_unit}
                  </div>
                </div>
                <span className="stat-chip">SKU {family.skus_count}</span>
              </div>
            </div>
          ))}

          {!props.families.length ? <div className="empty-state">Каталог пока пустой.</div> : null}
        </div>
      </div>
    </div>
  );
}
