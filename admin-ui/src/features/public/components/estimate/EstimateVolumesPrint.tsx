export type EstimateVolumesPrintItem = {
  label: string;
  value: string;
};

export type EstimateVolumesPrintProps = {
  summaryItems: EstimateVolumesPrintItem[];
};

export function EstimateVolumesPrint({ summaryItems }: EstimateVolumesPrintProps) {
  return (
    <section className="public-estimate-volumes-print" aria-hidden="true">
      <h1>Объёмы объекта</h1>
      <dl className="public-estimate-volumes-print-list">
        {summaryItems.map((item) => (
          <div className="public-estimate-volumes-print-item" key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
