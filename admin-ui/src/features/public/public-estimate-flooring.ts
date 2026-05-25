import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type FlooringCoveringType = "porcelain" | "quartz_vinyl" | "laminate" | "carpet" | "engineered_wood";

export type FlooringPreparationType = "none" | "primer" | "self_leveling" | "waterproofing";

export type FlooringLayoutType = "straight" | "large_format_straight" | "glue" | "floating";

export type FlooringPlinthType = "none" | "duropolymer" | "painted_mdf";

export type FlooringRoomInput = {
  roomId: string;
  roomName: string;
  area: number;
  perimeter: number;
  coveringType: FlooringCoveringType;
  preparationType: FlooringPreparationType;
  layoutType: FlooringLayoutType;
  isIncluded: boolean;
};

export type FlooringOptions = {
  includePlinth: boolean;
  plinthType: FlooringPlinthType;
  includeThresholds: boolean;
  thresholdCount: number;
  includeDemolition: boolean;
};

export type FlooringRoomResult = FlooringRoomInput & {
  totalWastePercent: number;
  purchaseArea: number;
  laborWithFactor: number;
  materialCost: number;
  installationCost: number;
  preparationLaborCost: number;
  preparationMaterialCost: number;
  consumablesTotal: number;
  roomTotal: number;
};

export type FlooringCalculationResult = {
  roomResults: FlooringRoomResult[];
  purchaseArea: number;
  flooringArea: number;
  plinthLength: number;
  worksTotal: number;
  materialsTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

type CoveringRates = {
  materialPricePerM2: number;
  laborPricePerM2: number;
  baseWastePercent: number;
  underlayPricePerM2: number;
  adhesivePricePerM2: number;
  primerPricePerM2: number;
  svpPricePerM2: number;
  groutPricePerM2: number;
  toolConsumablesPerM2: number;
};

type PreparationRates = {
  laborPricePerM2: number;
  materialPricePerM2: number;
};

type LayoutRates = {
  laborFactor: number;
  additionalWastePercent: number;
};

type PlinthRates = {
  materialPricePerMeter: number;
  laborPricePerMeter: number;
  factor: number;
};

export const flooringCoveringRates: Record<FlooringCoveringType, CoveringRates> = {
  porcelain: {
    materialPricePerM2: 2900,
    laborPricePerM2: 2000,
    baseWastePercent: 10,
    underlayPricePerM2: 0,
    adhesivePricePerM2: 450,
    primerPricePerM2: 25,
    svpPricePerM2: 120,
    groutPricePerM2: 90,
    toolConsumablesPerM2: 40,
  },
  quartz_vinyl: {
    materialPricePerM2: 1700,
    laborPricePerM2: 800,
    baseWastePercent: 5,
    underlayPricePerM2: 220,
    adhesivePricePerM2: 0,
    primerPricePerM2: 25,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 80,
  },
  laminate: {
    materialPricePerM2: 930,
    laborPricePerM2: 1000,
    baseWastePercent: 10,
    underlayPricePerM2: 220,
    adhesivePricePerM2: 0,
    primerPricePerM2: 25,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 40,
  },
  carpet: {
    materialPricePerM2: 1500,
    laborPricePerM2: 900,
    baseWastePercent: 7,
    underlayPricePerM2: 0,
    adhesivePricePerM2: 250,
    primerPricePerM2: 25,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 40,
  },
  engineered_wood: {
    materialPricePerM2: 6000,
    laborPricePerM2: 2500,
    baseWastePercent: 10,
    underlayPricePerM2: 0,
    adhesivePricePerM2: 900,
    primerPricePerM2: 120,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 120,
  },
};

export const flooringPreparationRates: Record<FlooringPreparationType, PreparationRates> = {
  none: {
    laborPricePerM2: 300,
    materialPricePerM2: 100,
  },
  primer: {
    laborPricePerM2: 250,
    materialPricePerM2: 120,
  },
  self_leveling: {
    laborPricePerM2: 650,
    materialPricePerM2: 120,
  },
  waterproofing: {
    laborPricePerM2: 300,
    materialPricePerM2: 80,
  },
};

export const flooringLayoutRates: Record<FlooringLayoutType, LayoutRates> = {
  straight: {
    laborFactor: 1.1,
    additionalWastePercent: 5,
  },
  large_format_straight: {
    laborFactor: 1.2,
    additionalWastePercent: 10,
  },
  glue: {
    laborFactor: 1.25,
    additionalWastePercent: 5,
  },
  floating: {
    laborFactor: 1,
    additionalWastePercent: 3,
  },
};

export const flooringPlinthRates: Record<FlooringPlinthType, PlinthRates> = {
  none: {
    materialPricePerMeter: 0,
    laborPricePerMeter: 0,
    factor: 1,
  },
  duropolymer: {
    materialPricePerMeter: 450,
    laborPricePerMeter: 450,
    factor: 1,
  },
  painted_mdf: {
    materialPricePerMeter: 650,
    laborPricePerMeter: 500,
    factor: 1,
  },
};

export const flooringExtraRates = {
  thresholdPrice: 900,
  demolitionPricePerM2: 150,
} as const;

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
): EstimateLineItem {
  const safeQuantity = safeNumber(quantity);
  const safeUnitPrice = safeNumber(unitPrice);

  return {
    id,
    sectionId: "flooring",
    title,
    category,
    quantity: safeQuantity,
    unit,
    unitPrice: safeUnitPrice,
    total: safeQuantity * safeUnitPrice,
    isIncluded: true,
  };
}

