import { DoorsProjectComponentsForm } from "./";
import { DoorsProjectComponentsHeader } from "./";
import { DoorsProjectComponentsList } from "./";
import type {
  DoorsProjectComponentsPanelProps,
  DoorsProjectComponentsReadyProps,
} from "./";

export function DoorsProjectComponentsPanel(props: DoorsProjectComponentsPanelProps) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Комплектация</div>
          <div className="calculator-stage-section-title">Состав и цены выбранной двери</div>
        </div>
        <div className="calculator-stage-section-note">
          Управление комплектующими, продажной ценой и закупкой для выбранной дверной позиции.
        </div>
      </div>

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
        <div className="calculator-stage-empty">
          Выберите дверь слева, чтобы редактировать её комплектацию.
        </div>
      )}
    </div>
  );
}
