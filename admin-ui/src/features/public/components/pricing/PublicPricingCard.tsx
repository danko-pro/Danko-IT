type PublicRepairPackage = {
  name: string;
  subtitle: string;
  price: string;
  exactPrice: string;
  totalExample: string;
  description: string;
  isFeatured?: boolean;
  badge?: string;
  metric?: string;
  items: string[];
};

type PublicPricingCardProps = {
  repairPackage: PublicRepairPackage;
  isActive: boolean;
  onMouseEnter: () => void;
  onFocus: () => void;
  onClick: () => void;
};

export function PublicPricingCard({
  repairPackage,
  isActive,
  onMouseEnter,
  onFocus,
  onClick,
}: PublicPricingCardProps) {
  return (
    <article
      className={`public-package-card${isActive ? " public-package-card-active" : ""}${
        repairPackage.isFeatured ? " public-package-card-featured" : ""
      }`}
      tabIndex={0}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onClick={onClick}
    >
      <div className="public-package-card-header">
        <div>
          <p className="public-package-name">{repairPackage.name}</p>
          <h3>{repairPackage.subtitle}</h3>
        </div>
        <span className="public-package-mark" aria-hidden="true">
          {repairPackage.name.replace("Пакет ", "")}
        </span>
      </div>

      <p className="public-package-description">{repairPackage.description}</p>

      <div className="public-package-price-block">
        <strong>{repairPackage.price}</strong>
        <span>расчётный ориентир: {repairPackage.exactPrice}</span>
        <em>{repairPackage.totalExample}</em>
      </div>

      {(repairPackage.badge || repairPackage.metric) && (
        <div className="public-package-highlights" aria-label="Особенности пакета">
          {repairPackage.badge && <span>{repairPackage.badge}</span>}
          {repairPackage.metric && <strong>{repairPackage.metric}</strong>}
        </div>
      )}

      <ul className="public-package-items">
        {repairPackage.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
