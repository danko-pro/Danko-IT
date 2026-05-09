import { useState } from "react";

import { Button, DeleteButton } from "../../../shared/controls";
import { formatMoney, trimFloat } from "../shared";
import type { CalculatorProjectDoorComponent } from "../doors/model";
import type { DoorsStageReadyProps } from "../doors/types";
import { DoorWorkbenchComponentComposer, DoorWorkbenchDoorComposer } from "./composers";
import { IconCheck, IconClose, IconDots, autosaveLabel } from "./editor-parts";
import { DoorActionMenu, DoorKitPills } from "./focus-actions";
import { componentLabel, doorArea, doorMarginText, doorMoneyLine, doorRooms, doorSize, doorTitle } from "./helpers";

type DoorWorkbenchFocusProps = Pick<
  DoorsStageReadyProps,
  | "projectDetail"
  | "selectedDoor"
  | "projectDoorState"
  | "setProjectDoorState"
  | "projectDoorAutosaveState"
  | "editingDoorId"
  | "projectDoorComponentState"
  | "setProjectDoorComponentState"
  | "editingDoorComponentId"
  | "busyKey"
  | "handleProjectDoorSubmit"
  | "duplicateSelectedProjectDoor"
  | "closeDoorEditor"
  | "resetDoorForm"
  | "handleProjectDoorComponentSubmit"
  | "startDoorComponentEdit"
  | "resetDoorComponentForm"
  | "onDeleteProjectDoor"
  | "onDeleteProjectDoorComponent"
>;

export function DoorWorkbenchFocus(props: DoorWorkbenchFocusProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedDoor = props.selectedDoor;
  const canEditDoor = props.editingDoorId !== null && selectedDoor !== null;
  const saveBusy = selectedDoor !== null && props.busyKey === `calculator-project-door-save-${selectedDoor.id}`;
  return (
    <section className="doors-workbench-panel doors-workbench-focus" data-testid="doors-workbench-focus">
      <div className="doors-workbench-focus-shell">
        <DoorActionMenu
          open={menuOpen}
          canAct={selectedDoor !== null}
          onDuplicate={() => void props.duplicateSelectedProjectDoor()}
          onReset={props.resetDoorForm}
          onDelete={() => selectedDoor && void props.onDeleteProjectDoor(selectedDoor.id)}
        />
        <div className="doors-workbench-focus-toolbar">
          <div className="doors-workbench-kicker">Редактирование позиции</div>
          <div className="doors-workbench-focus-actions">
            <span className={`doors-workbench-save-state doors-workbench-save-state-${props.projectDoorAutosaveState}`}>
              <IconCheck />
              {autosaveLabel(props.projectDoorAutosaveState, saveBusy)}
            </span>
            <button
              type="button"
              className="doors-workbench-icon-action doors-workbench-icon-action-accent"
              aria-label="Открыть меню действий"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <IconDots />
            </button>
            <button
              type="button"
              className="doors-workbench-icon-action"
              aria-label="Закрыть редактор"
              onClick={props.closeDoorEditor}
            >
              <IconClose />
            </button>
          </div>
        </div>

        <div className="doors-workbench-focus-top">
          <DoorVisual selectedDoor={selectedDoor} />
          <div className="doors-workbench-focus-copy">
            <h2>{doorTitle(selectedDoor)}</h2>
            <div className="doors-workbench-focus-route">{doorRooms(selectedDoor)}</div>
          </div>
          <div className="doors-workbench-focus-total">
            <span>Итого</span>
            <strong>{doorMoneyLine(selectedDoor)}</strong>
          </div>
          <div className="doors-workbench-focus-metrics">
            <Metric label="Размер" value={doorSize(selectedDoor)} />
            <Metric label="Площадь" value={doorArea(selectedDoor)} />
            <Metric label="Комплект" value={formatMoney(selectedDoor?.components_sale_total ?? 0)} />
            <Metric label="Маржа" value={doorMarginText(selectedDoor)} />
          </div>
        </div>
      </div>

      {canEditDoor ? (
        <DoorWorkbenchDoorComposer {...props} />
      ) : (
        <div className="doors-workbench-empty-panel">Выберите дверь слева или добавьте новую, чтобы открыть параметры.</div>
      )}
      {selectedDoor ? (
        <section className="doors-workbench-editor-section doors-workbench-components-section">
          <div className="doors-workbench-editor-section-title">
            <span aria-hidden="true" />
            <h4>Комплектация</h4>
          </div>
          <DoorKitPills {...props} />
          <DoorWorkbenchComponentComposer {...props} />
          <DoorWorkbenchComponentList {...props} />
        </section>
      ) : null}
    </section>
  );
}

function DoorVisual(props: { selectedDoor: DoorsStageReadyProps["selectedDoor"] }) {
  return (
    <div className="doors-workbench-visual" aria-hidden="true">
      <div className="doors-workbench-visual-frame">
        <div className="doors-workbench-visual-leaf">
          <span />
        </div>
      </div>
      <div className="doors-workbench-visual-size">{doorSize(props.selectedDoor)}</div>
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="doors-workbench-metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function DoorWorkbenchComponentList(
  props: Pick<
    DoorsStageReadyProps,
    "selectedDoor" | "busyKey" | "startDoorComponentEdit" | "onDeleteProjectDoorComponent"
  >,
) {
  const components = props.selectedDoor?.components ?? [];
  return (
    <div className="doors-workbench-components">
      <div className="doors-workbench-panel-head doors-workbench-panel-head-compact">
        <div>
          <div className="doors-workbench-kicker">Состав</div>
          <h3>Комплектующие</h3>
        </div>
        <span className="doors-workbench-count">{components.length}</span>
      </div>
      <div className="doors-workbench-component-list">
        {components.map((component) => (
          <ComponentRow
            key={component.id}
            component={component}
            busyKey={props.busyKey}
            onEdit={() => props.startDoorComponentEdit(component)}
            onDelete={() => void props.onDeleteProjectDoorComponent(component.id)}
          />
        ))}
        {!components.length ? (
          <div className="doors-workbench-empty-panel">Комплект можно собрать строками или оставить цену двери одной суммой.</div>
        ) : null}
      </div>
    </div>
  );
}

function ComponentRow(props: {
  component: CalculatorProjectDoorComponent;
  busyKey: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { component } = props;
  return (
    <div className="doors-workbench-component-row">
      <div>
        <span>{componentLabel(component.category_code)}</span>
        <strong>{component.title}</strong>
        <small>
          {trimFloat(component.quantity)} {component.unit}
          {component.note ? ` · ${component.note}` : ""}
        </small>
      </div>
      <div className="doors-workbench-component-money">
        <span>{formatMoney(component.purchase_total ?? 0)}</span>
        <strong>{formatMoney(component.sale_total ?? 0)}</strong>
      </div>
      <div className="doors-workbench-row-actions">
        <Button type="button" variant="micro" onClick={props.onEdit}>
          Править
        </Button>
        <DeleteButton
          type="button"
          busy={props.busyKey === `calculator-project-door-component-delete-${component.id}`}
          onClick={props.onDelete}
        />
      </div>
    </div>
  );
}
