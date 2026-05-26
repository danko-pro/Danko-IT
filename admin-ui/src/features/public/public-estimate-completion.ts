import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type CompletionOptions = {
  includeKitchenBase: boolean;
  kitchenLengthMeters: number;
  includeKitchenAppliancePenal: boolean;
  includeKitchenFridgePenal: boolean;
  includeWardrobe: boolean;
  includeBathroomFurniture: boolean;
};

export type CompletionCalculationResult = {
  kitchenLengthMeters: number;
  kitchenTotal: number;
  furnitureTotal: number;
  includedComponentCount: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

export const completionPublicRates = {
  kitchenBasePerMeter: 58000,
  kitchenAppliancePenal: 35000,
  kitchenFridgePenal: 39000,
  wardrobe: 135000,
  bathroomFurniture: 105000,
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function createLineItem(
  id: string,
  title: string,
  category: EstimateCostCategory,
  quantity: number,
  unit: string,
  unitPrice: number,
  note?: string,
): EstimateLineItem {
  const safeQuantity = safeNumber(quantity);
  const safeUnitPrice = safeNumber(unitPrice);

  return {
    id,
    sectionId: "completion",
    title,
    category,
    quantity: safeQuantity,
    unit,
    unitPrice: safeUnitPrice,
    total: safeQuantity * safeUnitPrice,
    isIncluded: true,
    note,
  };
}

function addLine(
  items: EstimateLineItem[],
  id: string,
  title: string,
  category: EstimateCostCategory,
  quantity: number,
  unit: string,
  unitPrice: number,
  note?: string,
) {
  if (quantity <= 0 || unitPrice <= 0) {
    return;
  }

  items.push(createLineItem(id, title, category, quantity, unit, unitPrice, note));
}

export function calculateCompletion(options: CompletionOptions): CompletionCalculationResult {
  const kitchenLengthMeters = safeNumber(options.kitchenLengthMeters);
  const kitchenBaseTotal = options.includeKitchenBase ? kitchenLengthMeters * completionPublicRates.kitchenBasePerMeter : 0;
  const kitchenAppliancePenalTotal = options.includeKitchenAppliancePenal ? completionPublicRates.kitchenAppliancePenal : 0;
  const kitchenFridgePenalTotal = options.includeKitchenFridgePenal ? completionPublicRates.kitchenFridgePenal : 0;
  const wardrobeTotal = options.includeWardrobe ? completionPublicRates.wardrobe : 0;
  const bathroomFurnitureTotal = options.includeBathroomFurniture ? completionPublicRates.bathroomFurniture : 0;
  const kitchenTotal = kitchenBaseTotal + kitchenAppliancePenalTotal + kitchenFridgePenalTotal;
  const furnitureTotal = wardrobeTotal + bathroomFurnitureTotal;
  const includedComponentCount = [
    options.includeKitchenBase && kitchenLengthMeters > 0,
    options.includeKitchenAppliancePenal,
    options.includeKitchenFridgePenal,
    options.includeWardrobe,
    options.includeBathroomFurniture,
  ].filter(Boolean).length;
  const items: EstimateLineItem[] = [];

  addLine(
    items,
    "completion-kitchen-base",
    "Кухня базовая",
    "materials",
    options.includeKitchenBase ? kitchenLengthMeters : 0,
    "м.п.",
    completionPublicRates.kitchenBasePerMeter,
    "Прямая базовая кухня. Доставка, сборка и монтаж учтены внутри public rate.",
  );
  addLine(
    items,
    "completion-kitchen-appliance-penal",
    "Пенал под технику",
    "materials",
    options.includeKitchenAppliancePenal ? 1 : 0,
    "шт.",
    completionPublicRates.kitchenAppliancePenal,
  );
  addLine(
    items,
    "completion-kitchen-fridge-penal",
    "Пенал под холодильник / высокий модуль",
    "materials",
    options.includeKitchenFridgePenal ? 1 : 0,
    "шт.",
    completionPublicRates.kitchenFridgePenal,
  );
  addLine(
    items,
    "completion-wardrobe",
    "Гардеробная / шкаф-купе",
    "materials",
    options.includeWardrobe ? 1 : 0,
    "компл.",
    completionPublicRates.wardrobe,
  );
  addLine(
    items,
    "completion-bathroom-furniture",
    "Мебель санузла / пеналы",
    "materials",
    options.includeBathroomFurniture ? 1 : 0,
    "компл.",
    completionPublicRates.bathroomFurniture,
  );
  const section = createEstimateSection(
    "completion",
    "Комплектация",
    items,
    "Кухня, пеналы, гардеробная и мебель санузла.",
  );

  return {
    kitchenLengthMeters,
    kitchenTotal,
    furnitureTotal,
    includedComponentCount,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
