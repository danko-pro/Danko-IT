export function MetricChip(props: { label: string; value: string }) {
  return (
    <div className="subpanel p-3 metric-chip">
      <div className="row-kicker metric-chip-label">{props.label}</div>
      <div className="mt-1 text-sm font-semibold metric-chip-value">{props.value}</div>
    </div>
  );
}
