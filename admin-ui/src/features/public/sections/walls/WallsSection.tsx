import type { WallsRoomDraft } from "../../estimate/context";
import { formatMeasurement, formatMoney } from "../../estimate/format";
import type {
  WallsCalculationResult,
  WallsCoveringType,
  WallsPreparationType,
} from "../../public-estimate-walls";

export type WallsSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type WallsSectionProps = {
  className: string;
  stepLabel: string;
  wallsResult: WallsCalculationResult;
  wallsRooms: Record<string, WallsRoomDraft>;
  wallsCoveringOptions: Array<{ value: WallsCoveringType; label: string }>;
  wallsPreparationOptions: Array<{ value: WallsPreparationType; label: string }>;
  wallsSummaryItems: WallsSummaryItem[];
  onWallsRoomIncludedChange: (roomId: string, isIncluded: boolean) => void;
  onWallsCoveringChange: (roomId: string, coveringType: WallsCoveringType) => void;
  onWallsPreparationChange: (roomId: string, preparationType: WallsPreparationType) => void;
  onOpenSectionSpec: () => void;
};

export function WallsSection({
  className,
  stepLabel,
  wallsResult,
  wallsRooms,
  wallsCoveringOptions,
  wallsPreparationOptions,
  wallsSummaryItems,
  onWallsRoomIncludedChange,
  onWallsCoveringChange,
  onWallsPreparationChange,
  onOpenSectionSpec,
}: WallsSectionProps) {
  return (
    <section id="estimate-walls" className={className} aria-labelledby="public-estimate-walls-title">
      <div className="public-estimate-walls-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-walls-title">Стены</h2>
          <p>Расчёт отделки стен по чистой площади из геометрии: покрытие, подготовка, материалы и расходники по каждому помещению.</p>
        </div>
      </div>

      <div className="public-estimate-walls-header" aria-hidden="true">
        <span>Помещение</span>
        <span>Покрытие</span>
        <span>Подготовка</span>
        <span>Площадь стен</span>
        <span>Закупка</span>
        <span>Итого</span>
      </div>

      <div className="public-estimate-walls-room-list" aria-label="Помещения для расчёта стен">
        {wallsResult.roomResults.map((room) => {
          const wallsDraft = wallsRooms[room.roomId] ?? {};
          const isIncluded = wallsDraft.isIncluded ?? true;

          return (
            <article className="public-estimate-walls-row" key={room.roomId}>
              <label className="public-estimate-walls-room">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(event) => onWallsRoomIncludedChange(room.roomId, event.target.checked)}
                />
                <span>
                  <strong>{room.roomName}</strong>
                  <small>{formatMeasurement(room.finishWallArea, "м²")}</small>
                </span>
              </label>

              <label className="public-estimate-field public-estimate-walls-covering">
                <span className="public-estimate-mobile-label">Покрытие</span>
                <select
                  className="public-estimate-select"
                  value={room.coveringType}
                  disabled={!isIncluded}
                  onChange={(event) => onWallsCoveringChange(room.roomId, event.target.value as WallsCoveringType)}
                >
                  {wallsCoveringOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-estimate-field public-estimate-walls-preparation">
                <span className="public-estimate-mobile-label">Подготовка</span>
                <select
                  className="public-estimate-select"
                  value={room.preparationType}
                  disabled={!isIncluded}
                  onChange={(event) => onWallsPreparationChange(room.roomId, event.target.value as WallsPreparationType)}
                >
                  {wallsPreparationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="public-estimate-walls-result">
                <span className="public-estimate-mobile-label">Площадь стен</span>
                <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
              </div>

              <div className="public-estimate-walls-result">
                <span className="public-estimate-mobile-label">Закупка</span>
                <strong>{formatMeasurement(room.purchaseArea, "м²")}</strong>
              </div>

              <div className="public-estimate-walls-total">
                <span className="public-estimate-mobile-label">Итого</span>
                <strong>{formatMoney(room.roomTotal)}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-walls-summary" aria-label="Итоги по стенам">
        {wallsSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-walls-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {wallsResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Покрытия, подготовка стен и расходники</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{wallsResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить стены в смету.</p>
      )}
    </section>
  );
}
