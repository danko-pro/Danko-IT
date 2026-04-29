import { Button } from "./";
import { formatMoney, getDoorDisplayTitle, getDoorKindLabel, trimFloat } from "./";
import type { DoorsProjectPanelProps } from "./";

type DoorsProjectListProps = Pick<
  DoorsProjectPanelProps,
  "projectDetail" | "selectedDoor" | "setSelectedDoorId" | "busyKey" | "startDoorEdit" | "onDeleteProjectDoor"
>;

export function DoorsProjectList(props: DoorsProjectListProps) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Контур проекта</div>
          <div className="calculator-stage-section-title">Двери и проёмы</div>
        </div>
        <div className="calculator-stage-section-note">
          Выберите позицию слева, чтобы отредактировать состав, цены и связанный комплект.
        </div>
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
                  {door.effective_install_price ? <span className="stat-chip">Монтаж {formatMoney(door.effective_install_price)}</span> : null}
                </div>
                {door.note ? <div className="calculator-stage-note-line mt-1">{door.note}</div> : null}
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
          <div className="calculator-stage-empty">
            Пока нет дверей и проёмов для этого проекта.
          </div>
        ) : null}
      </div>
    </div>
  );
}
