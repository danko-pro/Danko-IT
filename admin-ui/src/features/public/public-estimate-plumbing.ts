import type { EstimateRoomType } from "./public-estimate-geometry";
import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";
import {
  calculateKitchenSinkZone,
  type PlumbingPackageLevel,
} from "./public-estimate-plumbing-zones";

export type { PlumbingPackageLevel } from "./public-estimate-plumbing-zones";
export {
  calculateKitchenSinkZone,
  expandPlumbingSectionForSpec,
  getKitchenSinkZonePackageTotal,
  getKitchenSinkZoneSpecItems,
  kitchenSinkPackageLabels,
  KITCHEN_SINK_ZONE_DISCLAIMER,
} from "./public-estimate-plumbing-zones";

export type PlumbingRoomInput = {
  roomId: string;
  roomName: string;
  roomType: EstimateRoomType;
  area: number;
};

export type ShowerAreaVariant = "tiled-tray" | "enclosure";

export type PlumbingOptions = {
  includeBathroomSet: boolean;
  includeBath: boolean;
  includeHygienicShower: boolean;
  includeElectricTowelRail: boolean;
  includeKitchenSink: boolean;
  kitchenSinkPackageLevel: PlumbingPackageLevel;
  includeDishwasherOutput: boolean;
  includeWasherOutput: boolean;
  includeWaterNode: boolean;
  includeLeakProtection: boolean;
  includeToiletRelocation: boolean;
  includeShowerArea: boolean;
  showerAreaVariant: ShowerAreaVariant;
};

export type PlumbingComposition = {
  bathroomCount: number;
  hasKitchen: boolean;
  hasPlumbingRooms: boolean;
  coldWaterPoints: number;
  hotWaterPoints: number;
  sewerPoints: number;
  fixtureCount: number;
};

export type PlumbingCalculationResult = PlumbingComposition & {
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

type PlumbingRate = {
  group: "Санузел" | "Кухня" | "Тех. зона" | "Узел" | "Доп." | "Душевая";
  unit: "шт";
  coldWaterPoints: number;
  hotWaterPoints: number;
  sewerPoints: number;
  works: number;
  materials: number;
  equipment: number;
  consumables: number;
  comment?: string;
};

export const plumbingRates = {
  vanitySinkSet: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 1,
    works: 6500,
    materials: 1000,
    consumables: 1500,
    equipment: 25000,
    comment: "тумба с раковиной, крепеж, подключение к ХВС/ГВС и канализации",
  },
  sinkFaucet: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 0,
    works: 2500,
    materials: 1300,
    consumables: 500,
    equipment: 12000,
    comment: "смеситель, подводки, отсечные краны",
  },
  acrylicBath: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 1,
    works: 9000,
    materials: 2500,
    consumables: 1500,
    equipment: 25000,
  },
  bathSiphon: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 1500,
    materials: 2500,
    consumables: 500,
    equipment: 0,
    comment: "слив-перелив",
  },
  bathMixer: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 0,
    works: 2500,
    materials: 1500,
    consumables: 500,
    equipment: 12000,
    comment: "смеситель для ванны с изливом",
  },
  wallHungToilet: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 18000,
    materials: 9000,
    consumables: 2500,
    equipment: 32000,
    comment: "инсталляция, кнопка, унитаз",
  },
  hygienicShower: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 0,
    works: 3500,
    materials: 1500,
    consumables: 500,
    equipment: 9000,
    comment: "выводы и подключение",
  },
  electricTowelRail: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 4000,
    materials: 1500,
    consumables: 500,
    equipment: 15000,
    comment: "монтаж и подключение к электрике",
  },
  kitchenSink: {
    group: "Кухня",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 1,
    works: 6500,
    materials: 3500,
    consumables: 1500,
    equipment: 0,
    comment: "выводы под мойку",
  },
  kitchenSinkSiphon: {
    group: "Кухня",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 1500,
    materials: 2500,
    consumables: 500,
    equipment: 0,
    comment: "сифон, выпуск, подключение мойки",
  },
  dishwasherOutput: {
    group: "Тех. зона",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 1,
    works: 5500,
    materials: 3000,
    consumables: 1000,
    equipment: 0,
    comment: "выводы и подключение",
  },
  washerDryerOutput: {
    group: "Тех. зона",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 6500,
    materials: 3500,
    consumables: 1500,
    equipment: 0,
    comment: "выводы под стиральную и сушильную",
  },
  waterCollector: {
    group: "Узел",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 10000,
    materials: 28000,
    consumables: 3000,
    equipment: 0,
    comment: "коллекторная группа",
  },
  waterFilters: {
    group: "Узел",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 5000,
    materials: 18000,
    consumables: 1500,
    equipment: 0,
    comment: "фильтры на магистрали",
  },
  shutoffValves: {
    group: "Доп.",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 500,
    materials: 850,
    consumables: 100,
    equipment: 0,
  },
  leakProtection: {
    group: "Узел",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 9000,
    materials: 8000,
    consumables: 1500,
    equipment: 45000,
    comment: "датчики и перекрытие воды",
  },
  // --- Сан v1: атомарные позиции для сценариев (раздел C документа) ---
  extraWaterPoint: {
    group: "Доп.",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 0,
    works: 4500,
    materials: 3000,
    consumables: 1000,
    equipment: 0,
    comment: "дополнительная точка ХВС / ГВС",
  },
  extraSewerPoint: {
    group: "Доп.",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 4500,
    materials: 2500,
    consumables: 1000,
    equipment: 0,
    comment: "дополнительная точка канализации",
  },
  toiletFanOutlet: {
    group: "Санузел",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 1500,
    materials: 1800,
    consumables: 500,
    equipment: 0,
    comment: "фановый отвод / манжета для инсталляции",
  },
  showerDrain: {
    group: "Душевая",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 1,
    works: 12000,
    materials: 7000,
    consumables: 2000,
    equipment: 15000,
    comment: "душевой трап с оборудованием",
  },
  showerPartition: {
    group: "Душевая",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 5000,
    materials: 1500,
    consumables: 500,
    equipment: 17000,
    comment: "душевая перегородка стационарная",
  },
  concealedShowerMixer: {
    group: "Душевая",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 0,
    works: 12000,
    materials: 3000,
    consumables: 500,
    equipment: 37000,
    comment: "душевой смеситель скрытого монтажа с тропическим душем",
  },
  tiledShowerTray: {
    group: "Душевая",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 20000,
    materials: 12000,
    consumables: 2500,
    equipment: 0,
    comment: "душевой поддон из плитки с трапом",
  },
  showerEnclosure: {
    group: "Душевая",
    unit: "шт",
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    works: 6500,
    materials: 2500,
    consumables: 1000,
    equipment: 30000,
    comment: "душевой уголок / стеклянное ограждение",
  },
  showerStackMixer: {
    group: "Душевая",
    unit: "шт",
    coldWaterPoints: 1,
    hotWaterPoints: 1,
    sewerPoints: 0,
    works: 2500,
    materials: 1500,
    consumables: 500,
    equipment: 12000,
    comment: "душевой смеситель / душевая стойка",
  },
} satisfies Record<string, PlumbingRate>;

