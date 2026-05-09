import { Button, DeleteButton } from "./";
import { CalculatorStageEmptyState, CalculatorStageSectionHeader, DenseRow, StatChip } from "./";
import { formatMoney, getDoorDisplayTitle, getDoorKindLabel, trimFloat } from "./";
import type { DoorsProjectPanelProps } from "./";

type DoorsProjectListProps = Pick<
  DoorsProjectPanelProps,
  "projectDetail" | "selectedDoor" | "setSelectedDoorId" | "busyKey" | "startDoorEdit" | "onDeleteProjectDoor"
>;

export function DoorsProjectList(props: DoorsProjectListProps) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <CalculatorStageSectionHeader
        kicker="Контур проекта"
        title="Двери и проёмы"
        note="Выберите позицию слева, чтобы отредактировать состав, цены и связанный комплект."
      />

      <div className="space-y-2">
        {props.projectDetail.doors.map((door) => (
          <DenseRow key={door.id} active={props.selectedDoor?.id === door.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => props.setSelectedDoorId(door.id)}>
                <div className="text-sm font-semibold text-slate-100">{getDoorDisplayTitle(door)}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                  <StatChip>{getDoorKindLabel(door.opening_kind)}</StatChip>
                  {door.area_m2 ? <StatChip>{trimFloat(door.area_m2)} м²</StatChip> : null}
                  <StatChip>
                    {door.room_a_name ?? "—"} ↔ {door.room_b_name ?? "—"}
                  </StatChip>
                  <StatChip>Комплект {formatMoney(door.components_sale_total ?? 0)}</StatChip>
                  <StatChip>Итог {formatMoney(door.effective_sale_price ?? 0)}</StatChip>
                  {door.effective_install_price ? <StatChip>Монтаж {formatMoney(door.effective_install_price)}</StatChip> : null}
                </div>
                {door.note ? <div className="calculator-stage-note-line mt-1">{door.note}</div> : null}
              </button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="micro" onClick={() => props.startDoorEdit(door)}>
                  Редактировать
                </Button>
                <DeleteButton
                  type="button"
                  busy={props.busyKey === `calculator-project-door-delete-${door.id}`}
                  onClick={() => void props.onDeleteProjectDoor(door.id)}
                />
              </div>
            </div>
          </DenseRow>
        ))}

        {!props.projectDetail.doors.length ? (
          <CalculatorStageEmptyState>
            Пока нет дверей и проёмов для этого проекта.
          </CalculatorStageEmptyState>
        ) : null}
      </div>
    </div>
  );
}
