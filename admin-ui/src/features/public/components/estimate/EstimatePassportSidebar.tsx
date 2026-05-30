import { formatMoney } from "../../estimate/format";
import type { PublicEstimateResult } from "../../public-estimate-model";
import type { EstimatePackageClassification } from "../../public-estimate-package";

export type PassportVolumeItem = {
  label: string;
  value: string;
};

export type EstimatePassportSidebarProps = {
  summaryItems: PassportVolumeItem[];
  estimateResult: PublicEstimateResult;
  packageClassification: EstimatePackageClassification;
  onPrintVolumes: () => void;
  onOpenFullSpec: () => void;
  onPrintEstimate: () => void;
};

export function EstimatePassportSidebar({
  summaryItems,
  estimateResult,
  packageClassification,
  onPrintVolumes,
  onOpenFullSpec,
  onPrintEstimate,
}: EstimatePassportSidebarProps) {
  return (
    <aside id="estimate-passport" className="public-estimate-passport-sidebar" aria-label="Паспорт сметы">
      <section
        id="estimate-passport-volumes"
        className="public-estimate-card public-estimate-passport public-estimate-passport-volumes-panel"
        aria-label="Объёмы объекта"
      >
        <div className="public-estimate-passport-volumes-head">
          <span>Объём объекта</span>
        </div>
        <dl className="public-estimate-passport-volumes-list">
          {summaryItems.map((item) => (
            <div className="public-estimate-passport-volumes-item" key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <button
          className="public-estimate-passport-volumes-action"
          type="button"
          onClick={onPrintVolumes}
        >
          Скачать объёмы
        </button>
      </section>

      <section
        className="public-estimate-card public-estimate-passport public-estimate-passport-estimate-panel"
        aria-label="Оценка по составу сметы"
      >
        <div className="public-estimate-passport-head">
          <h2>Оценка по составу сметы</h2>
        </div>

        <div className="public-estimate-passport-metrics" aria-label="Итоги паспорта сметы">
          <div>
            <span>Итого</span>
            <strong>{formatMoney(estimateResult.totals.total)}</strong>
          </div>
          <div>
            <span>₽/м²</span>
            <strong>{formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²</strong>
          </div>
        </div>

        <div className="public-estimate-passport-detail">
          <span>Ориентир пакета (по всей смете)</span>
          <strong>
            {packageClassification.referencePrice > 0
              ? `${packageClassification.referenceLabel}: ${formatMoney(packageClassification.referencePrice)}/м²`
              : packageClassification.referenceLabel}
          </strong>
          {packageClassification.nextLabel ? (
            <small>
              До {packageClassification.nextLabel.replace("Пакет ", "")}: +{formatMoney(packageClassification.nextDelta)}/м²
            </small>
          ) : (
            <small>Верхний ориентир публичной модели</small>
          )}
          <small className="public-estimate-passport-hint">
            Это ориентир уровня всей сметы по ₽/м², а не выбранный вами пакет C / B / A в разделах
            техники, мебели и комплектации.
          </small>
        </div>

        {estimateResult.sections.length > 0 ? (
          <button
            className="public-estimate-passport-action public-estimate-passport-spec"
            type="button"
            onClick={onOpenFullSpec}
          >
            Полная спецификация
          </button>
        ) : null}

        <button className="public-estimate-passport-action" type="button" onClick={onPrintEstimate}>
          Скачать PDF сметы
        </button>
      </section>
    </aside>
  );
}
