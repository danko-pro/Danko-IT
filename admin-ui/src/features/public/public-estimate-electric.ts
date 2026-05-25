import type { EstimateRoomType } from "./public-estimate-geometry";
import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type ElectricRoomInput = {
  roomId: string;
  roomName: string;
  roomType: EstimateRoomType;
  area: number;
  isIncluded: boolean;
  ceilingPointCount: number;
};

export type ElectricOptions = {
  includeKitchenOutputs: boolean;
  includeSwitchboard: boolean;
};

export type ElectricRoomResult = ElectricRoomInput & {
  regularSocketCount: number;
  waterproofSocketCount: number;
  socketCount: number;
  lightOutputCount: number;
  switchCount: number;
  roomTotal: number;
};

export type ElectricCalculationResult = {
  roomResults: ElectricRoomResult[];
  regularSocketCount: number;
  waterproofSocketCount: number;
  socketCount: number;
  lightOutputCount: number;
  switchCount: number;
  kitchenOutputCount: number;
  switchboardCount: number;
  breakerCount: number;
  rcdCount: number;
  voltageRelayCount: number;
  busModuleCount: number;
  consumablesKitCount: number;
  switchboardAutomationCount: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

type ElectricRate = {
  unit: "шт" | "компл.";
  works: number;
  materials: number;
  equipment: number;
  consumables: number;
  comment?: string;
};

type SocketRoomDefault = {
  socketAreaNorm: number;
  minSockets: number;
  extraSockets: number;
};

export const electricRates = {
  regularSocket: {
    unit: "шт",
    works: 1200,
    materials: 700,
    equipment: 700,
    consumables: 150,
    comment: "одинарная розетка с подрозетником и механизмом",
  },
  waterproofSocket: {
    unit: "шт",
    works: 1600,
    materials: 900,
    equipment: 1200,
    consumables: 200,
    comment: "IP44/IP54 для влажных зон",
  },
  hobOutput: {
    unit: "шт",
    works: 3500,
    materials: 2500,
    equipment: 0,
    consumables: 500,
  },
  ovenOutput: {
    unit: "шт",
    works: 2800,
    materials: 1800,
    equipment: 0,
    consumables: 400,
  },
  dishwasherOutput: {
    unit: "шт",
    works: 1800,
    materials: 1200,
    equipment: 0,
    consumables: 250,
  },
  fridgeOutput: {
    unit: "шт",
    works: 1600,
    materials: 900,
    equipment: 0,
    consumables: 200,
  },
  microwaveOutput: {
    unit: "шт",
    works: 1600,
    materials: 900,
    equipment: 0,
    consumables: 200,
  },
  hoodOutput: {
    unit: "шт",
    works: 1600,
    materials: 900,
    equipment: 0,
    consumables: 200,
  },
  lightOutput: {
    unit: "шт",
    works: 1200,
    materials: 700,
    equipment: 0,
    consumables: 150,
  },
  singleSwitch: {
    unit: "шт",
    works: 1200,
    materials: 700,
    equipment: 700,
    consumables: 150,
  },
  switchboard: {
    unit: "шт",
    works: 15000,
    materials: 12000,
    equipment: 15000,
    consumables: 2500,
  },
  breaker: {
    unit: "шт",
    works: 800,
    materials: 300,
    equipment: 800,
    consumables: 100,
  },
  rcd: {
    unit: "шт",
    works: 1200,
    materials: 500,
    equipment: 3500,
    consumables: 150,
  },
  voltageRelay: {
    unit: "шт",
    works: 1500,
    materials: 500,
    equipment: 4500,
    consumables: 150,
  },
  busModule: {
    unit: "шт",
    works: 1200,
    materials: 1500,
    equipment: 2500,
    consumables: 200,
  },
  conduitKit: {
    unit: "компл.",
    works: 0,
    materials: 5000,
    equipment: 0,
    consumables: 3000,
  },
} satisfies Record<string, ElectricRate>;

const socketDefaultsByRoomType = {
  hallway: { socketAreaNorm: 4, minSockets: 2, extraSockets: 0 },
  kitchen: { socketAreaNorm: 2, minSockets: 6, extraSockets: 0 },
  living_room: { socketAreaNorm: 4, minSockets: 6, extraSockets: 2 },
  bathroom: { socketAreaNorm: 3, minSockets: 2, extraSockets: 1 },
  balcony: { socketAreaNorm: 5, minSockets: 1, extraSockets: 0 },
  other: { socketAreaNorm: 4, minSockets: 2, extraSockets: 0 },
} satisfies Record<EstimateRoomType, SocketRoomDefault>;

const kitchenOutputRates = [
  ["hob-output", "Вывод под варочную панель", electricRates.hobOutput],
  ["oven-output", "Вывод под духовой шкаф", electricRates.ovenOutput],
  ["dishwasher-output", "Вывод под ПММ", electricRates.dishwasherOutput],
  ["fridge-output", "Вывод под холодильник", electricRates.fridgeOutput],
  ["microwave-output", "Вывод под СВЧ", electricRates.microwaveOutput],
  ["hood-output", "Вывод под вытяжку", electricRates.hoodOutput],
] as const;

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function safeCount(value: number) {
  return Math.max(0, Math.round(safeNumber(value)));
}

function calculateRateTotal(quantity: number, rate: ElectricRate) {
  const safeQuantity = safeNumber(quantity);

  return safeQuantity * (rate.works + rate.materials + rate.equipment + rate.consumables);
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
    sectionId: "electric",
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

function addRateLines(items: EstimateLineItem[], id: string, title: string, quantity: number, rate: ElectricRate) {
  addLine(items, `${id}-works`, `${title} - работы`, "works", quantity, rate.unit, rate.works, rate.comment);
  addLine(items, `${id}-materials`, `${title} - материалы`, "materials", quantity, rate.unit, rate.materials, rate.comment);
  addLine(items, `${id}-equipment`, `${title} - оборудование`, "equipment", quantity, rate.unit, rate.equipment, rate.comment);
  addLine(items, `${id}-consumables`, `${title} - расходники`, "consumables", quantity, rate.unit, rate.consumables, rate.comment);
}

function calculateSocketCount(room: ElectricRoomInput) {
  const area = safeNumber(room.area);

  if (!room.isIncluded || area <= 0) {
    return 0;
  }

  const roomDefaults = socketDefaultsByRoomType[room.roomType];
  const baseSocketCount = Math.max(roomDefaults.minSockets, Math.ceil(area / roomDefaults.socketAreaNorm));

  return baseSocketCount + roomDefaults.extraSockets;
}

function createRoomResult(room: ElectricRoomInput): ElectricRoomResult {
  const area = room.isIncluded ? safeNumber(room.area) : 0;
  const socketCount = calculateSocketCount(room);
  const regularSocketCount = room.roomType === "bathroom" ? 0 : socketCount;
  const waterproofSocketCount = room.roomType === "bathroom" ? socketCount : 0;
  const lightOutputCount = room.isIncluded && area > 0 ? Math.max(1, safeCount(room.ceilingPointCount)) : 0;
  const switchCount = room.isIncluded && area > 0 ? 1 : 0;
  const roomTotal =
    calculateRateTotal(regularSocketCount, electricRates.regularSocket) +
    calculateRateTotal(waterproofSocketCount, electricRates.waterproofSocket) +
    calculateRateTotal(lightOutputCount, electricRates.lightOutput) +
    calculateRateTotal(switchCount, electricRates.singleSwitch);

  return {
    ...room,
    area,
    regularSocketCount,
    waterproofSocketCount,
    socketCount,
    lightOutputCount,
    switchCount,
    roomTotal,
  };
}

export function calculateElectric(rooms: ElectricRoomInput[], options: ElectricOptions): ElectricCalculationResult {
  const roomResults = rooms.map(createRoomResult);
  const includedRooms = roomResults.filter((room) => room.isIncluded && room.area > 0);
  const regularSocketCount = includedRooms.reduce((total, room) => total + room.regularSocketCount, 0);
  const waterproofSocketCount = includedRooms.reduce((total, room) => total + room.waterproofSocketCount, 0);
  const socketCount = regularSocketCount + waterproofSocketCount;
  const lightOutputCount = includedRooms.reduce((total, room) => total + room.lightOutputCount, 0);
  const switchCount = includedRooms.reduce((total, room) => total + room.switchCount, 0);
  const hasKitchen = includedRooms.some((room) => room.roomType === "kitchen");
  const kitchenOutputCount = options.includeKitchenOutputs && hasKitchen ? kitchenOutputRates.length : 0;
  const electricalPointCount = socketCount + lightOutputCount + kitchenOutputCount;
  const switchboardCount = options.includeSwitchboard && electricalPointCount > 0 ? 1 : 0;
  const breakerCount = switchboardCount > 0 ? Math.max(6, Math.ceil(electricalPointCount / 4)) : 0;
  const rcdCount = switchboardCount > 0 ? Math.max(2, Math.ceil(breakerCount / 4)) : 0;
  const voltageRelayCount = switchboardCount > 0 ? 1 : 0;
  const busModuleCount = switchboardCount > 0 ? 1 : 0;
  const consumablesKitCount = switchboardCount > 0 ? 1 : 0;
  const items: EstimateLineItem[] = [];

  addRateLines(items, "regular-sockets", "Розетка 1 пост", regularSocketCount, electricRates.regularSocket);
  addRateLines(items, "waterproof-sockets", "Розетка влагостойкая", waterproofSocketCount, electricRates.waterproofSocket);
  kitchenOutputRates.forEach(([id, title, rate]) => {
    addRateLines(items, id, title, options.includeKitchenOutputs && hasKitchen ? 1 : 0, rate);
  });
  addRateLines(items, "light-outputs", "Вывод света", lightOutputCount, electricRates.lightOutput);
  addRateLines(items, "single-switches", "Выключатель 1 клавиша", switchCount, electricRates.singleSwitch);
  addRateLines(items, "switchboard", "Электрощит", switchboardCount, electricRates.switchboard);
  addRateLines(items, "breakers", "Автоматический выключатель", breakerCount, electricRates.breaker);
  addRateLines(items, "rcd", "УЗО / дифавтомат", rcdCount, electricRates.rcd);
  addRateLines(items, "voltage-relay", "Реле напряжения", voltageRelayCount, electricRates.voltageRelay);
  addRateLines(items, "bus-module", "Кросс-модуль / шина / нулевая группа", busModuleCount, electricRates.busModule);
  addRateLines(items, "conduit-kit", "Гофра / крепеж / расходники", consumablesKitCount, electricRates.conduitKit);

  const section = createEstimateSection(
    "electric",
    "Электрика",
    items,
    "Предварительный расчёт электроточек, выводов света и базового щита.",
  );

  return {
    roomResults,
    regularSocketCount,
    waterproofSocketCount,
    socketCount,
    lightOutputCount,
    switchCount,
    kitchenOutputCount,
    switchboardCount,
    breakerCount,
    rcdCount,
    voltageRelayCount,
    busModuleCount,
    consumablesKitCount,
    switchboardAutomationCount:
      switchboardCount + breakerCount + rcdCount + voltageRelayCount + busModuleCount + consumablesKitCount,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
