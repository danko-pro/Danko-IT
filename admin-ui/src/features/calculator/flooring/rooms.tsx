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
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Контур расчёта</div>
          <div className="calculator-stage-section-title">Помещения и типы покрытий</div>
        </div>
        <div className="calculator-stage-section-note">
          Выберите комнаты, покрытие, подготовку и способ укладки для каждой зоны отдельно.
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
