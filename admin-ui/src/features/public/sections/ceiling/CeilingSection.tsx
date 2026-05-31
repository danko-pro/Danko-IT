import type { CeilingRoomDraft } from "../../estimate/context";
import { formatMeasurement, formatMoney } from "../../estimate/format";
import type { CeilingCalculationResult } from "../../public-estimate-ceiling";

export type CeilingSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type CeilingLightDefaults = {
  hasPointLights: boolean;
};

export type CeilingSectionProps = {
  className: string;
  stepLabel: string;
  ceilingResult: CeilingCalculationResult;
  ceilingRooms: Record<string, CeilingRoomDraft>;
  ceilingSummaryItems: CeilingSummaryItem[];
  getCeilingLightDefaults: (roomId: string) => CeilingLightDefaults;
  onCeilingRoomIncludedChange: (roomId: string, isIncluded: boolean) => void;
  onCeilingPointLightsChange: (roomId: string, hasPointLights: boolean) => void;
  onOpenSectionSpec: () => void;
};

export function CeilingSection({
  className,
  stepLabel,
  ceilingResult,
  ceilingRooms,
  ceilingSummaryItems,
  getCeilingLightDefaults,
  onCeilingRoomIncludedChange,
  onCeilingPointLightsChange,
  onOpenSectionSpec,
}: CeilingSectionProps) {
  return (
    <section id="estimate-ceiling" className={className} aria-labelledby="public-estimate-ceiling-title">
      <div className="public-estimate-ceiling-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-ceiling-title">Потолки</h2>
          <p>Первый срез потолков: ПВХ матовый / сатин и точечный свет с закладными, врезкой и светильниками GX53.</p>
        </div>
      </div>

      <div className="public-estimate-ceiling-header" aria-hidden="true">
        <span>Помещение</span>
        <span>Потолок</span>
        <span>Точечный свет</span>
        <span>Площадь</span>
        <span>Точки</span>
        <span>Итого</span>
      </div>

      <div className="public-estimate-ceiling-room-list" aria-label="Помещения для расчёта потолков">
        {ceilingResult.roomResults.map((room) => {
          const ceilingDraft = ceilingRooms[room.roomId] ?? {};
          const lightDefaults = getCeilingLightDefaults(room.roomId);
          const isIncluded = ceilingDraft.isIncluded ?? true;
          const hasPointLights = ceilingDraft.hasPointLights ?? lightDefaults.hasPointLights;

          return (
            <article className="public-estimate-ceiling-row" key={room.roomId}>
              <label className="public-estimate-ceiling-room">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(event) => onCeilingRoomIncludedChange(room.roomId, event.target.checked)}
                />
                <span>
                  <strong>{room.roomName}</strong>
                  <small>{formatMeasurement(room.ceilingArea, "м²")}</small>
                </span>
              </label>

              <div className="public-estimate-ceiling-type">
                <span className="public-estimate-mobile-label">Потолок</span>
                <strong>ПВХ матовый / сатин</strong>
              </div>

              <label className="public-estimate-ceiling-light">
                <input
                  type="checkbox"
                  checked={hasPointLights}
                  disabled={!isIncluded}
                  onChange={(event) => onCeilingPointLightsChange(room.roomId, event.target.checked)}
                />
                <span>Точечный свет</span>
              </label>

              <div className="public-estimate-ceiling-result">
                <span className="public-estimate-mobile-label">Площадь</span>
                <strong>{formatMeasurement(room.ceilingArea, "м²")}</strong>
              </div>

              <div className="public-estimate-ceiling-result">
                <span className="public-estimate-mobile-label">Точки</span>
                <strong>{room.pointCount} шт.</strong>
              </div>

              <div className="public-estimate-ceiling-total">
                <span className="public-estimate-mobile-label">Итого</span>
                <strong>{formatMoney(room.roomTotal)}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-ceiling-summary" aria-label="Итоги по потолкам">
        {ceilingSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-ceiling-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {ceilingResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>ПВХ потолок, закладные, врезка и светильники GX53</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{ceilingResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить потолки в смету.</p>
      )}
    </section>
  );
}
