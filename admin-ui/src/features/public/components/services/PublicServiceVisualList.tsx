import { PublicServiceVisualIcon, getServiceVisualIcon } from "./PublicServiceVisualIcon";

type PublicServiceVisualListProps = {
  serviceIndex: number;
  visualTitle: string;
  visualItems: string[];
};

export function PublicServiceVisualList({
  serviceIndex,
  visualTitle,
  visualItems,
}: PublicServiceVisualListProps) {
  return (
    <div className="public-service-visual" aria-label={`Схема этапа: ${visualTitle}`}>
      <div className="public-service-visual-heading">
        <span>Схема этапа</span>
        <strong>{visualTitle}</strong>
      </div>
      <ol className="public-service-visual-list">
        {visualItems.map((item, index) => (
          <li className="public-service-visual-item" key={item}>
            <span className="public-service-visual-dot">
              <PublicServiceVisualIcon name={getServiceVisualIcon(serviceIndex, index)} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
