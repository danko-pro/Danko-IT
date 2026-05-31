import type { ChangeEvent } from "react";
import type { FlooringOptionsDraft, FlooringRoomDraft } from "../../estimate/context";
import { formatMeasurement, formatMoney } from "../../estimate/format";
import type { estimateNumericFieldProps } from "../../public-estimate-input";
import type {
  FlooringCalculationResult,
  FlooringCoveringType,
  FlooringLayoutType,
  FlooringPlinthType,
  FlooringPreparationType,
} from "../../public-estimate-flooring";

export type FlooringSummaryItem = {
  label: string;
  value: string;
  isStrong?: boolean;
};

export type FlooringSectionProps = {
  className: string;
  stepLabel: string;
  flooringResult: FlooringCalculationResult;
  flooringRooms: Record<string, FlooringRoomDraft>;
  flooringOptions: FlooringOptionsDraft;
  flooringCoveringOptions: Array<{ value: FlooringCoveringType; label: string }>;
  flooringPreparationOptions: Array<{ value: FlooringPreparationType; label: string }>;
  flooringLayoutOptions: Array<{ value: FlooringLayoutType; label: string }>;
  flooringPlinthOptions: Array<{ value: FlooringPlinthType; label: string }>;
  numberFieldProps: typeof estimateNumericFieldProps;
  flooringSummaryItems: FlooringSummaryItem[];
  onFlooringRoomIncludedChange: (roomId: string, isIncluded: boolean) => void;
  onFlooringCoveringChange: (roomId: string, coveringType: FlooringCoveringType) => void;
  onFlooringPreparationChange: (roomId: string, preparationType: FlooringPreparationType) => void;
  onFlooringLayoutChange: (roomId: string, layoutType: FlooringLayoutType) => void;
  onFlooringOptionsChange: (patch: Partial<FlooringOptionsDraft>) => void;
  onFlooringThresholdCountChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFlooringThresholdCountBlur: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenSectionSpec: () => void;
};

