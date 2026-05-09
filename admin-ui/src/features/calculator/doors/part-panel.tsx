import { DoorsProjectComponentsForm } from "./";
import { DoorsProjectComponentsHeader } from "./";
import { DoorsProjectComponentsList } from "./";
import { CalculatorStageEmptyState, CalculatorStageSectionHeader } from "./";
import type {
  DoorsProjectComponentsPanelProps,
  DoorsProjectComponentsReadyProps,
} from "./";

export function DoorsProjectComponentsPanel(props: DoorsProjectComponentsPanelProps) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <CalculatorStageSectionHeader
        kicker="Комплектация"
        title="Состав и цены выбранной двери"
        note="Управление комплектующими, продажной ценой и закупкой для выбранной дверной позиции."
      />

      <DoorsProjectComponentsHeader selectedDoor={props.selectedDoor} />

      {props.selectedDoor ? (
        <>
          <DoorsProjectComponentsForm {...(props as DoorsProjectComponentsReadyProps)} />
          <DoorsProjectComponentsList
            selectedDoor={props.selectedDoor}
            busyKey={props.busyKey}
            startDoorComponentEdit={props.startDoorComponentEdit}
            onDeleteProjectDoorComponent={props.onDeleteProjectDoorComponent}
          />
        </>
      ) : (
        <CalculatorStageEmptyState>
          Выберите дверь слева, чтобы редактировать её комплектацию.
        </CalculatorStageEmptyState>
      )}
    </div>
  );
}
