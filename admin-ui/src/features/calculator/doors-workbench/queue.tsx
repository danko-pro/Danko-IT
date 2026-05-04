import { IconButton } from "../../../shared/controls";
import type { CalculatorProjectDoor } from "../doors/model";
import type { DoorsStageReadyProps } from "../doors/types";
import { trimFloat } from "../shared";
import { doorKind, doorMoneyLine, doorRooms, doorTitle } from "./helpers";

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

function doorDimensions(door: CalculatorProjectDoor) {
  if (!door.width_mm || !door.height_mm) return "-";
  return `${trimFloat(door.width_mm)}x${trimFloat(door.height_mm)}`;
}

function doorThickness(door: CalculatorProjectDoor) {
  return door.thickness_mm ? trimFloat(door.thickness_mm) : "-";
}

function doorComponentCount(door: CalculatorProjectDoor) {
  return String(door.components?.length ?? 0);
}

function DoorCardIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 4.5h10v15H7z" />
      <path d="M9.2 6.7h5.6v10.6H9.2z" />
      <path d="M14.1 12h0.1" />
    </svg>
  );
}

function SizeChipIcon() {
  return (
    <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
      <path d="M3 11.5h10M3 11.5v-3M6.3 11.5v-5M9.6 11.5V4.8M13 11.5V3.5" />
    </svg>
  );
}

function LayersChipIcon() {
  return (
    <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
      <path d="M2.5 5.1 8 2.7l5.5 2.4L8 7.5 2.5 5.1Zm0 3L8 10.5l5.5-2.4M2.5 11.1 8 13.5l5.5-2.4" />
    </svg>
  );
}

function BoxChipIcon() {
  return (
    <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
      <path d="m3 5 5-2.5L13 5v6L8 13.5 3 11V5Zm5 2.5L13 5M8 7.5 3 5m5 2.5v6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
      <path d="M3.4 4.6h9.2M6.3 4.6V3.1h3.4v1.5m-5 0 .5 8.3h5.6l.5-8.3M6.8 6.7v4.1m2.4-4.1v4.1" />
    </svg>
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
      <g className="doors-workbench-add-door-plus-source" transform="translate(2.4 2.4) scale(0.0375) translate(-144 -144)">
        <path d="m560 179.39h-320c-41.965 0-76.094 34.133-76.094 76.094v289.05c0 41.945 34.133 76.074 76.094 76.074h320c41.965 0 76.094-34.133 76.094-76.074v-289.05c0.003906-41.965-34.129-76.094-76.094-76.094zm45.168 365.15c0 24.887-20.258 45.145-45.164 45.145l-320.01 0.003906c-24.906 0-45.164-20.258-45.164-45.145l-0.003906-289.06c0-24.906 20.258-45.164 45.164-45.164h320c24.906 0 45.164 20.258 45.164 45.164z" />
        <path d="m415.46 289.91h-30.93v94.621h-94.641v30.93h94.641v94.641h30.93v-94.641h94.641v-30.93h-94.641z" />
        <path d="m326.88 240.04h-68.383c-17.418 0-31.594 14.176-31.594 31.594v66.449h30.93l0.66406-67.113h68.383z" />
      </g>
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
  const title = doorTitle(door);
  const dimensions = doorDimensions(door);
  const thickness = doorThickness(door);
  const componentCount = doorComponentCount(door);
  return (
    <article className={props.active ? "doors-workbench-door-card doors-workbench-door-card-active" : "doors-workbench-door-card"}>
      <button type="button" className="doors-workbench-door-main" onClick={props.onSelect}>
        <span className="doors-workbench-door-icon" aria-hidden="true">
          <DoorCardIcon />
        </span>
        <span className="doors-workbench-door-copy">
          <span className="doors-workbench-door-kind">{doorKind(door)}</span>
          <strong>{title}</strong>
          <span>{doorRooms(door)}</span>
        </span>
      </button>
      <div className="doors-workbench-door-meta">
        <span title={dimensions}>
          <SizeChipIcon />
          <span>{dimensions}</span>
        </span>
        <span title={thickness}>
          <LayersChipIcon />
          <span>{thickness}</span>
        </span>
        <span title={componentCount}>
          <BoxChipIcon />
          <span>{componentCount}</span>
        </span>
      </div>
      <div className="doors-workbench-door-money">
        <strong>{doorMoneyLine(door)}</strong>
      </div>
      <div className="doors-workbench-row-actions">
        <IconButton
          type="button"
          variant="micro"
          tone="danger"
          ariaLabel={`Удалить ${title}`}
          className="doors-workbench-delete-door"
          disabled={props.busyKey === `calculator-project-door-delete-${door.id}`}
          onClick={props.onDelete}
        >
          <TrashIcon />
        </IconButton>
      </div>
    </article>
  );
}
