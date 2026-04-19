import { Button } from "../../shared/controls";
import { formatMoney, getDoorComponentCategoryLabel, trimFloat } from "./calculator-shared";
import type { DoorsProjectComponentsReadyProps } from "./calculator-doors-stage-project-types";

type DoorsProjectComponentsListProps = Pick<
  DoorsProjectComponentsReadyProps,
  "selectedDoor" | "busyKey" | "startDoorComponentEdit" | "onDeleteProjectDoorComponent"
>;

export function DoorsProjectComponentsList(props: DoorsProjectComponentsListProps) {
  return (
    <div className="space-y-2">
      {(props.selectedDoor.components ?? []).map((component) => (
        <div key={component.id} className="dense-row">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-100">{component.title}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                <span className="stat-chip">{getDoorComponentCategoryLabel(component.category_code)}</span>
                <span className="stat-chip">
                  {trimFloat(component.quantity)} {component.unit}
                </span>
                <span className="stat-chip">Закуп {formatMoney(component.purchase_total ?? 0)}</span>
                <span className="stat-chip">Продажа {formatMoney(component.sale_total ?? 0)}</span>
              </div>
              {component.note ? <div className="mt-1 text-[12px] text-slate-500">{component.note}</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="micro" onClick={() => props.startDoorComponentEdit(component)}>
                Редактировать
              </Button>
              <Button
                type="button"
                variant="micro"
                tone="danger"
                disabled={props.busyKey === `calculator-project-door-component-delete-${component.id}`}
                onClick={() => void props.onDeleteProjectDoorComponent(component.id)}
              >
                {props.busyKey === `calculator-project-door-component-delete-${component.id}` ? "..." : "Удалить"}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {!(props.selectedDoor.components ?? []).length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Для этой двери пока нет комплектующих. Можно оставить цену одной суммой или собрать её по составу.
        </div>
      ) : null}
    </div>
  );
}
