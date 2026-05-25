import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type CeilingRoomInput = {
  roomId: string;
  roomName: string;
  ceilingArea: number;
  isIncluded: boolean;
  hasPointLights: boolean;
  squareMetersPerPoint: number;
  minPoints: number;
};

export type CeilingRoomResult = CeilingRoomInput & {
  pointCount: number;
  ceilingWorks: number;
  ceilingMaterials: number;
  ceilingConsumables: number;
  pointWorks: number;
  pointMaterials: number;
  pointEquipment: number;
  pointConsumables: number;
  roomTotal: number;
};

export type CeilingCalculationResult = {
  roomResults: CeilingRoomResult[];
  ceilingArea: number;
  pointCount: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

type CeilingRate = {
  unit: "м²" | "шт";
  works: number;
  materials: number;
  equipment: number;
  consumables: number;
  coefficient: number;
  comment: string;
};

export const ceilingRates = {
  pvcMatteSatin: {
    unit: "м²",
    works: 1700,
    materials: 1000,
    equipment: 0,
    consumables: 150,
    coefficient: 1,
    comment: "полотно ПВХ, профиль, крепеж, монтаж",
  },
  pointLightBase: {
    unit: "шт",
    works: 400,
    materials: 300,
    equipment: 0,
    consumables: 50,
    coefficient: 1,
    comment: "платформа / кольцо / подготовка под светильник",
  },
  pointLightCut: {
    unit: "шт",
    works: 450,
    materials: 150,
    equipment: 0,
    consumables: 50,
    coefficient: 1,
    comment: "врезка и подготовка отверстия под светильник",
  },
  gx53Fixture: {
    unit: "шт",
    works: 0,
    materials: 0,
    equipment: 1095,
    consumables: 0,
    coefficient: 1,
    comment: "Светильник 920 + лампа Voltega 9 Вт 175; черный GX53",
  },
} satisfies Record<string, CeilingRate>;

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
    sectionId: "ceiling",
    title,
    category,
    quantity: safeQuantity,
    unit,
    unitPrice: safeUnitPrice,
    total: safeQuantity * safeUnitPrice,
    isIncluded: true,
  };
}

function calculatePointCount(room: CeilingRoomInput, ceilingArea: number) {
  if (!room.hasPointLights || ceilingArea <= 0) {
    return 0;
  }

  const squareMetersPerPoint = safeNumber(room.squareMetersPerPoint);
  const minPoints = Math.round(safeNumber(room.minPoints));

  if (squareMetersPerPoint <= 0) {
    return minPoints;
  }

  return Math.max(minPoints, Math.ceil(ceilingArea / squareMetersPerPoint));
}

function createRoomResult(room: CeilingRoomInput): CeilingRoomResult {
  const ceilingArea = room.isIncluded ? safeNumber(room.ceilingArea) : 0;
  const pointCount = room.isIncluded ? calculatePointCount(room, ceilingArea) : 0;
  const ceilingWorks = ceilingArea * ceilingRates.pvcMatteSatin.works;
  const ceilingMaterials = ceilingArea * ceilingRates.pvcMatteSatin.materials;
  const ceilingConsumables = ceilingArea * ceilingRates.pvcMatteSatin.consumables;
  const pointWorks = pointCount * (ceilingRates.pointLightBase.works + ceilingRates.pointLightCut.works);
  const pointMaterials = pointCount * (ceilingRates.pointLightBase.materials + ceilingRates.pointLightCut.materials);
  const pointEquipment = pointCount * ceilingRates.gx53Fixture.equipment;
  const pointConsumables = pointCount * (ceilingRates.pointLightBase.consumables + ceilingRates.pointLightCut.consumables);

  return {
    ...room,
    ceilingArea,
    pointCount,
    ceilingWorks,
    ceilingMaterials,
    ceilingConsumables,
    pointWorks,
    pointMaterials,
    pointEquipment,
    pointConsumables,
    roomTotal:
      ceilingWorks +
      ceilingMaterials +
      ceilingConsumables +
      pointWorks +
      pointMaterials +
      pointEquipment +
      pointConsumables,
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
) {
  if (quantity <= 0 || unitPrice <= 0) {
    return;
  }

  items.push(createLineItem(id, title, category, quantity, unit, unitPrice));
}

export function calculateCeiling(rooms: CeilingRoomInput[]): CeilingCalculationResult {
  const roomResults = rooms.map(createRoomResult);
  const includedRooms = roomResults.filter((room) => room.isIncluded && room.ceilingArea > 0);
  const ceilingArea = includedRooms.reduce((total, room) => total + room.ceilingArea, 0);
  const pointCount = includedRooms.reduce((total, room) => total + room.pointCount, 0);
  const items: EstimateLineItem[] = [];

  includedRooms.forEach((room) => {
    addLine(
      items,
      `ceiling-pvc-works-${room.roomId}`,
      `Натяжной потолок - ${room.roomName}`,
      "works",
      room.ceilingArea,
      "м²",
      ceilingRates.pvcMatteSatin.works,
    );
    addLine(
      items,
      `ceiling-pvc-materials-${room.roomId}`,
      `Материалы натяжного потолка - ${room.roomName}`,
      "materials",
      room.ceilingArea,
      "м²",
      ceilingRates.pvcMatteSatin.materials,
    );
    addLine(
      items,
      `ceiling-pvc-consumables-${room.roomId}`,
      `Расходники натяжного потолка - ${room.roomName}`,
      "consumables",
      room.ceilingArea,
      "м²",
      ceilingRates.pvcMatteSatin.consumables,
    );

    if (room.pointCount > 0) {
      addLine(
        items,
        `ceiling-point-base-${room.roomId}`,
        `Закладные под точечный свет - ${room.roomName}`,
        "works",
        room.pointCount,
        "шт",
        ceilingRates.pointLightBase.works,
      );
      addLine(
        items,
        `ceiling-point-cut-${room.roomId}`,
        `Врезка точечного светильника - ${room.roomName}`,
        "works",
        room.pointCount,
        "шт",
        ceilingRates.pointLightCut.works,
      );
      addLine(
        items,
        `ceiling-point-materials-${room.roomId}`,
        `Материалы точечного света - ${room.roomName}`,
        "materials",
        room.pointCount,
        "шт",
        ceilingRates.pointLightBase.materials + ceilingRates.pointLightCut.materials,
      );
      addLine(
        items,
        `ceiling-point-equipment-${room.roomId}`,
        `Встраиваемые светильники GX53 - ${room.roomName}`,
        "equipment",
        room.pointCount,
        "шт",
        ceilingRates.gx53Fixture.equipment,
      );
      addLine(
        items,
        `ceiling-point-consumables-${room.roomId}`,
        `Расходники точечного света - ${room.roomName}`,
        "consumables",
        room.pointCount,
        "шт",
        ceilingRates.pointLightBase.consumables + ceilingRates.pointLightCut.consumables,
      );
    }
  });

  const section = createEstimateSection("ceiling", "Потолки", items, "Натяжной потолок ПВХ и точечный свет.");

  return {
    roomResults,
    ceilingArea,
    pointCount,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
