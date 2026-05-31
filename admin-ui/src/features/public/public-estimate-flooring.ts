import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";
import { getFlooringSnapshotRates } from "./public-flooring-snapshot";

export type FlooringCoveringType = "porcelain" | "quartz_vinyl" | "laminate" | "carpet" | "engineered_wood";

export type FlooringPreparationType = "none" | "primer" | "self_leveling" | "waterproofing";

export type FlooringLayoutType = "straight" | "large_format_straight" | "glue" | "floating";

export type FlooringPlinthType = "none" | "duropolymer" | "painted_mdf";

export type FlooringRoomInput = {
  roomId: string;
  roomName: string;
  area: number;
  perimeter: number;
  /**
   * Длина плинтуса по геометрии (периметр за вычетом дверных проёмов ~0.9 м).
   * Если не передана, используется как запасной вариант полный периметр помещения.
   */
  plinthLength?: number;
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
  plinthLength: number;
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

/** Публичные тарифы v1 из `generated/flooring.snapshot.json`. */
const flooringSnapshotRates = getFlooringSnapshotRates();

export const flooringCoveringRates = flooringSnapshotRates.flooringCoveringRates;
export const flooringPreparationRates = flooringSnapshotRates.flooringPreparationRates;
export const flooringLayoutRates = flooringSnapshotRates.flooringLayoutRates;
export const flooringPlinthRates = flooringSnapshotRates.flooringPlinthRates;
export const flooringExtraRates = flooringSnapshotRates.flooringExtraRates;

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
  // Длину плинтуса берём из геометрии (периметр минус дверные проёмы); если она
  // не передана — откатываемся на полный периметр, но не превышаем его.
  const plinthLength = room.isIncluded
    ? Math.min(perimeter, safeNumber(room.plinthLength ?? perimeter))
    : 0;
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
    plinthLength,
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
  const plinthLength = includedRooms.reduce((total, room) => total + room.plinthLength, 0);
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