export type PlumbingRateKey = keyof typeof plumbingRates;

export function plumbingRateTotal(rate: PlumbingRate): number {
  return rate.works + rate.materials + rate.equipment + rate.consumables;
}

/**
 * Сценарий — агрегатор-ссылка на атомарные позиции. Он НЕ хранит свою цену:
 * итог = Σ(rate атомарной позиции × quantity). Состав каждой позиции по 4 категориям
 * (works/materials/equipment/consumables) разворачивается через addRateLines.
 */
export type PlumbingScenarioItemRef = {
  id: string;
  title: string;
  rateKey: PlumbingRateKey;
  defaultQuantity: number;
};

export type PlumbingScenarioId = "scenario-toilet-relocation" | "scenario-shower-area";

export const toiletRelocationScenario = {
  id: "scenario-toilet-relocation" as const,
  publicTitle: "Перенос унитаза / инсталляции",
  publicDescription:
    "Переносим точки воды и канализации под новое место инсталляции и подключаем фановый отвод. Саму инсталляцию повторно не считаем — она в базовом санузле.",
  items: [
    { id: "extra-water-point", title: "Дополнительная точка ХВС / ГВС", rateKey: "extraWaterPoint", defaultQuantity: 1 },
    { id: "extra-sewer-point", title: "Дополнительная точка канализации", rateKey: "extraSewerPoint", defaultQuantity: 1 },
    { id: "toilet-fan-outlet", title: "Фановый отвод / манжета для инсталляции", rateKey: "toiletFanOutlet", defaultQuantity: 1 },
  ] satisfies PlumbingScenarioItemRef[],
  warnings: [
    "Возможен насос при недостаточном уклоне — считается отдельно (нет в Сан v1).",
    "Перенос трубы по метражу будет добавлен позже (ожидает ставку ₽/м.п.).",
  ],
} as const;

