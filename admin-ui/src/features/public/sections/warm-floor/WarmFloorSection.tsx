import type { ChangeEvent } from "react";
import type { EstimateRoomDraft, WarmFloorRoomDraft } from "../../estimate/context";
import { formatMeasurement } from "../../estimate/format";
import type { estimateNumericFieldProps } from "../../public-estimate-input";
import type { EstimateRoomInput } from "../../public-estimate-geometry";
import type { WarmFloorCalculationResult, WarmFloorMode } from "../../public-estimate-warm-floor";

export type WarmFloorSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type WarmFloorSectionProps = {
  className: string;
  stepLabel: string;
  warmFloorMode: WarmFloorMode;
  onSetWarmFloorMode: (mode: WarmFloorMode) => void;
  rooms: EstimateRoomDraft[];
  warmFloorRooms: Record<string, WarmFloorRoomDraft>;
  roomInputs: EstimateRoomInput[];
  numberFieldProps: typeof estimateNumericFieldProps;
  onWarmFloorRoomSelectedChange: (roomId: string, isSelected: boolean) => void;
  onWarmFloorAreaChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onWarmFloorAreaBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  warmFloorSummaryItems: WarmFloorSummaryItem[];
  warmFloorResult: WarmFloorCalculationResult;
  warmFloorModeLabel: string;
  warmFloorConnectionLabel: string;
  onOpenSectionSpec: () => void;
};

export function WarmFloorSection({
  className,
  stepLabel,
  warmFloorMode,
  onSetWarmFloorMode,
  rooms,
  warmFloorRooms,
  roomInputs,
  numberFieldProps,
  onWarmFloorRoomSelectedChange,
  onWarmFloorAreaChange,
  onWarmFloorAreaBlur,
  warmFloorSummaryItems,
  warmFloorResult,
  warmFloorModeLabel,
  warmFloorConnectionLabel,
  onOpenSectionSpec,
}: WarmFloorSectionProps) {
  return (
    <section id="estimate-warm-floor" className={className} aria-labelledby="public-estimate-warm-floor-title">
      <div className="public-estimate-warm-floor-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-warm-floor-title">Тёплый пол</h2>
          <p>Выберите помещения, площадь зоны и тип системы. Раздел сразу попадает в итоговую смету.</p>
        </div>

        <div className="public-estimate-toggle-group" aria-label="Тип тёплого пола">
          <button
            className={warmFloorMode === "water" ? "public-estimate-toggle-active" : undefined}
            type="button"
            aria-pressed={warmFloorMode === "water"}
            onClick={() => onSetWarmFloorMode("water")}
          >
            Водяной
          </button>
          <button
            className={warmFloorMode === "electric" ? "public-estimate-toggle-active" : undefined}
            type="button"
            aria-pressed={warmFloorMode === "electric"}
            onClick={() => onSetWarmFloorMode("electric")}
          >
            Электрический
          </button>
        </div>
      </div>

      <div className="public-estimate-room-toggle-list" aria-label="Помещения для тёплого пола">
        {rooms.map((room, index) => {
          const warmFloorDraft = warmFloorRooms[room.id] ?? {};
          const isSelected = warmFloorDraft.isSelected ?? room.type === "bathroom";
          const warmFloorArea = warmFloorDraft.warmFloorArea ?? room.area;
          const normalizedArea = roomInputs[index]?.area ?? 0;

          return (
            <article className="public-estimate-warm-floor-row" key={room.id}>
              <label className="public-estimate-warm-floor-room">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(event) => onWarmFloorRoomSelectedChange(room.id, event.target.checked)}
                />
                <span>
                  <strong>{room.name.trim() || "Помещение"}</strong>
                  <small>{formatMeasurement(normalizedArea, "м²")}</small>
                </span>
              </label>

              <label className="public-estimate-field public-estimate-warm-floor-area">
                <span>Площадь тёплого пола</span>
                <input
                  className="public-estimate-input"
                  inputMode="decimal"
                  value={warmFloorArea}
                  disabled={!isSelected}
                  {...numberFieldProps}
                  onChange={(event) => onWarmFloorAreaChange(room.id, event)}
                  onBlur={(event) => onWarmFloorAreaBlur(room.id, event)}
                />
              </label>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-warm-floor-summary" aria-label="Итоги по тёплому полу">
        {warmFloorSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-warm-floor-total" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {warmFloorResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>
              {warmFloorModeLabel}; подключение: {warmFloorConnectionLabel}
            </span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{warmFloorResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">
          Выберите хотя бы одно помещение, чтобы добавить тёплый пол в смету.
        </p>
      )}
    </section>
  );
}
