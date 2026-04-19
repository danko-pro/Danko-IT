import { Button } from "../../shared/controls";
import { formatMoney, getDoorDisplayTitle, getDoorKindLabel, trimFloat } from "./calculator-shared";
import type { DoorsProjectPanelProps } from "./calculator-doors-stage-project-types";

type DoorsProjectListProps = Pick<
  DoorsProjectPanelProps,
  "projectDetail" | "selectedDoor" | "setSelectedDoorId" | "busyKey" | "startDoorEdit" | "onDeleteProjectDoor"
>;

// Список проектных дверей и проёмов.
// Панель отвечает только за выбор двери, краткий обзор позиции и действия edit/delete.

export function DoorsProjectList(props: DoorsProjectListProps) {
  return (
    <>
      <div className="section-separator">
        <span>Двери проекта</span>
      </div>

      <div className="space-y-2">
        {props.projectDetail.doors.map((door) => (
          <div key={door.id} className={props.selectedDoor?.id === door.id ? "dense-row dense-row-active" : "dense-row"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => props.setSelectedDoorId(door.id)}>
                <div className="text-sm font-semibold text-slate-100">{getDoorDisplayTitle(door)}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                  <span className="stat-chip">{getDoorKindLabel(door.opening_kind)}</span>
                  {door.area_m2 ? <span className="stat-chip">{trimFloat(door.area_m2)} м²</span> : null}
                  <span className="stat-chip">
                    {door.room_a_name ?? "—"} ↔ {door.room_b_name ?? "—"}
                  </span>
                  <span className="stat-chip">Комплект {formatMoney(door.components_sale_total ?? 0)}</span>
                  <span className="stat-chip">Итог {formatMoney(door.effective_sale_price ?? 0)}</span>
                  {door.effective_install_price ? (
                    <span className="stat-chip">Монтаж {formatMoney(door.effective_install_price)}</span>
                  ) : null}
                </div>
                {door.note ? <div className="mt-1 text-[12px] text-slate-500">{door.note}</div> : null}
              </button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="micro" onClick={() => props.startDoorEdit(door)}>
                  Редактировать
                </Button>
                <Button
                  type="button"
                  variant="micro"
                  tone="danger"
                  disabled={props.busyKey === `calculator-project-door-delete-${door.id}`}
                  onClick={() => void props.onDeleteProjectDoor(door.id)}
                >
                  {props.busyKey === `calculator-project-door-delete-${door.id}` ? "..." : "Удалить"}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {!props.projectDetail.doors.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Пока нет дверей и проемов для этого проекта.
          </div>
        ) : null}
      </div>
    </>
  );
}