export function FlooringSection({
  className,
  stepLabel,
  flooringResult,
  flooringRooms,
  flooringOptions,
  flooringCoveringOptions,
  flooringPreparationOptions,
  flooringLayoutOptions,
  flooringPlinthOptions,
  numberFieldProps,
  flooringSummaryItems,
  onFlooringRoomIncludedChange,
  onFlooringCoveringChange,
  onFlooringPreparationChange,
  onFlooringLayoutChange,
  onFlooringOptionsChange,
  onFlooringThresholdCountChange,
  onFlooringThresholdCountBlur,
  onOpenSectionSpec,
}: FlooringSectionProps) {
  return (
    <section id="estimate-flooring" className={className} aria-labelledby="public-estimate-flooring-title">
      <div className="public-estimate-flooring-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-flooring-title">Полы</h2>
          <p>Выберите покрытие, подготовку и способ укладки по помещениям. Плинтус, порожки и демонтаж считаются отдельными строками.</p>
        </div>
      </div>

      <div className="public-estimate-flooring-header" aria-hidden="true">
        <span>Помещение</span>
        <span>Покрытие</span>
        <span>Подготовка</span>
        <span>Укладка</span>
        <span>Закупка</span>
        <span>Итого</span>
      </div>

      <div className="public-estimate-flooring-room-list" aria-label="Помещения для расчёта полов">
        {flooringResult.roomResults.map((room) => {
          const flooringDraft = flooringRooms[room.roomId] ?? {};
          const isIncluded = flooringDraft.isIncluded ?? true;

          return (
            <article className="public-estimate-flooring-row" key={room.roomId}>
              <label className="public-estimate-flooring-room">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(event) => onFlooringRoomIncludedChange(room.roomId, event.target.checked)}
                />
                <span>
                  <strong>{room.roomName}</strong>
                  <small>{formatMeasurement(room.area, "м²")}</small>
                </span>
              </label>

              <label className="public-estimate-field public-estimate-flooring-covering">
                <span className="public-estimate-mobile-label">Покрытие</span>
                <select
                  className="public-estimate-select"
                  value={room.coveringType}
                  disabled={!isIncluded}
                  onChange={(event) => onFlooringCoveringChange(room.roomId, event.target.value as FlooringCoveringType)}
                >
                  {flooringCoveringOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-estimate-field public-estimate-flooring-preparation">
                <span className="public-estimate-mobile-label">Подготовка</span>
                <select
                  className="public-estimate-select"
                  value={room.preparationType}
                  disabled={!isIncluded}
                  onChange={(event) =>
                    onFlooringPreparationChange(room.roomId, event.target.value as FlooringPreparationType)
                  }
                >
                  {flooringPreparationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-estimate-field public-estimate-flooring-layout">
                <span className="public-estimate-mobile-label">Укладка</span>
                <select
                  className="public-estimate-select"
                  value={room.layoutType}
                  disabled={!isIncluded}
                  onChange={(event) => onFlooringLayoutChange(room.roomId, event.target.value as FlooringLayoutType)}
                >
                  {flooringLayoutOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="public-estimate-flooring-result">
                <span className="public-estimate-mobile-label">Закупка</span>
                <strong>{formatMeasurement(room.purchaseArea, "м²")}</strong>
              </div>

              <div className="public-estimate-flooring-total">
                <span className="public-estimate-mobile-label">Итого</span>
                <strong>{formatMoney(room.roomTotal)}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="public-estimate-flooring-options">
        <div className="public-estimate-flooring-option-zone">
          <div className="public-estimate-flooring-option-head">
            <label className="public-estimate-option-check">
              <input
                type="checkbox"
                checked={flooringOptions.includePlinth}
                onChange={(event) => onFlooringOptionsChange({ includePlinth: event.target.checked })}
              />
              <span>Плинтус</span>
            </label>
            <small>Периметр помещений</small>
          </div>

          <label className="public-estimate-field">
            <span>Тип плинтуса</span>
            <select
              className="public-estimate-select"
              value={flooringOptions.plinthType}
              disabled={!flooringOptions.includePlinth}
              onChange={(event) => onFlooringOptionsChange({ plinthType: event.target.value as FlooringPlinthType })}
            >
              {flooringPlinthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="public-estimate-flooring-option-zone">
          <div className="public-estimate-flooring-option-head">
            <label className="public-estimate-option-check">
              <input
                type="checkbox"
                checked={flooringOptions.includeThresholds}
                onChange={(event) => onFlooringOptionsChange({ includeThresholds: event.target.checked })}
              />
              <span>Порожки</span>
            </label>
            <small>Стыки и переходы</small>
          </div>

          <label className="public-estimate-field">
            <span>Количество</span>
            <input
              className="public-estimate-input"
              inputMode="numeric"
              value={flooringOptions.thresholdCount}
              disabled={!flooringOptions.includeThresholds}
              {...numberFieldProps}
              onChange={onFlooringThresholdCountChange}
              onBlur={onFlooringThresholdCountBlur}
            />
          </label>
        </div>

        <div className="public-estimate-flooring-option-zone public-estimate-flooring-option-zone-compact">
          <div className="public-estimate-flooring-option-head">
            <label className="public-estimate-option-check">
              <input
                type="checkbox"
                checked={flooringOptions.includeDemolition}
                onChange={(event) => onFlooringOptionsChange({ includeDemolition: event.target.checked })}
              />
              <span>Демонтаж</span>
            </label>
            <small>Старое покрытие</small>
          </div>
        </div>
      </div>

      <div className="public-estimate-flooring-summary" aria-label="Итоги по полам">
        {flooringSummaryItems.map((item) => (
          <div className={item.isStrong ? "public-estimate-flooring-total-cell" : undefined} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {flooringResult.section.items.length > 0 ? (
        <div className="public-estimate-spec-actions">
          <div className="public-estimate-spec-actions-head">
            <p>Состав раздела</p>
            <span>Покрытия, подготовка, плинтус и расходники</span>
          </div>
          <button className="public-estimate-spec-open" type="button" onClick={onOpenSectionSpec}>
            Открыть спецификацию
            <span className="public-estimate-spec-open-count">{flooringResult.section.items.length} строк</span>
          </button>
        </div>
      ) : (
        <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить полы в смету.</p>
      )}
    </section>
  );
}
