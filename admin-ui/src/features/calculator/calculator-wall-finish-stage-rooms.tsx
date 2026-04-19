import { WallFinishRoomCard } from "./calculator-room-cards";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

export function WallFinishStageRoomsPanel(props: WallFinishStageReadyProps) {
  const {
    wallFinishPreview,
    wallFinishDetail,
    wallFinishRoomStateById,
    expandedWallFinishRoomId,
    setExpandedWallFinishRoomId,
    setWallFinishState,
    wallFinishCoveringById,
    wallFinishPreparationById,
    wallFinishLayoutById,
  } = props;

  return (
    <div className="subpanel p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Помещения и отделка стен</div>
        <div className="text-[12px] text-slate-400">Выберите комнаты, тип отделки, подготовку и способ монтажа</div>
      </div>

      <div className="space-y-2">
        {wallFinishPreview.rooms.map((room) => (
          <WallFinishRoomCard
            key={room.room_id}
            room={room}
            edit={wallFinishRoomStateById.get(room.room_id)}
            expanded={expandedWallFinishRoomId === room.room_id}
            coverings={wallFinishDetail.coverings}
            preparations={wallFinishDetail.preparations}
            layouts={wallFinishDetail.layouts}
            coveringById={wallFinishCoveringById}
            preparationById={wallFinishPreparationById}
            layoutById={wallFinishLayoutById}
            setExpandedRoomId={setExpandedWallFinishRoomId}
            setWallFinishState={setWallFinishState}
          />
        ))}
      </div>
    </div>
  );
}
