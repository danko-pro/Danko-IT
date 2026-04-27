import { RoomsStageCreatePanel } from "./create";
import { RoomsStageSidebarRow } from "./row";
import type { RoomsStageSidebarSectionProps } from "./types";
import { useRoomAnchor } from "./use-anchor";
import { useRoomRemove } from "./use-remove";

export function RoomsStageSidebarSection(props: RoomsStageSidebarSectionProps) {
  const { projectDetail, selectedRoomId, roomSelectionToken, busyKey, onCreateRoom, onDeleteRoom, onSelectRoom, onActiveRoomAnchorChange } =
    props;
  const { confirmingRoomId, removingRoomIds, requestRemove, cancelRemove, confirmRemove } = useRoomRemove({ onDeleteRoom });
  const { panelRef, activeRowRef } = useRoomAnchor({
    projectId: projectDetail?.project.id ?? null,
    selectedRoomId,
    confirmingRoomId,
    removingCount: removingRoomIds.length,
    onChange: onActiveRoomAnchorChange,
  });

  const visibleRoomCount = projectDetail
    ? projectDetail.rooms.reduce((count, room) => count + (removingRoomIds.includes(room.id) ? 0 : 1), 0)
    : 0;

  return (
    <section ref={panelRef} className="glass-panel p-4 stage-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Сводка</div>
          <h3 className="section-title mt-1.5">Помещения и итог по объекту</h3>
        </div>
        {projectDetail ? <span className="slot-chip">{visibleRoomCount}</span> : null}
      </div>

      {projectDetail ? (
        <>
          <div className="calculator-room-sidebar-list">
            {projectDetail.rooms.map((room) => {
              const active = room.id === selectedRoomId;
              const isRemoving = removingRoomIds.includes(room.id);
              const isConfirming = confirmingRoomId === room.id;

              return (
                <RoomsStageSidebarRow
                  key={room.id}
                  room={room}
                  active={active}
                  isRemoving={isRemoving}
                  isConfirming={isConfirming}
                  busyKey={busyKey}
                  rowRef={active ? activeRowRef : undefined}
                  onSelectRoom={onSelectRoom}
                  onRequestRemove={requestRemove}
                  onConfirmRemove={confirmRemove}
                  onCancelRemove={cancelRemove}
                />
              );
            })}
          </div>

          <RoomsStageCreatePanel
            projectId={projectDetail.project.id}
            roomSelectionToken={roomSelectionToken}
            busyKey={busyKey}
            onCreateRoom={onCreateRoom}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Выберите проект слева, чтобы работать с помещениями.
        </div>
      )}
    </section>
  );
}
