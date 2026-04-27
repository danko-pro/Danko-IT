import { Button } from "../../../shared/controls";
import { trimFloat } from "../shared";
import type { RoomStateSetter } from "../rooms/types";
import type { RoomEditState } from "./model";
import { RoomOpeningCard } from "./opening-card";
import { buildOpeningViewModels, EMPTY_OPENING, formatOpeningWord } from "./opening-utils";

type RoomOpeningsPanelProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

export function RoomOpeningsPanel(props: RoomOpeningsPanelProps) {
  const { roomState, setRoomState } = props;
  const openings = buildOpeningViewModels(roomState.openings);
  const totalArea = openings.reduce((total, item) => total + (item.area ?? 0), 0);
  const hasMeasuredOpenings = openings.some((item) => item.area !== null);

  return (
    <div className="subpanel p-3 space-y-2 calculator-room-section calculator-room-section-openings">
      <div className="calculator-room-section-head">
        <div className="calculator-room-section-copy">
          <div className="calculator-room-section-title">Окна и проёмы</div>
          <div className="calculator-room-section-meta">
            <span className="calculator-room-section-summary">
              {openings.length} {formatOpeningWord(openings.length)}
            </span>
            <span className="calculator-room-section-summary">
              {hasMeasuredOpenings ? `${trimFloat(totalArea)} м²` : "Площадь не задана"}
            </span>
          </div>
        </div>
        <Button type="button" variant="micro" onClick={() => appendOpening(setRoomState)}>
          Добавить проём
        </Button>
      </div>

      <div className="calculator-room-openings-grid">
        {openings.map((opening, index) => (
          <RoomOpeningCard key={`opening-${index}`} index={index} view={opening} setRoomState={setRoomState} />
        ))}
      </div>

      {roomState.openings.length === 0 ? (
        <Button type="button" variant="micro" className="w-fit" onClick={() => replaceWithFirstOpening(setRoomState)}>
          Добавить первый проём
        </Button>
      ) : null}
    </div>
  );
}

function appendOpening(setRoomState: RoomStateSetter) {
  setRoomState((current) => ({
    ...current,
    openings: [...current.openings, { ...EMPTY_OPENING }],
  }));
}

function replaceWithFirstOpening(setRoomState: RoomStateSetter) {
  setRoomState((current) => ({
    ...current,
    openings: [{ ...EMPTY_OPENING }],
  }));
}
