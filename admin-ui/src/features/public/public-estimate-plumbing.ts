import type { EstimateRoomType } from "./public-estimate-geometry";
import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";
import {
  calculateDishwasherZone,
  calculateInstallRelocationZone,
  calculateKitchenSinkZone,
  calculateShowerZone,
  PLUMBING_ZONE_IDS,
  type PlumbingPackageLevel,
} from "./public-estimate-plumbing-zones";

export type { PlumbingPackageLevel } from "./public-estimate-plumbing-zones";
export {
  BATHROOM_INSTALL_RELOCATION_ZONE_DISCLAIMER,
  BATHROOM_SHOWER_ZONE_DISCLAIMER,
  calculateDishwasherZone,
  calculateInstallRelocationZone,
  calculateKitchenSinkZone,
  calculateKitchenSinkZoneTotal,
  calculateShowerZone,
  calculateZone,
  calculateZoneTotal,
  dishwasherPackageLabels,
  expandPlumbingSectionForSpec,
  getDishwasherZonePackageTotal,
  getDishwasherZoneSpecItems,
  getInstallRelocationZoneTotal,
  getKitchenSinkZonePackageTotal,
  getKitchenSinkZoneSpecItems,
  getShowerZonePackageTotal,
  getShowerZoneSpecItems,
  getZonePackageLabels,
  getZoneSpecItems,
  isKitchenSinkZoneSpecLine,
  isPlumbingZoneSpecLine,
  isSinkZoneContaminantLine,
  kitchenSinkPackageLabels,
  KITCHEN_SINK_ZONE_DISCLAIMER,
  PLUMBING_ZONE_IDS,
  showerPackageLabels,
} from "./public-estimate-plumbing-zones";

export type PlumbingRoomInput = {
  roomId: string;
  roomName: string;
  roomType: EstimateRoomType;
  area: number;
};

export type PlumbingOptions = {
  includeBathroomSet: boolean;
  includeBath: boolean;
  includeHygienicShower: boolean;
  includeElectricTowelRail: boolean;
  includeKitchenSink: boolean;
  kitchenSinkPackageLevel: PlumbingPackageLevel;
  includeDishwasherOutput: boolean;
  dishwasherPackageLevel: PlumbingPackageLevel;
  includeShowerZone: boolean;
  showerPackageLevel: PlumbingPackageLevel;
  includeInstallRelocation: boolean;
  includeWasherOutput: boolean;
  includeWaterNode: boolean;
  includeLeakProtection: boolean;
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

  if (options.includeBath && !options.includeShowerZone) {
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
    const dishwasherZone = calculateDishwasherZone(options.dishwasherPackageLevel);
    items.push(dishwasherZone.sectionItem);
    points.coldWaterPoints += 1;
    points.sewerPoints += 1;
    points.fixtureCount += 1;
  }

  if (bathroomCount > 0 && options.includeShowerZone) {
    const showerZone = calculateShowerZone(options.showerPackageLevel);
    items.push(showerZone.sectionItem);
    points.coldWaterPoints += 2;
    points.hotWaterPoints += 2;
    points.sewerPoints += 1;
    points.fixtureCount += 1;
  }

  if (bathroomCount > 0 && options.includeInstallRelocation) {
    const installZone = calculateInstallRelocationZone();
    items.push(installZone.sectionItem);
    points.coldWaterPoints += 1;
    points.sewerPoints += 1;
    points.fixtureCount += 1;
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