export const showerAreaScenario = {
  id: "scenario-shower-area" as const,
  publicTitle: "Душевая зона",
  publicDescription:
    "Душевая зона под ключ: трап, перегородка или ограждение, смеситель и подключение. Устанавливается вместо ванны.",
  conflictsWith: "includeBath" as const,
  variants: {
    "tiled-tray": {
      id: "tiled-tray" as const,
      label: "С поддоном из плитки",
      hint: "поддон из плитки, стационарная перегородка, скрытый смеситель",
      items: [
        { id: "shower-tray-tiled", title: "Душевой поддон из плитки с трапом", rateKey: "tiledShowerTray", defaultQuantity: 1 },
        { id: "shower-partition", title: "Душевая перегородка стационарная", rateKey: "showerPartition", defaultQuantity: 1 },
        { id: "shower-mixer-concealed", title: "Душевой смеситель / скрытый монтаж", rateKey: "concealedShowerMixer", defaultQuantity: 1 },
        { id: "shower-drain", title: "Душевой трап", rateKey: "showerDrain", defaultQuantity: 1 },
      ] satisfies PlumbingScenarioItemRef[],
    },
    enclosure: {
      id: "enclosure" as const,
      label: "Душевой уголок",
      hint: "стеклянное ограждение, душевая стойка, трап",
      items: [
        { id: "shower-enclosure", title: "Душевой уголок / стеклянное ограждение", rateKey: "showerEnclosure", defaultQuantity: 1 },
        { id: "shower-mixer-rail", title: "Душевой смеситель / душевая стойка", rateKey: "showerStackMixer", defaultQuantity: 1 },
        { id: "shower-drain", title: "Душевой трап", rateKey: "showerDrain", defaultQuantity: 1 },
      ] satisfies PlumbingScenarioItemRef[],
    },
  },
  warnings: [
    "Душевая зона устанавливается вместо ванны.",
    "Гидроизоляция по площади учтена в работах позиций (отдельной ставки ₽/м² в Сан v1 нет).",
  ],
} as const;

export function getShowerAreaItems(variant: ShowerAreaVariant): readonly PlumbingScenarioItemRef[] {
  return showerAreaScenario.variants[variant].items;
}

/** Итог сценария = Σ(rate позиции × количество). Сценарий собственной цены не хранит. */
export function sumScenarioItems(items: readonly PlumbingScenarioItemRef[]): number {
  return items.reduce(
    (sum, item) => sum + plumbingRateTotal(plumbingRates[item.rateKey]) * item.defaultQuantity,
    0,
  );
}

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
    sectionId: "plumbing",
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

function addRateLines(items: EstimateLineItem[], id: string, title: string, quantity: number, rate: PlumbingRate) {
  addLine(items, `${id}-works`, `${title} - работы`, "works", quantity, rate.unit, rate.works, rate.comment);
  addLine(items, `${id}-materials`, `${title} - материалы`, "materials", quantity, rate.unit, rate.materials, rate.comment);
  addLine(items, `${id}-equipment`, `${title} - оборудование`, "equipment", quantity, rate.unit, rate.equipment, rate.comment);
  addLine(items, `${id}-consumables`, `${title} - расходники`, "consumables", quantity, rate.unit, rate.consumables, rate.comment);
}

function addPlumbingPosition(
  items: EstimateLineItem[],
  points: PlumbingComposition,
  id: string,
  title: string,
  quantity: number,
  rate: PlumbingRate,
) {
  if (quantity <= 0) {
    return;
  }

  points.coldWaterPoints += quantity * rate.coldWaterPoints;
  points.hotWaterPoints += quantity * rate.hotWaterPoints;
  points.sewerPoints += quantity * rate.sewerPoints;
  points.fixtureCount += quantity;
  addRateLines(items, id, title, quantity, rate);
}

/**
 * Собирает строки сметы из атомарных позиций сценария. Сценарий = сумма атомарных
 * позиций × количество; формулы не дублируются — переиспользуется addPlumbingPosition.
 */
function addScenarioPositions(
  items: EstimateLineItem[],
  points: PlumbingComposition,
  scenarioId: PlumbingScenarioId,
  scenarioItems: readonly PlumbingScenarioItemRef[],
) {
  for (const item of scenarioItems) {
    addPlumbingPosition(
      items,
      points,
      `${scenarioId}-${item.id}`,
      item.title,
      item.defaultQuantity,
      plumbingRates[item.rateKey],
    );
  }
}

/**
 * Отдельная секция со строками только одного сценария — для показа состава
 * в окне спецификации (EstimateSpecOverlay). Точки тут не учитываем, нужны только строки.
 */
