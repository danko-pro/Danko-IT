import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

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
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

export const warmFloorRates = {
  waterLaborRatePerM2: 1600,
  pipeMetersPerM2: 6,
  maxCircuitAreaM2: 15,
  smallZoneThresholdM2: 5,
  manifoldLabor: 6000,
  manifoldMaterial: 20000,
  pumpLabor: 8000,
  pumpMaterial: 25000,
  pipePricePerMeter: 170,
  pumpRoomThreshold: 3,
  pumpCircuitThreshold: 4,
  electricMatPricePerM2: 3500,
  electricLaborRatePerM2: 1200,
  thermostatMaterial: 4500,
  thermostatSocketMaterials: 350,
  thermostatElectricianLabor: 1500,
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
  const section = createEstimateSection("warm_floor", "Тёплый пол", items, "Водяной или электрический тёплый пол по выбранным помещениям.");

  return {
    mode,
    selectedArea,
    pipeMeters,
    roomCount,
    circuitCount,
    needsManifold,
    needsPump,
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

  if (mode === "water") {
    const pipeMeters = selectedArea * warmFloorRates.pipeMetersPerM2;
    const roomCount = selectedRooms.length;
    const circuitCount = selectedRooms.reduce(
      (total, room) => total + Math.ceil(room.warmFloorArea / warmFloorRates.maxCircuitAreaM2),
      0,
    );
    const needsManifold = circuitCount >= 2 || roomCount > 1;
    const needsPump = roomCount >= warmFloorRates.pumpRoomThreshold || circuitCount >= warmFloorRates.pumpCircuitThreshold;

    items.push(
      createLineItem(
        "warm-floor-water-labor",
        "Устройство водяного тёплого пола",
        "works",
        selectedArea,
        "м²",
        warmFloorRates.waterLaborRatePerM2,
      ),
      createLineItem(
        "warm-floor-water-pipe",
        "Труба для водяного тёплого пола",
        "materials",
        pipeMeters,
        "м",
        warmFloorRates.pipePricePerMeter,
      ),
    );

    if (needsManifold) {
      items.push(
        createLineItem("warm-floor-manifold-labor", "Монтаж распределительной гребенки", "works", 1, "компл.", warmFloorRates.manifoldLabor),
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
        createLineItem("warm-floor-pump-labor", "Монтаж насосно-смесительного узла", "works", 1, "компл.", warmFloorRates.pumpLabor),
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

  const thermostatCount = selectedArea > 0 ? 1 : 0;

  items.push(
    createLineItem(
      "warm-floor-electric-labor",
      "Монтаж электрического тёплого пола",
      "works",
      selectedArea,
      "м²",
      warmFloorRates.electricLaborRatePerM2,
    ),
    createLineItem(
      "warm-floor-electric-mat",
      "Электрический нагревательный мат",
      "materials",
      selectedArea,
      "м²",
      warmFloorRates.electricMatPricePerM2,
    ),
    createLineItem(
      "warm-floor-thermostat-labor",
      "Электромонтаж точки терморегулятора",
      "works",
      thermostatCount,
      "шт.",
      warmFloorRates.thermostatElectricianLabor,
    ),
    createLineItem(
      "warm-floor-thermostat-material",
      "Терморегулятор",
      "materials",
      thermostatCount,
      "шт.",
      warmFloorRates.thermostatMaterial,
    ),
    createLineItem(
      "warm-floor-thermostat-socket",
      "Подрозетник и материалы подключения",
      "materials",
      thermostatCount,
      "компл.",
      warmFloorRates.thermostatSocketMaterials,
    ),
  );

  return createResult(mode, rooms, items);
}
