import { FlooringRoomCard } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringStageRoomsPanel(props: FlooringStageReadyProps) {
  const {
    flooringPreview,
    flooringDetail,
    flooringRoomStateById,
    expandedFlooringRoomId,
    setExpandedFlooringRoomId,
    setFlooringState,
    flooringCoveringById,
    flooringPreparationById,
    flooringLayoutById,
  } = props;

  return (
    <div className="subpanel p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Помещения и типы покрытий</div>
        <div className="text-[12px] text-slate-400">
          Выберите комнаты, покрытие, подготовку и способ укладки
        </div>
      </div>

      <div className="space-y-2">
        {flooringPreview.rooms.map((room) => (
          <FlooringRoomCard
            key={room.room_id}
            room={room}
            edit={flooringRoomStateById.get(room.room_id)}
            expanded={expandedFlooringRoomId === room.room_id}
            coverings={flooringDetail.coverings}
            preparations={flooringDetail.preparations}
            layouts={flooringDetail.layouts}
            coveringById={flooringCoveringById}
            preparationById={flooringPreparationById}
            layoutById={flooringLayoutById}
            setExpandedRoomId={setExpandedFlooringRoomId}
            setFlooringState={setFlooringState}
          />
        ))}
      </div>
    </div>
  );
}
