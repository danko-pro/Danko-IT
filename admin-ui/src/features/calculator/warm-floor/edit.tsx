import { WarmFloorRoomCard } from "./";
import type { WarmFloorStageReadyProps } from "./";

export function WarmFloorStageEditorColumn(props: WarmFloorStageReadyProps) {
  const {
    warmFloorPreview,
    warmFloorRoomStateById,
    expandedWarmFloorRoomId,
    setExpandedWarmFloorRoomId,
    setWarmFloorState,
  } = props;

  return (
    <div className="space-y-3">
      <div className="subpanel calculator-stage-section p-3 space-y-3">
        <div className="calculator-stage-section-head">
          <div>
            <div className="calculator-stage-section-kicker">Контур расчёта</div>
            <div className="calculator-stage-section-title">Помещения тёплого пола</div>
          </div>
          <div className="calculator-stage-section-note">
            Отметьте комнаты и при необходимости скорректируйте полезную площадь под укладку.
          </div>
        </div>

        <div className="space-y-2">
          {warmFloorPreview.rooms.map((room) => (
            <WarmFloorRoomCard
              key={room.room_id}
              room={room}
              edit={warmFloorRoomStateById.get(room.room_id)}
              expanded={expandedWarmFloorRoomId === room.room_id}
              setExpandedRoomId={setExpandedWarmFloorRoomId}
              setWarmFloorState={setWarmFloorState}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