export function buildScenarioSection(
  scenarioId: PlumbingScenarioId,
  title: string,
  description: string,
  scenarioItems: readonly PlumbingScenarioItemRef[],
): EstimateSection {
  const items: EstimateLineItem[] = [];
  const scratchPoints: PlumbingComposition = {
    bathroomCount: 0,
    hasKitchen: false,
    hasPlumbingRooms: false,
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    fixtureCount: 0,
  };

  addScenarioPositions(items, scratchPoints, scenarioId, scenarioItems);

  return createEstimateSection("plumbing", title, items, description);
}

export function calculatePlumbing(rooms: PlumbingRoomInput[], options: PlumbingOptions): PlumbingCalculationResult {
  const includedRooms = rooms.filter((room) => safeNumber(room.area) > 0);
  const bathroomCount = includedRooms.filter((room) => room.roomType === "bathroom").length;
  const hasKitchen = includedRooms.some((room) => room.roomType === "kitchen");
  const hasPlumbingRooms =
    bathroomCount > 0 || hasKitchen || options.includeWasherOutput || options.includeDishwasherOutput;
  const items: EstimateLineItem[] = [];
  const points: PlumbingComposition = {
    bathroomCount,
    hasKitchen,
    hasPlumbingRooms,
    coldWaterPoints: 0,
    hotWaterPoints: 0,
    sewerPoints: 0,
    fixtureCount: 0,
  };

  if (options.includeBathroomSet) {
    addPlumbingPosition(items, points, "vanity-sink-set", "Тумба / раковина / комплект", bathroomCount, plumbingRates.vanitySinkSet);
    addPlumbingPosition(items, points, "sink-faucet", "Смеситель для раковины", bathroomCount, plumbingRates.sinkFaucet);
    addPlumbingPosition(items, points, "wall-hung-toilet", "Инсталляция / унитаз", bathroomCount, plumbingRates.wallHungToilet);
  }

  if (options.includeBath) {
    addPlumbingPosition(items, points, "acrylic-bath", "Акриловая ванна", bathroomCount, plumbingRates.acrylicBath);
    addPlumbingPosition(items, points, "bath-siphon", "Сифон для ванны", bathroomCount, plumbingRates.bathSiphon);
    addPlumbingPosition(items, points, "bath-mixer", "Смеситель для ванны с лейкой", bathroomCount, plumbingRates.bathMixer);
  }

  if (options.includeHygienicShower) {
    addPlumbingPosition(items, points, "hygienic-shower", "Гигиенический душ", bathroomCount, plumbingRates.hygienicShower);
  }

  if (options.includeElectricTowelRail) {
    addPlumbingPosition(
      items,
      points,
      "electric-towel-rail",
      "Электрический полотенцесушитель",
      bathroomCount,
      plumbingRates.electricTowelRail,
    );
  }

  if (hasKitchen && options.includeKitchenSink) {
    const sinkZone = calculateKitchenSinkZone(options.kitchenSinkPackageLevel);
    items.push(sinkZone.sectionItem);
    points.coldWaterPoints += 1;
    points.hotWaterPoints += 1;
    points.sewerPoints += 1;
    points.fixtureCount += 1;
  }

  if (hasKitchen && options.includeDishwasherOutput) {
    addPlumbingPosition(items, points, "dishwasher-output", "Выводы для ПМ машины", 1, plumbingRates.dishwasherOutput);
  }

  if (options.includeWasherOutput) {
    addPlumbingPosition(
      items,
      points,
      "washer-dryer-output",
      "Выводы стиральная / сушильная машина",
      1,
      plumbingRates.washerDryerOutput,
    );
  }

  if (options.includeWaterNode && hasPlumbingRooms) {
    addPlumbingPosition(items, points, "water-collector", "Коллектор ХВС / ГВС", 1, plumbingRates.waterCollector);
    addPlumbingPosition(items, points, "water-filters", "Фильтры водоснабжения", 1, plumbingRates.waterFilters);
    addPlumbingPosition(
      items,
      points,
      "shutoff-valves",
      "Отсечные краны",
      Math.max(4, points.coldWaterPoints + points.hotWaterPoints),
      plumbingRates.shutoffValves,
    );

    if (options.includeLeakProtection) {
      addPlumbingPosition(items, points, "leak-protection", "Система защиты от протечек", 1, plumbingRates.leakProtection);
    }
  }

  if (options.includeToiletRelocation) {
    addScenarioPositions(items, points, "scenario-toilet-relocation", toiletRelocationScenario.items);
  }

  if (options.includeShowerArea) {
    addScenarioPositions(items, points, "scenario-shower-area", getShowerAreaItems(options.showerAreaVariant));
  }

  const section = createEstimateSection(
    "plumbing",
    "Сантехника",
    items,
    "Предварительный расчёт сантехнических приборов, выводов и базового сантехнического узла.",
  );

  return {
    ...points,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
