import { Button, IconButton } from "../../../shared/controls";
import type { CalculatorProjectDoor } from "../doors/model";
import type { DoorsStageReadyProps } from "../doors/types";
import { doorKind, doorMoneyLine, doorRooms, doorSize, doorTitle } from "./helpers";

type DoorWorkbenchQueueProps = Pick<
  DoorsStageReadyProps,
  "projectDetail" | "selectedDoor" | "busyKey" | "createBlankProjectDoor" | "startDoorEdit" | "onDeleteProjectDoor"
>;

export function DoorWorkbenchQueue(props: DoorWorkbenchQueueProps) {
  const createBusy = props.busyKey === `calculator-project-door-create-${props.projectDetail.project.id}`;
  const canCreateDoor = props.projectDetail.rooms.length > 0;
  const addDoorLabel = createBusy ? "Добавляю дверь" : canCreateDoor ? "Добавить дверь" : "Сначала добавьте помещение";
  return (
    <section className="doors-workbench-panel doors-workbench-queue" data-testid="doors-workbench-queue">
      <div className="doors-workbench-panel-head">
        <div className="doors-workbench-queue-title">
          <div className="doors-workbench-kicker">Двери</div>
          <h3>Двери и проемы</h3>
        </div>
        <div className="doors-workbench-queue-head-actions">
          <IconButton
            type="button"
            variant="micro"
            ariaLabel={addDoorLabel}
            className="doors-workbench-add-door"
            disabled={createBusy || !canCreateDoor}
            onClick={() => void props.createBlankProjectDoor()}
          >
            <DoorAddIcon />
          </IconButton>
        </div>
      </div>

      <div className="doors-workbench-door-list">
        {props.projectDetail.doors.map((door) => (
          <DoorQueueItem
            key={door.id}
            door={door}
            active={props.selectedDoor?.id === door.id}
            busyKey={props.busyKey}
            onSelect={() => props.startDoorEdit(door)}
            onDelete={() => void props.onDeleteProjectDoor(door.id)}
          />
        ))}
        {!props.projectDetail.doors.length && canCreateDoor ? (
          <div className="doors-workbench-empty-panel">Добавьте первую дверь. Параметры и комплект откроются в центральной рабочей области.</div>
        ) : null}
        {!props.projectDetail.doors.length && !canCreateDoor ? (
          <div className="doors-workbench-empty-panel">Сначала добавьте помещение, потом создайте дверь.</div>
        ) : null}
      </div>
    </section>
  );
}

function DoorAddIcon() {
  return (
    <svg
      aria-hidden="true"
      className="doors-workbench-add-door-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path className="doors-workbench-add-door-frame" d="M6.35 3.25h8.5c0.86 0 1.55 0.69 1.55 1.55v14.95H6.35V3.25Z" />
      <path className="doors-workbench-add-door-leaf" d="M8.25 5.35h6.05v12.35H8.25V5.35Z" />
      <path className="doors-workbench-add-door-threshold" d="M5.25 19.75h11.15" />
      <circle className="doors-workbench-add-door-handle" cx="12.95" cy="11.55" r="0.58" />
      <circle className="doors-workbench-add-door-plus-bg" cx="17.15" cy="16.85" r="4.05" />
      <path className="doors-workbench-add-door-plus" d="M17.15 14.65v4.4M14.95 16.85h4.4" />
    </svg>
  );
}

function DoorQueueItem(props: {
  door: CalculatorProjectDoor;
  active: boolean;
  busyKey: string | null;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { door } = props;
  return (
    <article className={props.active ? "doors-workbench-door-card doors-workbench-door-card-active" : "doors-workbench-door-card"}>
      <button type="button" className="doors-workbench-door-main" onClick={props.onSelect}>
        <span className="doors-workbench-door-kind">{doorKind(door)}</span>
        <strong>{doorTitle(door)}</strong>
        <span>{doorRooms(door)}</span>
      </button>
      <div className="doors-workbench-door-meta">
        <span>{doorSize(door)}</span>
        <span>{door.components?.length ?? 0} компл.</span>
      </div>
      <div className="doors-workbench-door-money">
        <strong>{doorMoneyLine(door)}</strong>
      </div>
      <div className="doors-workbench-row-actions">
        <Button
          type="button"
          variant="micro"
          tone="danger"
          disabled={props.busyKey === `calculator-project-door-delete-${door.id}`}
          onClick={props.onDelete}
        >
          {props.busyKey === `calculator-project-door-delete-${door.id}` ? "..." : "Удалить"}
        </Button>
      </div>
    </article>
  );
}
