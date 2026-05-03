import { DoorWorkbenchDock } from "./dock";
import { DoorWorkbenchFocus } from "./focus";
import { DoorWorkbenchQueue } from "./queue";
import { formatMoney } from "../shared";
import type { DoorsStageReadyProps, DoorsStageSectionProps } from "../doors/types";

export function DoorsWorkbenchStage(props: DoorsStageSectionProps) {
  if (!props.projectDetail) {
    return (
      <section className="doors-workbench doors-workbench-empty" data-testid="doors-workbench">
        <div className="doors-workbench-empty-panel">Сначала выберите проект калькулятора.</div>
      </section>
    );
  }
  return <DoorsWorkbenchReadyStage {...props} projectDetail={props.projectDetail} />;
}

function DoorsWorkbenchReadyStage(props: DoorsStageReadyProps) {
  const summary = props.doorsStageSummary;
  return (
    <section className="doors-workbench" data-testid="doors-workbench">
      <header className="doors-workbench-hero">
        <div className="doors-workbench-mark" aria-hidden="true">
          <span />
        </div>
        <div className="doors-workbench-hero-copy">
          <div className="doors-workbench-kicker">Дверной workbench</div>
          <h2>Проемы, двери и комплектация</h2>
          <div className="doors-workbench-hero-line">
            {summary.total_items} позиций · {summary.door_units} дверей · {summary.opening_units + summary.trim_only_units} проемов
          </div>
        </div>
        <div className="doors-workbench-hero-metrics">
          <HeroMetric label="Продажа" value={formatMoney(summary.sale_total)} />
          <HeroMetric label="Монтаж" value={formatMoney(summary.install_total)} />
          <HeroMetric label="Маржа" value={formatMoney(summary.margin_total)} />
        </div>
      </header>

      <div className="doors-workbench-grid">
        <div className="doors-workbench-left">
          <DoorWorkbenchQueue {...props} />
        </div>
        <DoorWorkbenchFocus {...props} />
        <DoorWorkbenchDock {...props} />
      </div>
    </section>
  );
}

function HeroMetric(props: { label: string; value: string }) {
  return (
    <div className="doors-workbench-hero-metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
