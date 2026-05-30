import type { ChangeEvent } from "react";
import type { EstimateRoomDraft } from "../../estimate/context";
import { formatMeasurement } from "../../estimate/format";
import type { estimateNumericFieldProps } from "../../public-estimate-input";
import type { EstimateRoomGeometry } from "../../public-estimate-geometry";

export type GeometrySectionProps = {
  className: string;
  stepLabel: string;
  geometryStepHint: string;
  ceilingHeightInput: string;
  numberFieldProps: typeof estimateNumericFieldProps;
  onCeilingHeightChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCeilingHeightBlur: (event: ChangeEvent<HTMLInputElement>) => void;
  rooms: EstimateRoomDraft[];
  roomGeometries: EstimateRoomGeometry[];
  enteringRoomIds: string[];
  removingRoomIds: string[];
  onRoomNameChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomAreaChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomAreaBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomDoorCountChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomDoorCountBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomWindowCountChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomWindowCountBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveRoom: (roomId: string) => void;
  onAddRoom: () => void;
};

export function GeometrySection({
  className,
  stepLabel,
  geometryStepHint,
  ceilingHeightInput,
  numberFieldProps,
  onCeilingHeightChange,
  onCeilingHeightBlur,
  rooms,
  roomGeometries,
  enteringRoomIds,
  removingRoomIds,
  onRoomNameChange,
  onRoomAreaChange,
  onRoomAreaBlur,
  onRoomDoorCountChange,
  onRoomDoorCountBlur,
  onRoomWindowCountChange,
  onRoomWindowCountBlur,
  onRemoveRoom,
  onAddRoom,
}: GeometrySectionProps) {
  return (
    <section id="estimate-geometry" className={className} aria-labelledby="public-estimate-geometry-title">
      <div className="public-estimate-geometry-head">
        <span>{stepLabel}</span>
        <div className="public-estimate-geometry-title-row">
          <h2 id="public-estimate-geometry-title">Помещения и объём</h2>
          <span className="public-estimate-geometry-hint">{geometryStepHint}</span>
        </div>
      </div>

      <div className="public-estimate-geometry-toolbar">
        <label className="public-estimate-field public-estimate-ceiling-field">
          <span>Высота потолков, м</span>
          <input
            className="public-estimate-input"
            inputMode="decimal"
            value={ceilingHeightInput}
            {...numberFieldProps}
            onChange={onCeilingHeightChange}
            onBlur={onCeilingHeightBlur}
          />
        </label>
      </div>

      <div className="public-estimate-room-header" aria-hidden="true">
        <span>№</span>
        <span>Помещение</span>
        <span className="public-estimate-room-header-metric">Площадь</span>
        <span className="public-estimate-room-header-count">Двери</span>
        <span className="public-estimate-room-header-count">Окна</span>
        <span>Стены к отделке</span>
        <span />
      </div>

      <div className="public-estimate-room-list" aria-label="Список помещений">
        {roomGeometries.map((room, index) => {
          const roomDraft = rooms[index];
          const isEntering = enteringRoomIds.includes(room.id);
          const isRemoving = removingRoomIds.includes(room.id);
          const rowShellClassName = [
            "public-estimate-geometry-row-shell",
            isEntering ? "is-entering" : "",
            isRemoving ? "is-removing" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div className={rowShellClassName} key={room.id}>
              <div className="public-estimate-geometry-row-shell-inner">
                <article
                  className="public-estimate-room-row public-estimate-geometry-row"
                  data-estimate-room-id={room.id}
                >
                  <div className="public-estimate-room-top">
                    <div className="public-estimate-room-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <label className="public-estimate-field public-estimate-room-name">
                      <span className="public-estimate-mobile-label">Помещение</span>
                      <input
                        aria-label="Помещение"
                        className="public-estimate-input"
                        placeholder="Название по БТИ"
                        value={roomDraft.name}
                        onChange={(event) => onRoomNameChange(room.id, event)}
                      />
                    </label>

                    <button
                      aria-label="Удалить помещение"
                      className="public-estimate-row-remove"
                      type="button"
                      disabled={rooms.length <= 1 || isRemoving}
                      onClick={() => onRemoveRoom(room.id)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="public-estimate-room-main">
                    <div className="public-estimate-room-metrics">
                      <label className="public-estimate-field public-estimate-room-area">
                        <span className="public-estimate-mobile-label">Площадь</span>
                        <input
                          aria-label="Площадь помещения"
                          className="public-estimate-input"
                          inputMode="decimal"
                          value={roomDraft.area}
                          {...numberFieldProps}
                          onChange={(event) => onRoomAreaChange(room.id, event)}
                          onBlur={(event) => onRoomAreaBlur(room.id, event)}
                        />
                      </label>

                      <label className="public-estimate-field public-estimate-room-doors">
                        <span className="public-estimate-mobile-label">Двери</span>
                        <input
                          aria-label="Количество дверей"
                          className="public-estimate-input"
                          inputMode="numeric"
                          value={roomDraft.doorCount}
                          {...numberFieldProps}
                          onChange={(event) => onRoomDoorCountChange(room.id, event)}
                          onBlur={(event) => onRoomDoorCountBlur(room.id, event)}
                        />
                      </label>

                      <label className="public-estimate-field public-estimate-room-windows">
                        <span className="public-estimate-mobile-label">Окна</span>
                        <input
                          aria-label="Количество окон"
                          className="public-estimate-input"
                          inputMode="numeric"
                          value={roomDraft.windowCount}
                          {...numberFieldProps}
                          onChange={(event) => onRoomWindowCountChange(room.id, event)}
                          onBlur={(event) => onRoomWindowCountBlur(room.id, event)}
                        />
                      </label>
                    </div>

                    <div className="public-estimate-room-result">
                      <span className="public-estimate-mobile-label">Стены к отделке</span>
                      <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          );
        })}
      </div>

      <div className="public-estimate-geometry-footer">
        <button className="public-estimate-small-action" type="button" onClick={onAddRoom}>
          Добавить помещение
        </button>
      </div>
    </section>
  );
}
