export function SummaryMetric(props: {
  label: string;
  value: string;
  accent?: "cyan" | "amber" | "emerald";
}) {
  return (
    <div className={`dashboard-project-metric ${props.accent ? `dashboard-project-metric-${props.accent}` : ""}`}>
      <div className="dashboard-project-metric-label">{props.label}</div>
      <div className="dashboard-project-metric-value">{props.value}</div>
    </div>
  );
}

export function SideMetric(props: { label: string; value: string }) {
  return (
    <div className="dashboard-project-side-metric">
      <div className="dashboard-project-side-label">{props.label}</div>
      <div className="dashboard-project-side-value">{props.value}</div>
    </div>
  );
}

export function ContractHeaderIcon(props: { kind: "events" | "reminders" }) {
  switch (props.kind) {
    case "events":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <rect x="4.75" y="5.75" width="14.5" height="13.5" rx="2.5" />
          <path d="M8 3.75v4" />
          <path d="M16 3.75v4" />
          <path d="M4.75 10h14.5" />
        </svg>
      );
    case "reminders":
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <path d="M12 4.25a4.5 4.5 0 0 0-4.5 4.5v2.3c0 .9-.28 1.77-.8 2.5l-1.2 1.7h13l-1.2-1.7a4.34 4.34 0 0 1-.8-2.5v-2.3a4.5 4.5 0 0 0-4.5-4.5Z" />
          <path d="M10.15 18.25a2.1 2.1 0 0 0 3.7 0" />
        </svg>
      );
  }
}
