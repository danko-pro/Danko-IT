import { openingTypeOptions, trimFloat } from "../shared";
import type { RoomStateSetter } from "../rooms/types";
import type { OpeningState, OpeningViewModel } from "./opening-utils";

type RoomOpeningCardProps = {
  index: number;
  view: OpeningViewModel;
  setRoomState: RoomStateSetter;
};

export function RoomOpeningCard(props: RoomOpeningCardProps) {
  const { index, view, setRoomState } = props;

  return (
    <div
      className={view.isFilled ? "calculator-room-opening-card calculator-room-opening-card-active" : "calculator-room-opening-card"}
    >
      <div className="calculator-room-opening-head">
        <div className="calculator-room-opening-copy">
          <div className="calculator-room-opening-kicker">
            {view.typeLabel} {index + 1}
          </div>
          <div className="calculator-room-opening-summary">
            {view.area !== null ? `${trimFloat(view.area)} м²` : "Нет данных"}
          </div>
        </div>
        <button
          type="button"
          className="calculator-room-opening-remove"
          aria-label={`Удалить проём ${index + 1}`}
          onClick={() => removeOpening(setRoomState, index)}
        >
          ×
        </button>
      </div>

      <div className="calculator-room-opening-fields">
        <label className="calculator-room-opening-field calculator-room-opening-field-wide">
          <span className="calculator-room-opening-field-label">Тип</span>
          <span className="calculator-room-opening-input calculator-room-opening-input-select">
            <select
              className="calculator-room-opening-select"
              value={view.opening.opening_type}
              aria-label={`Тип проёма ${index + 1}`}
              onChange={(event) => updateOpening(setRoomState, index, { opening_type: event.target.value })}
            >
              {openingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="calculator-room-opening-caret" aria-hidden="true">
              ▾
            </span>
          </span>
        </label>

        <label className="calculator-room-opening-field">
          <span className="calculator-room-opening-field-label">Ширина</span>
          <span className="calculator-room-opening-input">
            <input
              className="calculator-room-opening-input-field"
              value={view.opening.width_m}
              inputMode="decimal"
              aria-label={`Ширина проёма ${index + 1}, м`}
              placeholder="0.00"
              onChange={(event) => updateOpening(setRoomState, index, { width_m: event.target.value })}
            />
            <span className="calculator-room-opening-unit">м</span>
          </span>
        </label>

        <label className="calculator-room-opening-field">
          <span className="calculator-room-opening-field-label">Высота</span>
          <span className="calculator-room-opening-input">
            <input
              className="calculator-room-opening-input-field"
              value={view.opening.height_m}
              inputMode="decimal"
              aria-label={`Высота проёма ${index + 1}, м`}
              placeholder="0.00"
              onChange={(event) => updateOpening(setRoomState, index, { height_m: event.target.value })}
            />
            <span className="calculator-room-opening-unit">м</span>
          </span>
        </label>

        <label className="calculator-room-opening-field">
          <span className="calculator-room-opening-field-label">Кол-во</span>
          <span className="calculator-room-opening-input">
            <input
              className="calculator-room-opening-input-field"
              value={view.opening.quantity}
              inputMode="numeric"
              aria-label={`Количество проёмов ${index + 1}`}
              placeholder="1"
              onChange={(event) => updateOpening(setRoomState, index, { quantity: event.target.value })}
            />
            <span className="calculator-room-opening-unit">шт</span>
          </span>
        </label>

        <label className="calculator-room-opening-field">
          <span className="calculator-room-opening-field-label">Площадь вручную</span>
          <span className="calculator-room-opening-input">
            <input
              className="calculator-room-opening-input-field"
              value={view.opening.area_m2}
              inputMode="decimal"
              aria-label={`Площадь проёма ${index + 1}, м²`}
              placeholder="0.00"
              onChange={(event) => updateOpening(setRoomState, index, { area_m2: event.target.value })}
            />
            <span className="calculator-room-opening-unit">м²</span>
          </span>
        </label>

        <label className="calculator-room-opening-field calculator-room-opening-field-wide">
          <span className="calculator-room-opening-field-label">Примечание</span>
          <input
            className="text-input text-input-compact calculator-room-opening-note-input"
            value={view.opening.note}
            aria-label={`Примечание к проёму ${index + 1}`}
            placeholder="Свободная заметка"
            onChange={(event) => updateOpening(setRoomState, index, { note: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

function updateOpening(setRoomState: RoomStateSetter, index: number, patch: Partial<OpeningState>) {
  setRoomState((current) => ({
    ...current,
    openings: current.openings.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  }));
}

function removeOpening(setRoomState: RoomStateSetter, index: number) {
  setRoomState((current) => ({
    ...current,
    openings: current.openings.filter((_, itemIndex) => itemIndex !== index),
  }));
}
