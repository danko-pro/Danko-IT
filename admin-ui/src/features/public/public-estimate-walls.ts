import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type WallsCoveringType = "wallpaper" | "tile" | "paint" | "paintable_wallpaper";

export type WallsPreparationType = "none" | "primer" | "putty_wallpaper" | "putty_paint" | "waterproofing";

export type WallsRoomInput = {
  roomId: string;
  roomName: string;
  finishWallArea: number;
  coveringType: WallsCoveringType;
  preparationType: WallsPreparationType;
  isIncluded: boolean;
};

export type WallsRoomResult = WallsRoomInput & {
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

export type WallsCalculationResult = {
  roomResults: WallsRoomResult[];
  wallFinishArea: number;
  purchaseArea: number;
  worksTotal: number;
  materialsTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

type WallsCoveringRates = {
  materialPricePerM2: number;
  laborPricePerM2: number;
  baseWastePercent: number;
  adhesivePricePerM2: number;
  primerPricePerM2: number;
  svpPricePerM2: number;
  groutPricePerM2: number;
  toolConsumablesPerM2: number;
  laborFactor: number;
  additionalWastePercent: number;
};

type WallsPreparationRates = {
  laborPricePerM2: number;
  materialPricePerM2: number;
};

export const wallsCoveringRates: Record<WallsCoveringType, WallsCoveringRates> = {
  wallpaper: {
    materialPricePerM2: 600,
    laborPricePerM2: 300,
    baseWastePercent: 10,
    adhesivePricePerM2: 55,
    primerPricePerM2: 25,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 20,
    laborFactor: 1.15,
    additionalWastePercent: 5,
  },
  tile: {
    materialPricePerM2: 1990,
    laborPricePerM2: 2000,
    baseWastePercent: 10,
    adhesivePricePerM2: 450,
    primerPricePerM2: 25,
    svpPricePerM2: 120,
    groutPricePerM2: 90,
    toolConsumablesPerM2: 40,
    laborFactor: 1.35,
    additionalWastePercent: 10,
  },
  paint: {
    materialPricePerM2: 500,
    laborPricePerM2: 300,
    baseWastePercent: 10,
    adhesivePricePerM2: 0,
    primerPricePerM2: 30,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 30,
    laborFactor: 1,
    additionalWastePercent: 0,
  },
  paintable_wallpaper: {
    materialPricePerM2: 810,
    laborPricePerM2: 600,
    baseWastePercent: 5,
    adhesivePricePerM2: 70,
    primerPricePerM2: 30,
    svpPricePerM2: 0,
    groutPricePerM2: 0,
    toolConsumablesPerM2: 55,
    laborFactor: 1,
    additionalWastePercent: 0,
  },
};

export const wallsPreparationRates: Record<WallsPreparationType, WallsPreparationRates> = {
  none: {
    laborPricePerM2: 0,
    materialPricePerM2: 0,
  },
  primer: {
    laborPricePerM2: 100,
    materialPricePerM2: 120,
  },
  putty_wallpaper: {
    laborPricePerM2: 500,
    materialPricePerM2: 200,
  },
  putty_paint: {
    laborPricePerM2: 1300,
    materialPricePerM2: 350,
  },
  waterproofing: {
    laborPricePerM2: 300,
    materialPricePerM2: 80,
  },
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
): EstimateLineItem {
  const safeQuantity = safeNumber(quantity);
  const safeUnitPrice = safeNumber(unitPrice);

  return {
    id,
    sectionId: "walls",
    title,
    category,
    quantity: safeQuantity,
    unit,
    unitPrice: safeUnitPrice,
    total: safeQuantity * safeUnitPrice,
    isIncluded: true,
  };
}

function createRoomResult(room: WallsRoomInput): WallsRoomResult {
  const finishWallArea = room.isIncluded ? safeNumber(room.finishWallArea) : 0;
  const covering = wallsCoveringRates[room.coveringType];
  const preparation = wallsPreparationRates[room.preparationType];
  const totalWastePercent = covering.baseWastePercent + covering.additionalWastePercent;
  const purchaseArea = finishWallArea * (1 + totalWastePercent / 100);
  const laborWithFactor = covering.laborPricePerM2 * covering.laborFactor;
  const materialCost = purchaseArea * covering.materialPricePerM2;
  const installationCost = finishWallArea * laborWithFactor;
  const preparationLaborCost = finishWallArea * preparation.laborPricePerM2;
  const preparationMaterialCost = finishWallArea * preparation.materialPricePerM2;
  const consumablesTotal =
    purchaseArea * covering.adhesivePricePerM2 +
    finishWallArea * covering.primerPricePerM2 +
    purchaseArea * covering.svpPricePerM2 +
    purchaseArea * covering.groutPricePerM2 +
    finishWallArea * covering.toolConsumablesPerM2;

  return {
    ...room,
    finishWallArea,
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
  room: WallsRoomResult,
  quantity: number,
  unitPrice: number,
) {
  if (quantity <= 0 || unitPrice <= 0) {
    return;
  }

  items.push(createLineItem(`${id}-${room.roomId}`, `${title} - ${room.roomName}`, "consumables", quantity, "м²", unitPrice));
}

export function calculateWalls(rooms: WallsRoomInput[]): WallsCalculationResult {
  const roomResults = rooms.map(createRoomResult);
  const includedRooms = roomResults.filter((room) => room.isIncluded && room.finishWallArea > 0);
  const wallFinishArea = includedRooms.reduce((total, room) => total + room.finishWallArea, 0);
  const purchaseArea = includedRooms.reduce((total, room) => total + room.purchaseArea, 0);
  const items: EstimateLineItem[] = [];

  includedRooms.forEach((room) => {
    const covering = wallsCoveringRates[room.coveringType];
    const preparation = wallsPreparationRates[room.preparationType];

    items.push(
      createLineItem(
        `walls-installation-${room.roomId}`,
        `Отделка стен - ${room.roomName}`,
        "works",
        room.finishWallArea,
        "м²",
        room.laborWithFactor,
      ),
      createLineItem(
        `walls-preparation-labor-${room.roomId}`,
        `Подготовка стен - ${room.roomName}`,
        "works",
        room.finishWallArea,
        "м²",
        preparation.laborPricePerM2,
      ),
      createLineItem(
        `walls-material-${room.roomId}`,
        `Настенное покрытие - ${room.roomName}`,
        "materials",
        room.purchaseArea,
        "м²",
        covering.materialPricePerM2,
      ),
      createLineItem(
        `walls-preparation-material-${room.roomId}`,
        `Материалы подготовки стен - ${room.roomName}`,
        "materials",
        room.finishWallArea,
        "м²",
        preparation.materialPricePerM2,
      ),
    );

    addConsumable(items, "walls-adhesive", "Клей", room, room.purchaseArea, covering.adhesivePricePerM2);
    addConsumable(items, "walls-primer", "Грунт", room, room.finishWallArea, covering.primerPricePerM2);
    addConsumable(items, "walls-svp", "СВП", room, room.purchaseArea, covering.svpPricePerM2);
    addConsumable(items, "walls-grout", "Затирка", room, room.purchaseArea, covering.groutPricePerM2);
    addConsumable(
      items,
      "walls-tools",
      "Инструмент / расходные материалы",
      room,
      room.finishWallArea,
      covering.toolConsumablesPerM2,
    );
  });

  const visibleItems = items.filter((item) => item.total > 0);
  const section = createEstimateSection("walls", "Стены", visibleItems, "Настенные покрытия, подготовка стен и расходники.");

  return {
    roomResults,
    wallFinishArea,
    purchaseArea,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
