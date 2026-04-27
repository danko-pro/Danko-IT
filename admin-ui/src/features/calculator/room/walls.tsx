import { Button } from "../../../shared/controls";
import { toNumber, trimFloat } from "../shared";
import type { RoomStateSetter } from "../rooms/types";
import type { RoomEditState } from "./model";

type RoomWallsPanelProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

function formatWallWord(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return "стена";
  }

  if ([2, 3, 4].includes(remainder10) && ![12, 13, 14].includes(remainder100)) {
    return "стены";
  }

  return "стен";
}

export function RoomWallsPanel(props: RoomWallsPanelProps) {
  const { roomState, setRoomState } = props;
  const wallsCount = roomState.walls_m.length;
  const wallsTotal = roomState.walls_m.reduce((total, wall) => total + (toNumber(wall) ?? 0), 0);
  const hasMeasuredWalls = roomState.walls_m.some((wall) => toNumber(wall) !== null);

  return (
    <div className="subpanel p-3 space-y-2 calculator-room-section calculator-room-section-walls">
      <div className="calculator-room-section-head">
        <div className="calculator-room-section-copy">
          <div className="calculator-room-section-title">Стены для периметра</div>
          <div className="calculator-room-section-meta">
            <span className="calculator-room-section-summary">
              {wallsCount} {formatWallWord(wallsCount)}
            </span>
            <span className="calculator-room-section-summary">
              {hasMeasuredWalls ? `${trimFloat(wallsTotal)} м.п.` : "Периметр не задан"}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="micro"
          onClick={() =>
            setRoomState((current) => ({
              ...current,
              walls_m: [...current.walls_m, ""],
            }))
          }
        >
          Добавить стену
        </Button>
      </div>

      <div className="calculator-room-walls-grid">
        {roomState.walls_m.map((wall, index) => (
          <div
            key={`wall-${index}`}
            className={toNumber(wall) !== null ? "calculator-room-wall-card calculator-room-wall-card-active" : "calculator-room-wall-card"}
          >
            <div className="calculator-room-wall-head">
              <div className="calculator-room-wall-kicker">Стена {index + 1}</div>
              <button
                type="button"
                className="calculator-room-wall-remove"
                aria-label={`Удалить стену ${index + 1}`}
                onClick={() =>
                  setRoomState((current) => ({
                    ...current,
                    walls_m: current.walls_m.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                ×
              </button>
            </div>

            <label className="calculator-room-wall-input">
              <input
                className="calculator-room-wall-input-field"
                value={wall}
                inputMode="decimal"
                aria-label={`Стена ${index + 1}, м`}
                placeholder="0.00"
                onChange={(event) =>
                  setRoomState((current) => ({
                    ...current,
                    walls_m: current.walls_m.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                  }))
                }
              />
              <span className="calculator-room-wall-unit">м</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
