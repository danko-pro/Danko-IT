import { PublicPricingCard } from "./PublicPricingCard";

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

type PublicPricingCardsProps = {
  packages: PublicRepairPackage[];
  activePackageIndex: number;
  onPackageActivate: (index: number) => void;
};

export function PublicPricingCards({
  packages,
  activePackageIndex,
  onPackageActivate,
}: PublicPricingCardsProps) {
  return (
    <div className="public-package-grid" aria-label="Пакеты ремонта">
      {packages.map((repairPackage, index) => {
        const isActive = activePackageIndex === index;

        return (
          <PublicPricingCard
            key={repairPackage.name}
            repairPackage={repairPackage}
            isActive={isActive}
            onMouseEnter={() => onPackageActivate(index)}
            onFocus={() => onPackageActivate(index)}
            onClick={() => onPackageActivate(index)}
          />
        );
      })}
    </div>
  );
}
