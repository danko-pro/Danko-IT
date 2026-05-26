import type { EstimateRoomType } from "./public-estimate-geometry";
import {
  createEstimateSection,
  type EstimateCostCategory,
  type EstimateLineItem,
  type EstimateSection,
} from "./public-estimate-model";

export type DoorPackageType = "invisible_19000" | "invisible_20350";

export type DoorRoomInput = {
  roomId: string;
  roomName: string;
  roomType: EstimateRoomType;
  area: number;
  doorCount: number;
};

export type DoorOptions = {
  packageType: DoorPackageType;
  includeHandles: boolean;
  includePrivacyLocks: boolean;
  includeLogistics: boolean;
  includeInstallation: boolean;
};

export type DoorCalculationResult = {
  packageType: DoorPackageType;
  packageLabel: string;
  totalDoorCount: number;
  bathroomDoorCount: number;
  handleCount: number;
  privacyLockCount: number;
  deliveryCount: number;
  liftCount: number;
  installationCount: number;
  logisticsTotal: number;
  hardwareTotal: number;
  worksTotal: number;
  materialsTotal: number;
  equipmentTotal: number;
  consumablesTotal: number;
  total: number;
  section: EstimateSection;
};

type DoorPackageRate = {
  label: string;
  doorKitMaterial: number;
  handleEquipment: number;
  privacyLockEquipment: number;
  deliveryConsumables: number;
  liftConsumables: number;
  comment: string;
};

export const doorPackageRates = {
  invisible_19000: {
    label: "INVISIBLE 3 / 19 000",
    doorKitMaterial: 19000,
    handleEquipment: 1460,
    privacyLockEquipment: 950,
    deliveryConsumables: 1200,
    liftConsumables: 600,
    comment: "INVISIBLE 3, наружное открывание, черная кромка, вариант 19 000",
  },
  invisible_20350: {
    label: "INVISIBLE 3 / 20 350",
    doorKitMaterial: 20350,
    handleEquipment: 1565,
    privacyLockEquipment: 1020,
    deliveryConsumables: 1300,
    liftConsumables: 650,
    comment: "INVISIBLE 3, наружное открывание, черная кромка, вариант 20 350",
  },
} satisfies Record<DoorPackageType, DoorPackageRate>;

const installationWorks = 5500;

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function safeCount(value: number) {
  return Math.max(0, Math.round(safeNumber(value)));
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
    sectionId: "doors",
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

export function calculateDoors(rooms: DoorRoomInput[], options: DoorOptions): DoorCalculationResult {
  const packageRate = doorPackageRates[options.packageType];
  const includedRooms = rooms.filter((room) => safeNumber(room.area) > 0);
  const totalDoorCount = includedRooms.reduce((total, room) => total + safeCount(room.doorCount), 0);
  const bathroomDoorCount = includedRooms
    .filter((room) => room.roomType === "bathroom")
    .reduce((total, room) => total + safeCount(room.doorCount), 0);
  const handleCount = options.includeHandles ? totalDoorCount : 0;
  const privacyLockCount = options.includePrivacyLocks ? bathroomDoorCount : 0;
  const deliveryCount = options.includeLogistics && totalDoorCount > 0 ? 1 : 0;
  const liftCount = options.includeLogistics ? totalDoorCount : 0;
  const installationCount = options.includeInstallation ? totalDoorCount : 0;
  const items: EstimateLineItem[] = [];

  addLine(
    items,
    "door-installation",
    "Монтаж дверей",
    "works",
    installationCount,
    "шт",
    installationWorks,
  );
  addLine(
    items,
    "door-kit",
    "Дверной комплект INVISIBLE 3",
    "materials",
    totalDoorCount,
    "шт",
    packageRate.doorKitMaterial,
    packageRate.comment,
  );
  addLine(items, "door-handles", "Ручки", "equipment", handleCount, "шт", packageRate.handleEquipment);
  addLine(
    items,
    "door-privacy-locks",
    "Завертки для санузлов",
    "equipment",
    privacyLockCount,
    "шт",
    packageRate.privacyLockEquipment,
  );
  addLine(items, "door-delivery", "Доставка", "consumables", deliveryCount, "усл.", packageRate.deliveryConsumables);
  addLine(items, "door-lift", "Подъём", "consumables", liftCount, "шт", packageRate.liftConsumables);

  const section = createEstimateSection(
    "doors",
    "Двери",
    items,
    "Предварительный расчёт дверных комплектов, фурнитуры, логистики и монтажа.",
  );

  return {
    packageType: options.packageType,
    packageLabel: packageRate.label,
    totalDoorCount,
    bathroomDoorCount,
    handleCount,
    privacyLockCount,
    deliveryCount,
    liftCount,
    installationCount,
    logisticsTotal: deliveryCount * packageRate.deliveryConsumables + liftCount * packageRate.liftConsumables,
    hardwareTotal: handleCount * packageRate.handleEquipment + privacyLockCount * packageRate.privacyLockEquipment,
    worksTotal: section.totals.works,
    materialsTotal: section.totals.materials,
    equipmentTotal: section.totals.equipment,
    consumablesTotal: section.totals.consumables,
    total: section.totals.total,
    section,
  };
}
