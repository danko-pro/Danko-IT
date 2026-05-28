/**
 * Ориентиры пакетов C / B / A по стоимости квадратного метра.
 *
 * Важно: это ориентир по всей смете (₽/м²), а НЕ выбранный пользователем пакет
 * комплектации/техники/мебели в конкретном разделе. Значение помогает понять,
 * к какому ценовому уровню в среднем близка собранная смета.
 */
export type EstimatePackageBenchmark = {
  label: string;
  pricePerM2: number;
};

export const estimatePackageBenchmarks: EstimatePackageBenchmark[] = [
  { label: "Пакет C", pricePerM2: 40228 },
  { label: "Пакет B", pricePerM2: 52280 },
  { label: "Пакет A", pricePerM2: 75416 },
];

export type EstimatePackageClassification = {
  referenceLabel: string;
  referencePrice: number;
  nextLabel: string;
  nextDelta: number;
};

export function classifyEstimatePackage(pricePerSquareMeter: number): EstimatePackageClassification {
  const safePricePerSquareMeter = Number.isFinite(pricePerSquareMeter)
    ? Math.max(0, pricePerSquareMeter)
    : 0;
  const [packageC, packageB, packageA] = estimatePackageBenchmarks;

  if (safePricePerSquareMeter <= 0) {
    return {
      referenceLabel: "Ориентир появится после заполнения",
      referencePrice: 0,
      nextLabel: packageC.label,
      nextDelta: packageC.pricePerM2,
    };
  }

  if (safePricePerSquareMeter < packageC.pricePerM2) {
    // Смета дешевле нижнего ориентира C: показываем, что мы ниже уровня C,
    // и сколько ₽/м² не хватает до него, без дублирования «Пакет C / До C».
    return {
      referenceLabel: `Ниже ориентира «${packageC.label}»`,
      referencePrice: 0,
      nextLabel: packageC.label,
      nextDelta: packageC.pricePerM2 - safePricePerSquareMeter,
    };
  }

  if (safePricePerSquareMeter < packageB.pricePerM2) {
    return {
      referenceLabel: packageC.label,
      referencePrice: packageC.pricePerM2,
      nextLabel: packageB.label,
      nextDelta: packageB.pricePerM2 - safePricePerSquareMeter,
    };
  }

  if (safePricePerSquareMeter < packageA.pricePerM2) {
    return {
      referenceLabel: packageB.label,
      referencePrice: packageB.pricePerM2,
      nextLabel: packageA.label,
      nextDelta: packageA.pricePerM2 - safePricePerSquareMeter,
    };
  }

  return {
    referenceLabel: packageA.label,
    referencePrice: packageA.pricePerM2,
    nextLabel: "",
    nextDelta: 0,
  };
}
