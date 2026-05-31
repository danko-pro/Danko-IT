import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";
import { getWarmFloorRates } from "./public-warm-floor-snapshot";

export type WarmFloorMode = "water" | "electric";

export type WarmFloorRoomInput = {
  roomId: string;
  roomName: string;
  area: number;
  isSelected: boolean;
  warmFloorArea: number;
};

export type WarmFloorCalculationResult = {
  mode: WarmFloorMode;
  selectedArea: number;
  pipeMeters: number;
  roomCount: number;
  circuitCount: number;
  needsManifold: boolean;
  needsPump: boolean;
  usesTowelRailConnection: boolean;
  chaseLengthMeters: number;
  thermostatCount: number;
  electricBreakerCount: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

/** Публичные тарифы v1 из `generated/warm-floor.snapshot.json`. */
export const warmFloorRates = getWarmFloorRates();

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
    sectionId: "warm_floor",
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

function getSelectedRooms(rooms: WarmFloorRoomInput[]) {
  return rooms
    .filter((room) => room.isSelected)
    .map((room) => ({
      ...room,
      area: safeNumber(room.area),
      warmFloorArea: safeNumber(room.warmFloorArea),
    }))
    .filter((room) => room.warmFloorArea > 0);
}

function createResult(mode: WarmFloorMode, rooms: WarmFloorRoomInput[], items: EstimateLineItem[]): WarmFloorCalculationResult {
  const selectedRooms = getSelectedRooms(rooms);
  const selectedArea = selectedRooms.reduce((total, room) => total + room.warmFloorArea, 0);
  const pipeMeters = mode === "water" ? selectedArea * warmFloorRates.pipeMetersPerM2 : 0;
  const roomCount = selectedRooms.length;
  const circuitCount =
    mode === "water"
      ? selectedRooms.reduce((total, room) => total + Math.ceil(room.warmFloorArea / warmFloorRates.maxCircuitAreaM2), 0)
      : 0;
  const needsManifold = mode === "water" && (circuitCount >= 2 || roomCount > 1);
  const needsPump =
    mode === "water" && (roomCount >= warmFloorRates.pumpRoomThreshold || circuitCount >= warmFloorRates.pumpCircuitThreshold);
  const isSmallLoop =
    mode === "water" && selectedArea > 0 && roomCount === 1 && circuitCount === 1 && !needsManifold && !needsPump;
  const usesTowelRailConnection = isSmallLoop;
  const chaseLengthMeters = mode === "water" && selectedArea > 0 ? Math.max(3, roomCount * 3) : 0;
  const thermostatCount = mode === "electric" && selectedArea > 0 ? 1 : 0;
  const electricBreakerCount = mode === "electric" && selectedArea > 0 ? 1 : 0;
  const section = createEstimateSection(
    "warm_floor",
    "Тёплый пол",
    items,
    "Водяной или электрический тёплый пол по выбранным помещениям.",
  );

  return {
    mode,
    selectedArea,
    pipeMeters,
    roomCount,
    circuitCount,
    needsManifold,
    needsPump,
    usesTowelRailConnection,
    chaseLengthMeters,
    thermostatCount,
    electricBreakerCount,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}

export function calculateWarmFloor(mode: WarmFloorMode, rooms: WarmFloorRoomInput[]): WarmFloorCalculationResult {
  const selectedRooms = getSelectedRooms(rooms);
  const selectedArea = selectedRooms.reduce((total, room) => total + room.warmFloorArea, 0);

  if (selectedArea <= 0) {
    return createResult(mode, rooms, []);
  }

  const items: EstimateLineItem[] = [];
  const roomCount = selectedRooms.length;
  const chaseLengthMeters = Math.max(3, roomCount * 3);

  if (mode === "water") {
    const pipeMeters = selectedArea * warmFloorRates.pipeMetersPerM2;
    const circuitCount = selectedRooms.reduce(
      (total, room) => total + Math.ceil(room.warmFloorArea / warmFloorRates.maxCircuitAreaM2),
      0,
    );
    const needsManifold = circuitCount >= 2 || roomCount > 1;
    const needsPump = roomCount >= warmFloorRates.pumpRoomThreshold || circuitCount >= warmFloorRates.pumpCircuitThreshold;
    const isSmallLoop = roomCount === 1 && circuitCount === 1 && !needsManifold && !needsPump;

    items.push(
      createLineItem(
        "warm-floor-water-labor",
        "Укладка трубного контура тёплого пола",
        "works",
        selectedArea,
        "м²",
        warmFloorRates.waterLaborRatePerM2,
      ),
      createLineItem(
        "warm-floor-water-pipe",
        "Труба тёплого пола PE-Xa / PE-RT",
        "materials",
        pipeMeters,
        "м",
        warmFloorRates.pipePricePerMeter,
      ),
      createLineItem(
        "warm-floor-chase-labor",
        "Штробление трассы до точки подключения",
        "works",
        chaseLengthMeters,
        "м.п.",
        warmFloorRates.chaseLaborPerMeter,
      ),
    );

    if (isSmallLoop) {
      items.push(
        createLineItem(
          "warm-floor-small-loop-connection-labor",
          "Подключение малого контура от существующего полотенцесушителя",
          "works",
          1,
          "компл.",
          warmFloorRates.smallLoopConnectionLabor,
        ),
        createLineItem(
          "warm-floor-small-loop-fittings-material",
          "Комплект фитингов для малого контура",
          "materials",
          1,
          "компл.",
          warmFloorRates.smallLoopFittingsMaterial,
        ),
        createLineItem(
          "warm-floor-small-loop-control-head-material",
          "Термоголовка для регулировки малого контура",
          "materials",
          1,
          "компл.",
          warmFloorRates.smallLoopControlHeadMaterial,
        ),
      );
    }

    if (needsManifold) {
      items.push(
        createLineItem(
          "warm-floor-manifold-labor",
          "Монтаж распределительной гребенки",
          "works",
          1,
          "компл.",
          warmFloorRates.manifoldLabor,
        ),
        createLineItem(
          "warm-floor-manifold-material",
          "Комплект распределительной гребенки",
          "materials",
          1,
          "компл.",
          warmFloorRates.manifoldMaterial,
        ),
      );
    }

    if (needsPump) {
      items.push(
        createLineItem(
          "warm-floor-pump-labor",
          "Монтаж насосно-смесительного узла",
          "works",
          1,
          "компл.",
          warmFloorRates.pumpLabor,
        ),
        createLineItem(
          "warm-floor-pump-material",
          "Комплект насосно-смесительного узла",
          "materials",
          1,
          "компл.",
          warmFloorRates.pumpMaterial,
        ),
      );
    }

    return createResult(mode, rooms, items);
  }

  items.push(
    createLineItem(
      "warm-floor-electric-mat",
      "Нагревательный мат электрического тёплого пола",
      "materials",
      selectedArea,
      "м²",
      warmFloorRates.electricMatPricePerM2,
    ),
    createLineItem(
      "warm-floor-thermostat-material",
      "Терморегулятор",
      "materials",
      1,
      "шт.",
      warmFloorRates.thermostatMaterial,
    ),
    createLineItem(
      "warm-floor-electric-breaker-material",
      "Автоматический выключатель для тёплого пола",
      "materials",
      1,
      "шт",
      warmFloorRates.electricBreakerMaterial,
    ),
    createLineItem(
      "warm-floor-electric-wire-material",
      "Кабельный комплект 5 м",
      "materials",
      1,
      "компл.",
      warmFloorRates.electricWireMaterial,
    ),
    createLineItem(
      "warm-floor-electric-installation-labor",
      "Монтаж электрического тёплого пола",
      "works",
      1,
      "компл.",
      warmFloorRates.electricInstallationLabor,
    ),
  );

  return createResult(mode, rooms, items);
}
