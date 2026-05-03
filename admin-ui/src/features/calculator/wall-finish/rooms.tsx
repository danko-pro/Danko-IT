import { WallFinishRoomCard } from "./";
import type { WallFinishStageReadyProps } from "./";

export function WallFinishStageRoomsPanel(
  props: WallFinishStageReadyProps & {
    openWallFinishRoomPanel: () => void;
    openWallFinishSummaryPanel: () => void;
  },
) {
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
    openWallFinishRoomPanel,
    openWallFinishSummaryPanel,
  } = props;

  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Контур расчета</div>
          <div className="calculator-stage-section-title">Помещения и отделка стен</div>
        </div>
        <div className="calculator-stage-section-note">
          Выберите комнаты, тип отделки, подготовку и способ монтажа. Детальные параметры выбранной комнаты вынесены в
          правую колонку, как во вкладке напольных покрытий.
        </div>
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
            openWallFinishRoomPanel={openWallFinishRoomPanel}
            openWallFinishSummaryPanel={openWallFinishSummaryPanel}
          />
        ))}
      </div>
    </div>
  );
}
