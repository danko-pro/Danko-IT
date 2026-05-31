import { PublicServiceVisualList } from "./PublicServiceVisualList";

type PublicServiceDetailItem = {
  title: string;
  description: string;
  includes: string[];
  result: string;
  visualTitle: string;
  visualItems: string[];
};

type PublicServiceDetailProps = {
  activeService: PublicServiceDetailItem;
  activeServiceIndex: number;
};

export function PublicServiceDetail({ activeService, activeServiceIndex }: PublicServiceDetailProps) {
  return (
    <article
      className="public-service-detail"
      role="tabpanel"
      id="public-service-panel"
      aria-labelledby={`public-service-tab-${activeServiceIndex}`}
    >
      <div className="public-service-detail-content" key={activeService.title}>
        <div className="public-service-detail-header">
          <span className="public-service-number">{String(activeServiceIndex + 1).padStart(2, "0")}</span>
          <h3>{activeService.title}</h3>
          <p>{activeService.description}</p>
        </div>

        <div className="public-service-detail-body">
          <div>
            <h4>Что входит</h4>
            <ul>
              {activeService.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="public-service-result">
            <h4>Результат</h4>
            <p>{activeService.result}</p>
          </div>
        </div>

        <PublicServiceVisualList
          serviceIndex={activeServiceIndex}
          visualTitle={activeService.visualTitle}
          visualItems={activeService.visualItems}
        />
      </div>
    </article>
  );
}
