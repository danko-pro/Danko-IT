import { ProjectAccountingStatusSummary } from "./project-accounting-status-summary";
import { formatMoney, formatMoneyPerSquare } from "../model/project-accounting-format";
import type { DashboardProjectCardData } from "../model/project-model";

type StripTone = "amber" | "cyan" | "emerald" | "rose" | "slate";
type StripChartTone = "positive" | "negative" | "neutral";

type SummaryStripChart = {
  actualWidth: number;
  planWidth: number;
  overflowOffset: number;
  overflowWidth: number;
  deltaLabel: string;
  deltaTone: StripChartTone;
};

const compactNumberFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function formatAreaMeta(value: number) {
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} м²`;
}

function countEntriesByStatuses(
  project: DashboardProjectCardData,
  statuses: DashboardProjectCardData["ledgerEntries"][number]["status"][],
) {
  return project.ledgerEntries.filter((entry) => statuses.includes(entry.status)).length;
}

function formatCompactMoneyDelta(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${compactNumberFormatter.format(absoluteValue / 1_000_000)} млн ₽`;
  }

  if (absoluteValue >= 1_000) {
    return `${compactNumberFormatter.format(absoluteValue / 1_000)} тыс ₽`;
  }

  return `${compactNumberFormatter.format(absoluteValue)} ₽`;
}

function createPlanFactChart(planAmount: number, actualAmount: number): SummaryStripChart | null {
  const ceiling = Math.max(planAmount, actualAmount, 1);
  const safePlanWidth = (planAmount / ceiling) * 100;
  const safeActualWidth = (Math.min(actualAmount, planAmount) / ceiling) * 100;
  const overflowWidth = actualAmount > planAmount ? ((actualAmount - planAmount) / ceiling) * 100 : 0;
  const delta = planAmount - actualAmount;

  if (Math.abs(planAmount) < 0.005 && Math.abs(actualAmount) < 0.005) {
    return null;
  }

  return {
    actualWidth: safeActualWidth,
    planWidth: safePlanWidth,
    overflowOffset: safePlanWidth,
    overflowWidth,
    deltaLabel:
      Math.abs(delta) < 0.005
        ? "0 ₽"
        : `${delta > 0 ? "+" : "-"}${formatCompactMoneyDelta(delta)}`,
    deltaTone:
      Math.abs(delta) < 0.005 ? "neutral" : delta > 0 ? "positive" : "negative",
  };
}

function SummaryStripItem(props: {
  label: string;
  value: string;
  meta: string;
  tone: StripTone;
  chart?: SummaryStripChart | null;
}) {
  return (
    <div
      className={
        props.chart
          ? `dashboard-ledger-strip-item dashboard-ledger-strip-item-${props.tone} dashboard-ledger-strip-item-has-chart`
          : `dashboard-ledger-strip-item dashboard-ledger-strip-item-${props.tone}`
      }
    >
      <div className="dashboard-ledger-strip-label">{props.label}</div>
      {props.chart ? (
        <>
          <div className="dashboard-ledger-strip-hero">
            <div className="dashboard-ledger-strip-value">{props.value}</div>
            <div className="dashboard-ledger-strip-chart" aria-hidden="true">
              <div className="dashboard-ledger-strip-chart-track">
                <span
                  className="dashboard-ledger-strip-chart-bar dashboard-ledger-strip-chart-bar-plan"
                  style={{ width: `${props.chart.planWidth}%` }}
                />
                <span
                  className="dashboard-ledger-strip-chart-bar dashboard-ledger-strip-chart-bar-actual"
                  style={{ width: `${props.chart.actualWidth}%` }}
                />
                {props.chart.overflowWidth > 0 ? (
                  <span
                    className="dashboard-ledger-strip-chart-bar dashboard-ledger-strip-chart-bar-overflow"
                    style={{
                      left: `${props.chart.overflowOffset}%`,
                      width: `${props.chart.overflowWidth}%`,
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div className="dashboard-ledger-strip-meta-row">
            <div className="dashboard-ledger-strip-meta">{props.meta}</div>
            <div
              className={`dashboard-ledger-strip-delta dashboard-ledger-strip-delta-${props.chart.deltaTone}`}
            >
              {props.chart.deltaLabel}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="dashboard-ledger-strip-value">{props.value}</div>
          <div className="dashboard-ledger-strip-meta">{props.meta}</div>
        </>
      )}
    </div>
  );
}

export function ProjectAccountingSummaryStrip(props: { project: DashboardProjectCardData }) {
  const plannedEntriesCount = countEntriesByStatuses(props.project, ["planned", "invoice", "waiting-payment"]);
  const closedEntriesCount = countEntriesByStatuses(props.project, ["paid", "completed"]);
  const areaMeta = formatAreaMeta(props.project.areaM2);
  const planFactChart = createPlanFactChart(props.project.plannedTotal, props.project.actualTotal);

  return (
    <section className="dashboard-ledger-topbar">
      <div className="dashboard-ledger-summary-strip">
        <SummaryStripItem
          label="Договор"
          value={formatMoney(props.project.contract.amount)}
          meta={areaMeta}
          tone="amber"
        />
        <SummaryStripItem
          label="Остаток 30%"
          value={formatMoney(props.project.remainingTotal)}
          meta={`резерв ${props.project.plannedMarginPercent}%`}
          tone="emerald"
        />
        <SummaryStripItem
          label="План"
          value={formatMoney(props.project.plannedTotal)}
          meta={`${plannedEntriesCount} активн. строк`}
          tone="slate"
          chart={planFactChart}
        />
        <SummaryStripItem
          label="Факт"
          value={formatMoney(props.project.actualTotal)}
          meta={`${closedEntriesCount} закрыт. строк`}
          tone="cyan"
          chart={planFactChart}
        />
        <SummaryStripItem
          label="Работы"
          value={formatMoneyPerSquare(props.project.workPerM2)}
          meta={areaMeta}
          tone="amber"
        />
        <SummaryStripItem
          label="Материалы"
          value={formatMoneyPerSquare(props.project.materialsPerM2)}
          meta={areaMeta}
          tone="emerald"
        />
      </div>

      <ProjectAccountingStatusSummary project={props.project} />
    </section>
  );
}
