import { memo, type Ref } from "react";

import { formatArea, formatMeters, trimFloat } from "../shared";
import type { CalculatorRoomSummary } from "../room/model";

type RoomsStageSidebarRowProps = {
  room: CalculatorRoomSummary;
  active: boolean;
  isRemoving: boolean;
  isConfirming: boolean;
  busyKey: string | null;
  rowRef?: Ref<HTMLDivElement>;
  onSelectRoom: (roomId: number) => void;
  onRequestRemove: (roomId: number) => void;
  onConfirmRemove: (roomId: number) => void;
  onCancelRemove: () => void;
};

function RoomsStageSidebarRowComponent(props: RoomsStageSidebarRowProps) {
  const { room, active, isRemoving, isConfirming, busyKey, rowRef, onSelectRoom, onRequestRemove, onConfirmRemove, onCancelRemove } =
    props;

  return (
    <div
      ref={rowRef}
      className={
        isRemoving
          ? "calculator-room-sidebar-row-shell calculator-room-sidebar-row-shell-removing"
          : "calculator-room-sidebar-row-shell"
      }
    >
      <div className="calculator-room-sidebar-row-shell-inner">
        <div
          className={
            active
              ? "dense-row dense-row-active calculator-room-sidebar-row calculator-room-sidebar-row-active"
              : "dense-row calculator-room-sidebar-row"
          }
        >
          <button
            type="button"
            className="calculator-room-sidebar-select"
            disabled={isRemoving}
            onClick={() => onSelectRoom(room.id)}
          >
            <div className="calculator-room-sidebar-main">
              <div className="calculator-room-sidebar-title">{room.name}</div>
              <div className="calculator-room-sidebar-meta">
                <span className="stat-chip">{formatArea(room.floor_area_m2)}</span>
                <span className="stat-chip">{formatArea(room.wall_area_net_m2)} стен</span>
                <span className="stat-chip">{formatMeters(room.perimeter_m)}</span>
                <span className="stat-chip">H {trimFloat(room.ceiling_height_m)} м</span>
              </div>
            </div>
          </button>

          {isConfirming ? (
            <div className="calculator-room-sidebar-actions">
              <button
                type="button"
                className="calculator-room-sidebar-action calculator-room-sidebar-action-danger"
                disabled={isRemoving || busyKey === `calculator-room-delete-${room.id}`}
                onClick={() => onConfirmRemove(room.id)}
              >
                Удалить
              </button>
              <button
                type="button"
                className="calculator-room-sidebar-action"
                disabled={isRemoving}
                onClick={onCancelRemove}
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="calculator-room-sidebar-remove"
              aria-label={`Удалить помещение ${room.name}`}
              disabled={isRemoving || busyKey === `calculator-room-delete-${room.id}`}
              onClick={() => onRequestRemove(room.id)}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const RoomsStageSidebarRow = memo(
  RoomsStageSidebarRowComponent,
  (previous, next) =>
    previous.room === next.room &&
    previous.active === next.active &&
    previous.isRemoving === next.isRemoving &&
    previous.isConfirming === next.isConfirming &&
    previous.busyKey === next.busyKey &&
    previous.rowRef === next.rowRef,
);
