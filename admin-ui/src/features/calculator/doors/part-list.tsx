import { Button, DeleteButton } from "./";
import { CalculatorStageEmptyState, DenseRow, StatChip } from "./";
import { formatMoney, getDoorComponentCategoryLabel, trimFloat } from "./";
import type { DoorsProjectComponentsReadyProps } from "./";

type DoorsProjectComponentsListProps = Pick<
  DoorsProjectComponentsReadyProps,
  "selectedDoor" | "busyKey" | "startDoorComponentEdit" | "onDeleteProjectDoorComponent"
>;

export function DoorsProjectComponentsList(props: DoorsProjectComponentsListProps) {
  return (
    <div className="space-y-2">
      {(props.selectedDoor.components ?? []).map((component) => (
        <DenseRow key={component.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-100">{component.title}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                <StatChip>{getDoorComponentCategoryLabel(component.category_code)}</StatChip>
                <StatChip>
                  {trimFloat(component.quantity)} {component.unit}
                </StatChip>
                <StatChip>Закуп {formatMoney(component.purchase_total ?? 0)}</StatChip>
                <StatChip>Продажа {formatMoney(component.sale_total ?? 0)}</StatChip>
              </div>
              {component.note ? <div className="mt-1 text-[12px] text-slate-500">{component.note}</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="micro" onClick={() => props.startDoorComponentEdit(component)}>
                Редактировать
              </Button>
              <DeleteButton
                type="button"
                busy={props.busyKey === `calculator-project-door-component-delete-${component.id}`}
                onClick={() => void props.onDeleteProjectDoorComponent(component.id)}
              />
            </div>
          </div>
        </DenseRow>
      ))}

      {!(props.selectedDoor.components ?? []).length ? (
        <CalculatorStageEmptyState>
          Для этой двери пока нет комплектующих. Можно оставить цену одной суммой или собрать её по составу.
        </CalculatorStageEmptyState>
      ) : null}
    </div>
  );
}
