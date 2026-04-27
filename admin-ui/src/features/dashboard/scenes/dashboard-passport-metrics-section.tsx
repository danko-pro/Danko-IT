import { DashboardPassportMetricField } from "./dashboard-passport-metric-field";
import type { PassportSectionProps } from "./dashboard-passport-section-types";

export function DashboardPassportMetricsSection(props: PassportSectionProps) {
  const { draft, setDraft } = props;

  return (
    <section className="dashboard-passport-section dashboard-passport-section-metrics">
      <div className="dashboard-passport-section-head">
        <span className="dashboard-passport-section-kicker">Параметры</span>
        <h3 className="dashboard-passport-section-title">Параметры объекта</h3>
      </div>

      <div className="dashboard-passport-grid-metrics">
        <div className="dashboard-passport-field-full">
          <DashboardPassportMetricField
            label="Площадь квартиры"
            value={draft.areaM2}
            suffix="м²"
            setValue={(nextValue) => setDraft((current) => ({ ...current, areaM2: nextValue }))}
          />
        </div>

        <DashboardPassportMetricField
          label="Комнат"
          value={draft.roomCount}
          mode="integer"
          className="dashboard-passport-input-metrics-small"
          setValue={(nextValue) => setDraft((current) => ({ ...current, roomCount: nextValue }))}
        />

        <DashboardPassportMetricField
          label="Потолки"
          value={draft.ceilingHeightM}
          suffix="м"
          className="dashboard-passport-input-metrics-small"
          setValue={(nextValue) => setDraft((current) => ({ ...current, ceilingHeightM: nextValue }))}
        />

        <div className="dashboard-passport-field-full">
          <DashboardPassportMetricField
            label="Плановая маржа"
            value={draft.plannedMarginPercent}
            suffix="%"
            className="dashboard-passport-input-metrics-small"
            setValue={(nextValue) => setDraft((current) => ({ ...current, plannedMarginPercent: nextValue }))}
          />
        </div>
      </div>
    </section>
  );
}
