import type { EstimateRoomType } from "./public-estimate-geometry";
import {
  createEstimateSection,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";
import {
  calculateDishwasherZone,
  calculateInstallRelocationZone,
  calculateKitchenSinkZone,
  calculateShowerZone,
  calculateZone,
  PLUMBING_ZONE_IDS,
  type PlumbingPackageLevel,
  type PlumbingZoneId,
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

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

type ZonePointContribution = Pick<
  PlumbingComposition,
  "coldWaterPoints" | "hotWaterPoints" | "sewerPoints" | "fixtureCount"
>;

/**
 * A8.2/A8.3: добавляет зону снапшота в раздел одной строкой (запечённый итог зоны).
 * Сантехника полностью считается из зон build-time снапшота — старая таблица
 * `plumbingRates` удалена (A8.3). Водяные точки/приборы учитываются вручную,
 * т.к. их метаданные не публикуются в whitelist-снапшоте.
 */
function addZonePosition(
  items: EstimateLineItem[],
  points: PlumbingComposition,
  zoneId: PlumbingZoneId,
  contribution: ZonePointContribution,
) {
  const zone = calculateZone(zoneId, "b");
  items.push(zone.sectionItem);
  points.coldWaterPoints += contribution.coldWaterPoints;
  points.hotWaterPoints += contribution.hotWaterPoints;
  points.sewerPoints += contribution.sewerPoints;
  points.fixtureCount += contribution.fixtureCount;
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

  // A8.2: legacy-опции санузла теперь зоны снапшота (единый запечённый итог, без разбивки по категориям).
  // Зона добавляется один раз при наличии санузла (прежний множитель × bathroomCount не переносится).
  if (bathroomCount > 0 && options.includeBathroomSet) {
    addZonePosition(items, points, PLUMBING_ZONE_IDS.BATHROOM_SET, {
      coldWaterPoints: 3,
      hotWaterPoints: 2,
      sewerPoints: 2,
      fixtureCount: 3,
    });
  }

  if (bathroomCount > 0 && options.includeBath && !options.includeShowerZone) {
    addZonePosition(items, points, PLUMBING_ZONE_IDS.BATHROOM_BATH, {
      coldWaterPoints: 2,
      hotWaterPoints: 2,
      sewerPoints: 2,
      fixtureCount: 3,
    });
  }

  if (bathroomCount > 0 && options.includeHygienicShower) {
    addZonePosition(items, points, PLUMBING_ZONE_IDS.BATHROOM_HYGIENIC_SHOWER, {
      coldWaterPoints: 1,
      hotWaterPoints: 1,
      sewerPoints: 0,
      fixtureCount: 1,
    });
  }

  if (bathroomCount > 0 && options.includeElectricTowelRail) {
    addZonePosition(items, points, PLUMBING_ZONE_IDS.BATHROOM_TOWEL_RAIL, {
      coldWaterPoints: 0,
      hotWaterPoints: 0,
      sewerPoints: 0,
      fixtureCount: 1,
    });
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
    addZonePosition(items, points, PLUMBING_ZONE_IDS.TECH_WASHER_OUTPUT, {
      coldWaterPoints: 1,
      hotWaterPoints: 0,
      sewerPoints: 1,
      fixtureCount: 1,
    });
  }

  if (options.includeWaterNode && hasPlumbingRooms) {
    // FLAG (A8.2): отсечные краны зафиксированы на 4 шт. в составе зоны (раньше max(4, ХВС+ГВС точек)).
    addZonePosition(items, points, PLUMBING_ZONE_IDS.WATER_NODE, {
      coldWaterPoints: 0,
      hotWaterPoints: 0,
      sewerPoints: 0,
      fixtureCount: 2,
    });

    if (options.includeLeakProtection) {
      addZonePosition(items, points, PLUMBING_ZONE_IDS.WATER_LEAK_PROTECTION, {
        coldWaterPoints: 0,
        hotWaterPoints: 0,
        sewerPoints: 0,
        fixtureCount: 1,
      });
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
