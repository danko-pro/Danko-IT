import { FlooringRoomCard } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringStageRoomsPanel(
  props: FlooringStageReadyProps & {
    openFlooringRoomPanel: () => void;
    openFlooringSummaryPanel: () => void;
  },
) {
  const {
    flooringPreview,
    flooringRoomStateById,
    expandedFlooringRoomId,
    setExpandedFlooringRoomId,
    setFlooringState,
    flooringCoveringById,
    flooringPreparationById,
    flooringLayoutById,
    flooringState,
    openFlooringRoomPanel,
    openFlooringSummaryPanel,
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
            coveringById={flooringCoveringById}
            preparationById={flooringPreparationById}
            layoutById={flooringLayoutById}
            flooringState={flooringState}
            setExpandedRoomId={setExpandedFlooringRoomId}
            setFlooringState={setFlooringState}
            openFlooringRoomPanel={openFlooringRoomPanel}
            openFlooringSummaryPanel={openFlooringSummaryPanel}
          />
        ))}
      </div>
    </div>
  );
}
