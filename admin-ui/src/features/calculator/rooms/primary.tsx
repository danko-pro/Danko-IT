import type { RoomEditState } from "../room/model";
import type { RoomStateSetter } from "./types";

const PERIMETER_FACTOR_TOOLTIP =
  "Формула: P ≈ 4 × √S × коэффициент. 1.0 для почти квадрата. 1.1–1.3 для вытянутых помещений.";

type RoomsEditorPrimaryProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

export function RoomsEditorPrimary(props: RoomsEditorPrimaryProps) {
  const { roomState, setRoomState } = props;

  return (
    <div className="calculator-room-editor-primary">
      <div className="calculator-room-editor-name">
        <label className="calculator-room-editor-name-field">
          <span className="field-label field-label-compact">Название помещения</span>
          <span className="calculator-room-editor-name-input">
            <input
              className="calculator-room-editor-name-input-field"
              value={roomState.name}
              onChange={(event) => setRoomState((current) => ({ ...current, name: event.target.value }))}
            />
          </span>
        </label>
      </div>

      <div className="calculator-room-editor-ceiling">
        <label className="calculator-room-editor-ceiling-field">
          <span className="field-label field-label-compact">Потолок = h</span>
          <span className="calculator-room-editor-ceiling-input">
            <input
              className="calculator-room-editor-ceiling-input-field"
              value={roomState.ceiling_height_m}
              inputMode="decimal"
              placeholder="2.7"
              onChange={(event) => setRoomState((current) => ({ ...current, ceiling_height_m: event.target.value }))}
            />
            {roomState.ceiling_height_m.trim() ? <span className="calculator-room-editor-ceiling-unit">м</span> : null}
          </span>
        </label>
      </div>

      <div className="calculator-room-editor-floor-area">
        <label className="calculator-room-editor-floor-area-field">
          <span className="field-label field-label-compact">Полы = S</span>
          <span className="calculator-room-editor-floor-area-input">
            <input
              className="calculator-room-editor-floor-area-input-field"
              value={roomState.manual_floor_area_m2}
              inputMode="decimal"
              placeholder="12.2"
              onChange={(event) => setRoomState((current) => ({ ...current, manual_floor_area_m2: event.target.value }))}
            />
            {roomState.manual_floor_area_m2.trim() ? <span className="calculator-room-editor-floor-area-unit">м²</span> : null}
          </span>
        </label>
      </div>

      <label className="calculator-room-editor-toggle">
        <input
          className="calculator-room-editor-toggle-input"
          type="checkbox"
          checked={roomState.auto_perimeter_calc}
          onChange={(event) =>
            setRoomState((current) => ({
              ...current,
              auto_perimeter_calc: event.target.checked,
            }))
          }
        />
        <span className="calculator-room-editor-toggle-box" aria-hidden="true">
          <span className="calculator-room-editor-toggle-mark">✓</span>
        </span>
        <span className="calculator-room-editor-toggle-label">Авторасчёт периметра</span>
      </label>

      <div className="calculator-room-editor-factor">
        <label className="calculator-room-editor-factor-field">
          <span className="field-label field-label-compact">Коэф. формы</span>
          <span className="calculator-room-editor-factor-input">
            <input
              className="calculator-room-editor-factor-input-field"
              value={roomState.perimeter_factor}
              inputMode="decimal"
              placeholder="1.15"
              onChange={(event) => setRoomState((current) => ({ ...current, perimeter_factor: event.target.value }))}
            />
          </span>
        </label>
        <div className="calculator-room-editor-help-anchor">
          <button
            type="button"
            className="calculator-room-editor-help"
            aria-label={PERIMETER_FACTOR_TOOLTIP}
          >
            !
          </button>
          <div className="calculator-room-editor-help-tip" role="tooltip">
            {PERIMETER_FACTOR_TOOLTIP}
          </div>
        </div>
      </div>
    </div>
  );
}
