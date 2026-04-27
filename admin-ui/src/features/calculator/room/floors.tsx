import { Button } from "../../../shared/controls";
import { toNumber, trimFloat } from "../shared";
import type { RoomStateSetter } from "../rooms/types";
import type { RoomEditState } from "./model";

type RoomFloorSectionsPanelProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

type RoomFloorSectionState = RoomEditState["floor_sections"][number];

function formatSectionWord(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return "участок";
  }

  if ([2, 3, 4].includes(remainder10) && ![12, 13, 14].includes(remainder100)) {
    return "участка";
  }

  return "участков";
}

function getSectionMetrics(section: RoomFloorSectionState) {
  const length = toNumber(section.length_m);
  const width = toNumber(section.width_m);
  const area = length !== null && width !== null ? length * width : null;

  return {
    area,
    isFilled: length !== null || width !== null,
  };
}

export function RoomFloorSectionsPanel(props: RoomFloorSectionsPanelProps) {
  const { roomState, setRoomState } = props;
  const sections = roomState.floor_sections.map((section) => ({
    ...getSectionMetrics(section),
    section,
  }));
  const totalArea = sections.reduce((total, item) => total + (item.area ?? 0), 0);
  const hasMeasuredSections = sections.some((item) => item.area !== null);

  return (
    <div className="subpanel p-3 space-y-2 calculator-room-section calculator-room-section-floors">
      <div className="calculator-room-section-head">
        <div className="calculator-room-section-copy">
          <div className="calculator-room-section-title">Участки пола</div>
          <div className="calculator-room-section-meta">
            <span className="calculator-room-section-summary">
              {sections.length} {formatSectionWord(sections.length)}
            </span>
            <span className="calculator-room-section-summary">
              {hasMeasuredSections ? `${trimFloat(totalArea)} м²` : "Площадь не задана"}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="micro"
          onClick={() =>
            setRoomState((current) => ({
              ...current,
              floor_sections: [...current.floor_sections, { length_m: "", width_m: "" }],
            }))
          }
        >
          Добавить участок
        </Button>
      </div>

      <div className="calculator-room-floors-grid">
        {sections.map(({ area, isFilled, section }, index) => (
          <div
            key={`section-${index}`}
            className={isFilled ? "calculator-room-floor-card calculator-room-floor-card-active" : "calculator-room-floor-card"}
          >
            <div className="calculator-room-floor-head">
              <div className="calculator-room-floor-kicker">Участок {index + 1}</div>
              <button
                type="button"
                className="calculator-room-floor-remove"
                aria-label={`Удалить участок ${index + 1}`}
                onClick={() =>
                  setRoomState((current) => ({
                    ...current,
                    floor_sections: current.floor_sections.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                ×
              </button>
            </div>

            <div className="calculator-room-floor-fields">
              <label className="calculator-room-floor-field">
                <span className="calculator-room-floor-field-label">Длина</span>
                <span className="calculator-room-floor-input">
                  <input
                    className="calculator-room-floor-input-field"
                    value={section.length_m}
                    inputMode="decimal"
                    aria-label={`Длина участка ${index + 1}, м`}
                    placeholder="0.00"
                    onChange={(event) =>
                      setRoomState((current) => ({
                        ...current,
                        floor_sections: current.floor_sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, length_m: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <span className="calculator-room-floor-unit">м</span>
                </span>
              </label>

              <label className="calculator-room-floor-field">
                <span className="calculator-room-floor-field-label">Ширина</span>
                <span className="calculator-room-floor-input">
                  <input
                    className="calculator-room-floor-input-field"
                    value={section.width_m}
                    inputMode="decimal"
                    aria-label={`Ширина участка ${index + 1}, м`}
                    placeholder="0.00"
                    onChange={(event) =>
                      setRoomState((current) => ({
                        ...current,
                        floor_sections: current.floor_sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, width_m: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <span className="calculator-room-floor-unit">м</span>
                </span>
              </label>
            </div>

            <div className="calculator-room-floor-area">
              <span className="calculator-room-floor-area-label">Площадь</span>
              <span className="calculator-room-floor-area-value">
                {area !== null ? `${trimFloat(area)} м²` : "Нет данных"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {roomState.floor_sections.length === 0 ? (
        <Button
          type="button"
          variant="micro"
          className="w-fit"
          onClick={() =>
            setRoomState((current) => ({
              ...current,
              floor_sections: [{ length_m: "", width_m: "" }],
            }))
          }
        >
          Добавить первый участок
        </Button>
      ) : null}
    </div>
  );
}
