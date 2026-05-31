import type { ElectricRoomDraft } from "../../estimate/context";
import { formatMeasurement, formatMoney } from "../../estimate/format";
import type { ElectricCalculationResult, ElectricOptions } from "../../public-estimate-electric";

export type ElectricSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type ElectricSectionProps = {
  className: string;
  stepLabel: string;
  electricResult: ElectricCalculationResult;
  electricRooms: Record<string, ElectricRoomDraft>;
  electricOptions: ElectricOptions;
  electricSummaryItems: ElectricSummaryItem[];
  onElectricRoomIncludedChange: (roomId: string, isIncluded: boolean) => void;
  onElectricKitchenOutputsChange: (includeKitchenOutputs: boolean) => void;
  onElectricSwitchboardChange: (includeSwitchboard: boolean) => void;
  onOpenSectionSpec: () => void;
};

export function ElectricSection({
  className,
  stepLabel,
  electricResult,
  electricRooms,
  electricOptions,
  electricSummaryItems,
  onElectricRoomIncludedChange,
  onElectricKitchenOutputsChange,
  onElectricSwitchboardChange,
  onOpenSectionSpec,
}: ElectricSectionProps) {
  return (
    <section id="estimate-electric" className={className} aria-labelledby="public-estimate-electric-title">
      <div className="public-estimate-electric-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-electric-title">Электрика</h2>
          <p>Предварительный расчёт точек, кухонных выводов, света, выключателей и базового щита.</p>
        </div>
      </div>

      <div className="public-estimate-electric-header" aria-hidden="true">
        <span>Помещение</span>
        <span>Розетки</span>
        <span>Свет</span>
        <span>Выключатель</span>
        <span>Площадь</span>
        <span>Итого</span>
      </div>

      <div className="public-estimate-electric-room-list" aria-label="Помещения для расчёта электрики">
        {electricResult.roomResults.map((room) => {
          const electricDraft = electricRooms[room.roomId] ?? {};
          const isIncluded = electricDraft.isIncluded ?? true;

          return (
            <article className="public-estimate-electric-row" key={room.roomId}>
              <label className="public-estimate-electric-room">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(event) => onElectricRoomIncludedChange(room.roomId, event.target.checked)}
                />
                <span>
                  <strong>{room.roomName}</strong>
                  <small>{room.roomType === "bathroom" ? "влагозащищённые розетки" : "розетки 1 пост"}</small>
                </span>
              </label>

              <div className="public-estimate-electric-result">
                <span className="public-estimate-mobile-label">Розетки</span>
                <strong>
                  {room.socketCount} шт.
                  {room.waterproofSocketCount > 0 ? " IP" : ""}
                </strong>
              </div>

              <div className="public-estimate-electric-result">
                <span className="public-estimate-mobile-label">Свет</span>
                <strong>{room.lightOutputCount} шт.</strong>
              </div>

              <div className="public-estimate-electric-result">
                <span className="public-estimate-mobile-label">Выключатель</span>
                <strong>{room.switchCount} шт.</strong>
              </div>

              <div className="public-estimate-electric-result">
                <span className="public-estimate-mobile-label">Площадь</span>
                <strong>{formatMeasurement(room.area, "м²")}</strong>
              </div>

              <div className="public-estimate-electric-total">
                <span className="public-estimate-mobile-label">Итого</span>
                <strong>{formatMoney(room.roomTotal)}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-electric-options" aria-label="Опции электрики">
        <label className="public-estimate-electric-option-zone">
          <input
            type="checkbox"
            checked={electricOptions.includeKitchenOutputs}
            onChange={(event) => onElectricKitchenOutputsChange(event.target.checked)}
          />
          <span>
            <strong>Кухонные выводы</strong>
            <small>варочная, духовка, ПММ, холодильник, СВЧ и вытяжка</small>
          </span>
        </label>

        <label className="public-estimate-electric-option-zone">
          <input
            type="checkbox"
            checked={electricOptions.includeSwitchboard}
            onChange={(event) => onElectricSwitchboardChange(event.target.checked)}
          />
          <span>
            <strong>Щит и базовая автоматика</strong>
            <small>щит, автоматы, УЗО, реле, шины и комплект расходников</small>
          </span>
        </label>
      </div>

      <div className="public-estimate-electric-summary" aria-label="Итоги по электрике">
        {electricSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-electric-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {electricResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Розетки, выводы света, кухонные выводы и базовый щит</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{electricResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить электрику в смету.</p>
      )}
    </section>
  );
}