function createRoomResult(room: FlooringRoomInput): FlooringRoomResult {
  const area = room.isIncluded ? safeNumber(room.area) : 0;
  const perimeter = room.isIncluded ? safeNumber(room.perimeter) : 0;
  const covering = flooringCoveringRates[room.coveringType];
  const preparation = flooringPreparationRates[room.preparationType];
  const layout = flooringLayoutRates[room.layoutType];
  const totalWastePercent = covering.baseWastePercent + layout.additionalWastePercent;
  const purchaseArea = area * (1 + totalWastePercent / 100);
  const laborWithFactor = covering.laborPricePerM2 * layout.laborFactor;
  const materialCost = purchaseArea * covering.materialPricePerM2;
  const installationCost = area * laborWithFactor;
  const preparationLaborCost = area * preparation.laborPricePerM2;
  const preparationMaterialCost = area * preparation.materialPricePerM2;
  const consumablesTotal =
    purchaseArea * covering.underlayPricePerM2 +
    purchaseArea * covering.adhesivePricePerM2 +
    area * covering.primerPricePerM2 +
    purchaseArea * covering.svpPricePerM2 +
    purchaseArea * covering.groutPricePerM2 +
    area * covering.toolConsumablesPerM2;

  return {
    ...room,
    area,
    perimeter,
    totalWastePercent,
    purchaseArea,
    laborWithFactor,
    materialCost,
    installationCost,
    preparationLaborCost,
    preparationMaterialCost,
    consumablesTotal,
    roomTotal:
      materialCost + installationCost + preparationLaborCost + preparationMaterialCost + consumablesTotal,
  };
}

function addConsumable(
  items: EstimateLineItem[],
  id: string,
  title: string,
  room: FlooringRoomResult,
  quantity: number,
  unitPrice: number,
) {
  if (quantity <= 0 || unitPrice <= 0) {
    return;
  }

  items.push(createLineItem(`${id}-${room.roomId}`, `${title} - ${room.roomName}`, "consumables", quantity, "м²", unitPrice));
}

export function calculateFlooring(rooms: FlooringRoomInput[], options: FlooringOptions): FlooringCalculationResult {
  const roomResults = rooms.map(createRoomResult);
  const includedRooms = roomResults.filter((room) => room.isIncluded && room.area > 0);
  const flooringArea = includedRooms.reduce((total, room) => total + room.area, 0);
  const purchaseArea = includedRooms.reduce((total, room) => total + room.purchaseArea, 0);
  const plinthLength = includedRooms.reduce((total, room) => total + room.perimeter, 0);
  const items: EstimateLineItem[] = [];

  includedRooms.forEach((room) => {
    const covering = flooringCoveringRates[room.coveringType];
    const preparation = flooringPreparationRates[room.preparationType];

    items.push(
      createLineItem(
        `flooring-installation-${room.roomId}`,
        `Укладка напольного покрытия - ${room.roomName}`,
        "works",
        room.area,
        "м²",
        room.laborWithFactor,
      ),
      createLineItem(
        `flooring-preparation-labor-${room.roomId}`,
        `Подготовка основания пола - ${room.roomName}`,
        "works",
        room.area,
        "м²",
        preparation.laborPricePerM2,
      ),
      createLineItem(
        `flooring-material-${room.roomId}`,
        `Напольное покрытие - ${room.roomName}`,
        "materials",
        room.purchaseArea,
        "м²",
        covering.materialPricePerM2,
      ),
      createLineItem(
        `flooring-preparation-material-${room.roomId}`,
        `Материалы подготовки основания - ${room.roomName}`,
        "materials",
        room.area,
        "м²",
        preparation.materialPricePerM2,
      ),
    );

    addConsumable(items, "flooring-underlay", "Подложка", room, room.purchaseArea, covering.underlayPricePerM2);
    addConsumable(items, "flooring-adhesive", "Клей", room, room.purchaseArea, covering.adhesivePricePerM2);
    addConsumable(items, "flooring-primer", "Грунт", room, room.area, covering.primerPricePerM2);
    addConsumable(items, "flooring-svp", "СВП", room, room.purchaseArea, covering.svpPricePerM2);
    addConsumable(items, "flooring-grout", "Затирка", room, room.purchaseArea, covering.groutPricePerM2);
    addConsumable(
      items,
      "flooring-tools",
      "Инструмент и расходные материалы",
      room,
      room.area,
      covering.toolConsumablesPerM2,
    );
  });

  const plinth = flooringPlinthRates[options.plinthType];

  if (options.includePlinth && options.plinthType !== "none" && plinthLength > 0) {
    items.push(
      createLineItem(
        "flooring-plinth-material",
        "Плинтус напольный",
        "materials",
        plinthLength,
        "м",
        plinth.materialPricePerMeter * plinth.factor,
      ),
      createLineItem(
        "flooring-plinth-labor",
        "Монтаж плинтуса",
        "works",
        plinthLength,
        "м",
        plinth.laborPricePerMeter * plinth.factor,
      ),
    );
  }

  const thresholdCount = Math.round(safeNumber(options.thresholdCount));

  if (options.includeThresholds && thresholdCount > 0) {
    items.push(
      createLineItem(
        "flooring-thresholds",
        "Порожек / стыковочный профиль",
        "materials",
        thresholdCount,
        "шт",
        flooringExtraRates.thresholdPrice,
      ),
    );
  }

  if (options.includeDemolition && flooringArea > 0) {
    items.push(
      createLineItem(
        "flooring-demolition",
        "Демонтаж напольного покрытия",
        "works",
        flooringArea,
        "м²",
        flooringExtraRates.demolitionPricePerM2,
      ),
    );
  }

  const section = createEstimateSection("flooring", "Полы", items, "Напольные покрытия, подготовка основания, плинтус и расходники.");

  return {
    roomResults,
    purchaseArea,
    flooringArea,
    plinthLength: options.includePlinth && options.plinthType !== "none" ? plinthLength : 0,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
