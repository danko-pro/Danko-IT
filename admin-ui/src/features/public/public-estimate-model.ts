export type EstimateCostCategory = "works" | "materials" | "equipment" | "consumables";

export type EstimateSectionId =
  | "geometry"
  | "warm_floor"
  | "flooring"
  | "walls"
  | "ceiling"
  | "electric"
  | "plumbing"
  | "doors"
  | "completion"
  | "appliances"
  | "loose_furniture"
  | "extras";

export type EstimateLineItem = {
  id: string;
  sectionId: EstimateSectionId;
  title: string;
  category: EstimateCostCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  isIncluded: boolean;
  note?: string;
};

export type EstimateCategoryTotals = {
  works: number;
  materials: number;
  equipment: number;
  consumables: number;
  total: number;
};

export type EstimateTotals = EstimateCategoryTotals & {
  pricePerSquareMeter: number;
};

export type EstimateSection = {
  id: EstimateSectionId;
  title: string;
  description?: string;
  items: EstimateLineItem[];
  totals: EstimateCategoryTotals;
};

export type PublicEstimateResult = {
  sections: EstimateSection[];
  totals: EstimateTotals;
};

const emptyCategoryTotals: EstimateCategoryTotals = {
  works: 0,
  materials: 0,
  equipment: 0,
  consumables: 0,
  total: 0,
};

function safeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function createEmptyCategoryTotals(): EstimateCategoryTotals {
  return { ...emptyCategoryTotals };
}

export function calculateLineItemTotal(item: EstimateLineItem) {
  if (!item.isIncluded) {
    return 0;
  }

  return safeMoney(item.quantity) * safeMoney(item.unitPrice);
}

export function calculateSectionTotals(items: EstimateLineItem[]): EstimateCategoryTotals {
  return items.reduce<EstimateCategoryTotals>((totals, item) => {
    const lineTotal = calculateLineItemTotal(item);

    return {
      ...totals,
      [item.category]: totals[item.category] + lineTotal,
      total: totals.total + lineTotal,
    };
  }, createEmptyCategoryTotals());
}

export function calculateEstimateTotals(sections: EstimateSection[], floorArea: number): EstimateTotals {
  const totals = sections.reduce<EstimateCategoryTotals>((currentTotals, section) => {
    const sectionTotals = calculateSectionTotals(section.items);

    return {
      works: currentTotals.works + sectionTotals.works,
      materials: currentTotals.materials + sectionTotals.materials,
      equipment: currentTotals.equipment + sectionTotals.equipment,
      consumables: currentTotals.consumables + sectionTotals.consumables,
      total: currentTotals.total + sectionTotals.total,
    };
  }, createEmptyCategoryTotals());

  const safeFloorArea = safeMoney(floorArea);

  return {
    ...totals,
    pricePerSquareMeter: safeFloorArea > 0 ? totals.total / safeFloorArea : 0,
  };
}

export function createEstimateSection(
  id: EstimateSectionId,
  title: string,
  items: EstimateLineItem[],
  description?: string,
): EstimateSection {
  return {
    id,
    title,
    description,
    items,
    totals: calculateSectionTotals(items),
  };
}

export function createEmptyEstimateResult(): PublicEstimateResult {
  const sections: EstimateSection[] = [];

  return {
    sections,
    totals: calculateEstimateTotals(sections, 0),
  };
}
