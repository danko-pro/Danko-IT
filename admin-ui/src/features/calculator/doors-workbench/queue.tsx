import { Button } from "../../../shared/controls";
import { formatMoney, trimFloat } from "../shared";
import type { CalculatorProjectDoor } from "../doors/model";
import type { DoorsStageReadyProps } from "../doors/types";
import { doorArea, doorKind, doorMoneyLine, doorRooms, doorSize, doorTitle } from "./helpers";

type DoorWorkbenchQueueProps = Pick<
  DoorsStageReadyProps,
  "projectDetail" | "selectedDoor" | "setSelectedDoorId" | "busyKey" | "startDoorEdit" | "onDeleteProjectDoor"
>;

export function DoorWorkbenchQueue(props: DoorWorkbenchQueueProps) {
  return (
    <section className="doors-workbench-panel doors-workbench-queue" data-testid="doors-workbench-queue">
      <div className="doors-workbench-panel-head">
        <div>
          <div className="doors-workbench-kicker">Очередь</div>
          <h3>Двери и проемы</h3>
        </div>
        <span className="doors-workbench-count">{props.projectDetail.doors.length}</span>
      </div>

      <div className="doors-workbench-door-list">
        {props.projectDetail.doors.map((door) => (
          <DoorQueueItem
            key={door.id}
            door={door}
            active={props.selectedDoor?.id === door.id}
            busyKey={props.busyKey}
            onSelect={() => props.setSelectedDoorId(door.id)}
            onEdit={() => props.startDoorEdit(door)}
            onDelete={() => void props.onDeleteProjectDoor(door.id)}
          />
        ))}
        {!props.projectDetail.doors.length ? (
          <div className="doors-workbench-empty-panel">Добавьте первую позицию: дверь, чистый проем или оформление проема.</div>
        ) : null}
      </div>
    </section>
  );
}

function DoorQueueItem(props: {
  door: CalculatorProjectDoor;
  active: boolean;
  busyKey: string | null;
  onSelect: () => void;
  onEdit: () => void;
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
        <span>{doorArea(door)}</span>
        <span>{door.components?.length ?? 0} компл.</span>
      </div>
      <div className="doors-workbench-door-money">
        <span>Закуп {formatMoney(door.effective_purchase_price ?? 0)}</span>
        <strong>{doorMoneyLine(door)}</strong>
        {door.effective_install_price ? <span>Монтаж {formatMoney(door.effective_install_price)}</span> : null}
      </div>
      {door.note ? <p>{door.note}</p> : null}
      <div className="doors-workbench-row-actions">
        <Button type="button" variant="micro" onClick={props.onEdit}>
          Править
        </Button>
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
      <div className="doors-workbench-door-size-shadow" aria-hidden="true">
        {door.width_mm && door.height_mm ? `${trimFloat(door.width_mm)} / ${trimFloat(door.height_mm)}` : "#"}
      </div>
    </article>
  );
}
