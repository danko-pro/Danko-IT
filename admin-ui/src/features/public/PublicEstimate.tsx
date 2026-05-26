import { useMemo, useState } from "react";
import { calculateCeiling } from "./public-estimate-ceiling";
import { calculateElectric, type ElectricOptions } from "./public-estimate-electric";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  type EstimateRoomInput,
  type EstimateRoomType,
} from "./public-estimate-geometry";
import {
  calculateFlooring,
  type FlooringCoveringType,
  type FlooringLayoutType,
  type FlooringPlinthType,
  type FlooringPreparationType,
} from "./public-estimate-flooring";
import { calculateEstimateTotals } from "./public-estimate-model";
import { calculatePlumbing, type PlumbingOptions } from "./public-estimate-plumbing";
import { calculateWarmFloor, type WarmFloorMode } from "./public-estimate-warm-floor";
import {
  calculateWalls,
  type WallsCoveringType,
  type WallsPreparationType,
} from "./public-estimate-walls";

const estimateSteps = [
  "объект и помещения",
  "объём объекта",
  "стены и полы",
  "тёплый пол",
  "потолки, электрика, сантехника",
  "итоговая смета",
  "скачать / отправить заявку",
];

const roomTypeOptions: Array<{ value: EstimateRoomType; label: string }> = [
  { value: "living_room", label: "Комната" },
  { value: "kitchen", label: "Кухня" },
  { value: "bathroom", label: "Санузел" },
  { value: "hallway", label: "Прихожая" },
  { value: "balcony", label: "Балкон" },
  { value: "other", label: "Другое" },
];

const flooringCoveringOptions: Array<{ value: FlooringCoveringType; label: string }> = [
  { value: "porcelain", label: "Керамогранит" },
  { value: "quartz_vinyl", label: "Кварцвинил" },
  { value: "laminate", label: "Ламинат" },
  { value: "carpet", label: "Ковролин" },
  { value: "engineered_wood", label: "Инженерная доска" },
];

const flooringPreparationOptions: Array<{ value: FlooringPreparationType; label: string }> = [
  { value: "none", label: "Без подготовки" },
  { value: "primer", label: "Грунтование" },
  { value: "self_leveling", label: "Наливной пол" },
  { value: "waterproofing", label: "Гидроизоляция" },
];

const flooringLayoutOptions: Array<{ value: FlooringLayoutType; label: string }> = [
  { value: "straight", label: "Прямая" },
  { value: "large_format_straight", label: "Крупный формат" },
  { value: "glue", label: "Клеевая" },
  { value: "floating", label: "Плавающая" },
];

const flooringPlinthOptions: Array<{ value: FlooringPlinthType; label: string }> = [
  { value: "none", label: "Без плинтуса" },
  { value: "duropolymer", label: "Дюрополимерный" },
  { value: "painted_mdf", label: "МДФ окрашенный" },
];

const wallsCoveringOptions: Array<{ value: WallsCoveringType; label: string }> = [
  { value: "wallpaper", label: "Обои" },
  { value: "tile", label: "Плитка" },
  { value: "paint", label: "Окраска" },
  { value: "paintable_wallpaper", label: "Обои под покраску" },
];

const wallsPreparationOptions: Array<{ value: WallsPreparationType; label: string }> = [
  { value: "none", label: "Без подготовки" },
  { value: "primer", label: "Грунтование" },
  { value: "putty_wallpaper", label: "Шпаклевка под обои" },
  { value: "putty_paint", label: "Шпаклевка под покраску" },
  { value: "waterproofing", label: "Гидроизоляция" },
];

type EstimateRoomDraft = Omit<EstimateRoomInput, "area" | "doorCount" | "windowCount"> & {
  area: string;
  doorCount: string;
  windowCount: string;
};

type WarmFloorRoomDraft = {
  isSelected?: boolean;
  warmFloorArea?: string;
};

type FlooringRoomDraft = {
  isIncluded?: boolean;
  coveringType?: FlooringCoveringType;
  preparationType?: FlooringPreparationType;
  layoutType?: FlooringLayoutType;
};

type FlooringOptionsDraft = {
  includePlinth: boolean;
  plinthType: FlooringPlinthType;
  includeThresholds: boolean;
  thresholdCount: string;
  includeDemolition: boolean;
};

type WallsRoomDraft = {
  isIncluded?: boolean;
  coveringType?: WallsCoveringType;
  preparationType?: WallsPreparationType;
};

type CeilingRoomDraft = {
  isIncluded?: boolean;
  hasPointLights?: boolean;
};

type ElectricRoomDraft = {
  isIncluded?: boolean;
};

const FLOORING_SPEC_COLLAPSED_LIMIT = 10;
const WALLS_SPEC_COLLAPSED_LIMIT = 10;
const CEILING_SPEC_COLLAPSED_LIMIT = 10;
const ELECTRIC_SPEC_COLLAPSED_LIMIT = 10;
const PLUMBING_SPEC_COLLAPSED_LIMIT = 10;

const initialRooms: EstimateRoomDraft[] = [
  { id: "hallway", name: "Прихожая", type: "hallway", area: "6.5", doorCount: "1", windowCount: "0" },
  { id: "kitchen", name: "Кухня", type: "kitchen", area: "12", doorCount: "1", windowCount: "1" },
  { id: "living-room", name: "Комната", type: "living_room", area: "18", doorCount: "1", windowCount: "1" },
  { id: "bathroom", name: "Санузел", type: "bathroom", area: "4.3", doorCount: "1", windowCount: "0" },
  { id: "balcony", name: "Балкон", type: "balcony", area: "2.2", doorCount: "1", windowCount: "1" },
];

function normalizeRoom(room: EstimateRoomDraft): EstimateRoomInput {
  return {
    ...room,
    area: parseEstimateDecimal(room.area),
    doorCount: parseEstimateDecimal(room.doorCount),
    windowCount: parseEstimateDecimal(room.windowCount),
  };
}

function formatMeasurement(value: number, unit: "м" | "м²" | "м.п.") {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)} ${unit}`;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)} ₽`;
}

function formatEstimateQuantity(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function createEstimateRoom(): EstimateRoomDraft {
  return {
    id: `room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "Новое помещение",
    type: "other",
    area: "10",
    doorCount: "1",
    windowCount: "0",
  };
}

function getDefaultFlooringCovering(roomType: EstimateRoomType): FlooringCoveringType {
  if (roomType === "living_room") {
    return "carpet";
  }

  if (roomType === "other") {
    return "quartz_vinyl";
  }

  return "porcelain";
}

function getDefaultFlooringPreparation(roomType: EstimateRoomType): FlooringPreparationType {
  return roomType === "living_room" ? "self_leveling" : "primer";
}

function getDefaultFlooringLayout(coveringType: FlooringCoveringType): FlooringLayoutType {
  if (coveringType === "porcelain") {
    return "large_format_straight";
  }

  if (coveringType === "carpet" || coveringType === "engineered_wood") {
    return "glue";
  }

  if (coveringType === "laminate") {
    return "floating";
  }

  return "straight";
}

function getDefaultWallsCovering(roomType: EstimateRoomType): WallsCoveringType {
  return roomType === "bathroom" ? "tile" : "wallpaper";
}

function getDefaultWallsPreparation(roomType: EstimateRoomType): WallsPreparationType {
  return roomType === "bathroom" ? "waterproofing" : "primer";
}

function getDefaultCeilingLightSettings(roomType: EstimateRoomType) {
  if (roomType === "hallway") {
    return { squareMetersPerPoint: 2.5, minPoints: 2, hasPointLights: true };
  }

  if (roomType === "kitchen") {
    return { squareMetersPerPoint: 2.5, minPoints: 3, hasPointLights: true };
  }

  if (roomType === "living_room") {
    return { squareMetersPerPoint: 3, minPoints: 4, hasPointLights: true };
  }

  if (roomType === "bathroom") {
    return { squareMetersPerPoint: 1.5, minPoints: 4, hasPointLights: true };
  }

  if (roomType === "balcony") {
    return { squareMetersPerPoint: 4, minPoints: 1, hasPointLights: false };
  }

  return { squareMetersPerPoint: 3, minPoints: 2, hasPointLights: true };
}

export function PublicEstimate() {
  const [ceilingHeightInput, setCeilingHeightInput] = useState("2.7");
  const [rooms, setRooms] = useState<EstimateRoomDraft[]>(initialRooms);
  const [warmFloorMode, setWarmFloorMode] = useState<WarmFloorMode>("water");
  const [warmFloorRooms, setWarmFloorRooms] = useState<Record<string, WarmFloorRoomDraft>>({});
  const [flooringRooms, setFlooringRooms] = useState<Record<string, FlooringRoomDraft>>({});
  const [wallsRooms, setWallsRooms] = useState<Record<string, WallsRoomDraft>>({});
  const [ceilingRooms, setCeilingRooms] = useState<Record<string, CeilingRoomDraft>>({});
  const [electricRooms, setElectricRooms] = useState<Record<string, ElectricRoomDraft>>({});
  const [flooringOptions, setFlooringOptions] = useState<FlooringOptionsDraft>({
    includePlinth: true,
    plinthType: "duropolymer",
    includeThresholds: false,
    thresholdCount: "0",
    includeDemolition: false,
  });
  const [electricOptions, setElectricOptions] = useState<ElectricOptions>({
    includeKitchenOutputs: true,
    includeSwitchboard: true,
  });
  const [plumbingOptions, setPlumbingOptions] = useState<PlumbingOptions>({
    includeBathroomSet: true,
    includeBath: true,
    includeHygienicShower: true,
    includeElectricTowelRail: false,
    includeKitchenSink: true,
    includeDishwasherOutput: true,
    includeWasherOutput: true,
    includeWaterNode: true,
    includeLeakProtection: false,
  });
  const [isFlooringSpecExpanded, setIsFlooringSpecExpanded] = useState(false);
  const [isWallsSpecExpanded, setIsWallsSpecExpanded] = useState(false);
  const [isCeilingSpecExpanded, setIsCeilingSpecExpanded] = useState(false);
  const [isElectricSpecExpanded, setIsElectricSpecExpanded] = useState(false);
  const [isPlumbingSpecExpanded, setIsPlumbingSpecExpanded] = useState(false);

  const ceilingHeight = useMemo(() => parseEstimateDecimal(ceilingHeightInput), [ceilingHeightInput]);
  const roomInputs = useMemo(() => rooms.map(normalizeRoom), [rooms]);
  const roomGeometries = useMemo(
    () => roomInputs.map((room) => calculateEstimateRoomGeometry(room, ceilingHeight)),
    [roomInputs, ceilingHeight],
  );
  const totals = useMemo(() => calculateEstimateGeometryTotals(roomGeometries), [roomGeometries]);
  const warmFloorRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const warmFloorDraft = warmFloorRooms[room.id] ?? {};

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          isSelected: warmFloorDraft.isSelected ?? room.type === "bathroom",
          warmFloorArea: parseEstimateDecimal(warmFloorDraft.warmFloorArea ?? room.area),
        };
      }),
    [roomInputs, rooms, warmFloorRooms],
  );
  const warmFloorResult = useMemo(
    () => calculateWarmFloor(warmFloorMode, warmFloorRoomInputs),
    [warmFloorMode, warmFloorRoomInputs],
  );
  const flooringRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const flooringDraft = flooringRooms[room.id] ?? {};
        const coveringType = flooringDraft.coveringType ?? getDefaultFlooringCovering(room.type);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          perimeter: roomGeometries[index]?.perimeter ?? 0,
          coveringType,
          preparationType: flooringDraft.preparationType ?? getDefaultFlooringPreparation(room.type),
          layoutType: flooringDraft.layoutType ?? getDefaultFlooringLayout(coveringType),
          isIncluded: flooringDraft.isIncluded ?? true,
        };
      }),
    [flooringRooms, roomGeometries, roomInputs, rooms],
  );
  const flooringResult = useMemo(
    () =>
      calculateFlooring(flooringRoomInputs, {
        includePlinth: flooringOptions.includePlinth,
        plinthType: flooringOptions.plinthType,
        includeThresholds: flooringOptions.includeThresholds,
        thresholdCount: parseEstimateDecimal(flooringOptions.thresholdCount),
        includeDemolition: flooringOptions.includeDemolition,
      }),
    [flooringOptions, flooringRoomInputs],
  );
  const wallsRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const wallsDraft = wallsRooms[room.id] ?? {};

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          finishWallArea: roomGeometries[index]?.finishWallArea ?? 0,
          coveringType: wallsDraft.coveringType ?? getDefaultWallsCovering(room.type),
          preparationType: wallsDraft.preparationType ?? getDefaultWallsPreparation(room.type),
          isIncluded: wallsDraft.isIncluded ?? true,
        };
      }),
    [roomGeometries, rooms, wallsRooms],
  );
  const wallsResult = useMemo(() => calculateWalls(wallsRoomInputs), [wallsRoomInputs]);
  const ceilingRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const ceilingDraft = ceilingRooms[room.id] ?? {};
        const lightDefaults = getDefaultCeilingLightSettings(room.type);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          ceilingArea: roomGeometries[index]?.ceilingArea ?? 0,
          isIncluded: ceilingDraft.isIncluded ?? true,
          hasPointLights: ceilingDraft.hasPointLights ?? lightDefaults.hasPointLights,
          squareMetersPerPoint: lightDefaults.squareMetersPerPoint,
          minPoints: lightDefaults.minPoints,
        };
      }),
    [ceilingRooms, roomGeometries, rooms],
  );
  const ceilingResult = useMemo(() => calculateCeiling(ceilingRoomInputs), [ceilingRoomInputs]);
  const electricRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const electricDraft = electricRooms[room.id] ?? {};
        const ceilingRoom = ceilingResult.roomResults.find((ceilingResultRoom) => ceilingResultRoom.roomId === room.id);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          roomType: room.type,
          area: roomInputs[index]?.area ?? 0,
          isIncluded: electricDraft.isIncluded ?? true,
          ceilingPointCount: ceilingRoom?.pointCount ?? 1,
        };
      }),
    [ceilingResult.roomResults, electricRooms, roomInputs, rooms],
  );
  const electricResult = useMemo(
    () => calculateElectric(electricRoomInputs, electricOptions),
    [electricOptions, electricRoomInputs],
  );
  const plumbingRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => ({
        roomId: room.id,
        roomName: room.name.trim() || "Помещение",
        roomType: room.type,
        area: roomInputs[index]?.area ?? 0,
      })),
    [roomInputs, rooms],
  );
  const plumbingResult = useMemo(
    () => calculatePlumbing(plumbingRoomInputs, plumbingOptions),
    [plumbingOptions, plumbingRoomInputs],
  );
  const estimateResult = useMemo(() => {
    const sections = [
      ...(warmFloorResult.selectedArea > 0 ? [warmFloorResult.section] : []),
      ...(flooringResult.flooringArea > 0 ? [flooringResult.section] : []),
      ...(wallsResult.wallFinishArea > 0 ? [wallsResult.section] : []),
      ...(ceilingResult.ceilingArea > 0 ? [ceilingResult.section] : []),
      ...(electricResult.section.items.length > 0 ? [electricResult.section] : []),
      ...(plumbingResult.section.items.length > 0 ? [plumbingResult.section] : []),
    ];

    return {
      sections,
      totals: calculateEstimateTotals(sections, totals.floorArea),
    };
  }, [ceilingResult, electricResult, flooringResult, plumbingResult, totals.floorArea, wallsResult, warmFloorResult]);

  const summaryItems = [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(totals.plinthLength, "м") },
  ];
  const estimateTotalItems = [
    { label: "Работы", value: formatMoney(estimateResult.totals.works) },
    { label: "Материалы", value: formatMoney(estimateResult.totals.materials) },
    { label: "Оборудование", value: formatMoney(estimateResult.totals.equipment) },
    { label: "Расходники", value: formatMoney(estimateResult.totals.consumables) },
    { label: "Итого", value: formatMoney(estimateResult.totals.total), isStrong: true },
    { label: "₽/м²", value: `${formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²` },
  ];
  const warmFloorModeLabel = warmFloorMode === "water" ? "Водяной" : "Электрический";
  const warmFloorConnectionLabel =
    warmFloorMode === "electric"
      ? "автомат в щит"
      : warmFloorResult.usesTowelRailConnection
        ? "от полотенцесушителя"
        : warmFloorResult.needsPump
          ? "гребенка + насос"
          : warmFloorResult.needsManifold
            ? "гребенка"
            : "без отдельного узла";
  const warmFloorSummaryItems =
    warmFloorMode === "water"
      ? [
          { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
          { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
          { label: "Труба", value: formatMeasurement(warmFloorResult.pipeMeters, "м") },
          { label: "Контуры", value: `${warmFloorResult.circuitCount} шт.` },
          { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
          { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
          { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
        ]
      : [
          { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
          { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
          { label: "Терморегулятор", value: `${warmFloorResult.thermostatCount} шт.` },
          { label: "Автомат в щит", value: `${warmFloorResult.electricBreakerCount} шт.` },
          { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
          { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
          { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
      ];
  const flooringSummaryItems = [
    { label: "Площадь пола", value: formatMeasurement(flooringResult.flooringArea, "м²") },
    { label: "Площадь закупки", value: formatMeasurement(flooringResult.purchaseArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(flooringResult.plinthLength, "м") },
    { label: "Работы", value: formatMoney(flooringResult.worksTotal) },
    { label: "Материалы", value: formatMoney(flooringResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(flooringResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(flooringResult.total), isStrong: true },
  ];
  const flooringSpecItems = flooringResult.section.items;
  const isFlooringSpecLong = flooringSpecItems.length > FLOORING_SPEC_COLLAPSED_LIMIT;
  const visibleFlooringSpecItems =
    isFlooringSpecLong && !isFlooringSpecExpanded
      ? flooringSpecItems.slice(0, FLOORING_SPEC_COLLAPSED_LIMIT)
      : flooringSpecItems;
  const hiddenFlooringSpecCount = Math.max(0, flooringSpecItems.length - visibleFlooringSpecItems.length);
  const wallsSummaryItems = [
    { label: "Площадь стен", value: formatMeasurement(wallsResult.wallFinishArea, "м²") },
    { label: "Площадь закупки", value: formatMeasurement(wallsResult.purchaseArea, "м²") },
    { label: "Работы", value: formatMoney(wallsResult.worksTotal) },
    { label: "Материалы", value: formatMoney(wallsResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(wallsResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(wallsResult.total), isStrong: true },
  ];
  const wallsSpecItems = wallsResult.section.items;
  const isWallsSpecLong = wallsSpecItems.length > WALLS_SPEC_COLLAPSED_LIMIT;
  const visibleWallsSpecItems =
    isWallsSpecLong && !isWallsSpecExpanded
      ? wallsSpecItems.slice(0, WALLS_SPEC_COLLAPSED_LIMIT)
      : wallsSpecItems;
  const hiddenWallsSpecCount = Math.max(0, wallsSpecItems.length - visibleWallsSpecItems.length);
  const ceilingSummaryItems = [
    { label: "Площадь потолков", value: formatMeasurement(ceilingResult.ceilingArea, "м²") },
    { label: "Точки света", value: `${ceilingResult.pointCount} шт.` },
    { label: "Работы", value: formatMoney(ceilingResult.worksTotal) },
    { label: "Материалы", value: formatMoney(ceilingResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(ceilingResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(ceilingResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(ceilingResult.total), isStrong: true },
  ];
  const ceilingSpecItems = ceilingResult.section.items;
  const isCeilingSpecLong = ceilingSpecItems.length > CEILING_SPEC_COLLAPSED_LIMIT;
  const visibleCeilingSpecItems =
    isCeilingSpecLong && !isCeilingSpecExpanded
      ? ceilingSpecItems.slice(0, CEILING_SPEC_COLLAPSED_LIMIT)
      : ceilingSpecItems;
  const hiddenCeilingSpecCount = Math.max(0, ceilingSpecItems.length - visibleCeilingSpecItems.length);
  const electricSummaryItems = [
    { label: "Розетки", value: `${electricResult.socketCount} шт.` },
    { label: "Световые выводы", value: `${electricResult.lightOutputCount} шт.` },
    { label: "Выключатели", value: `${electricResult.switchCount} шт.` },
    { label: "Кухонные выводы", value: `${electricResult.kitchenOutputCount} шт.` },
    { label: "Щит / автоматика", value: `${electricResult.switchboardAutomationCount} поз.` },
    { label: "Работы", value: formatMoney(electricResult.worksTotal) },
    { label: "Материалы", value: formatMoney(electricResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(electricResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(electricResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(electricResult.total), isStrong: true },
  ];
  const electricSpecItems = electricResult.section.items;
  const isElectricSpecLong = electricSpecItems.length > ELECTRIC_SPEC_COLLAPSED_LIMIT;
  const visibleElectricSpecItems =
    isElectricSpecLong && !isElectricSpecExpanded
      ? electricSpecItems.slice(0, ELECTRIC_SPEC_COLLAPSED_LIMIT)
      : electricSpecItems;
  const hiddenElectricSpecCount = Math.max(0, electricSpecItems.length - visibleElectricSpecItems.length);
  const plumbingCompositionItems = [
    { label: "Санузлов", value: `${plumbingResult.bathroomCount} шт.` },
    { label: "Кухня", value: plumbingResult.hasKitchen ? "да" : "нет" },
    { label: "ХВС", value: `${plumbingResult.coldWaterPoints} точ.` },
    { label: "ГВС", value: `${plumbingResult.hotWaterPoints} точ.` },
    { label: "Канализация", value: `${plumbingResult.sewerPoints} точ.` },
  ];
  const plumbingSummaryItems = [
    { label: "ХВС точки", value: `${plumbingResult.coldWaterPoints} точ.` },
    { label: "ГВС точки", value: `${plumbingResult.hotWaterPoints} точ.` },
    { label: "Канализация", value: `${plumbingResult.sewerPoints} точ.` },
    { label: "Приборы", value: `${plumbingResult.fixtureCount} шт.` },
    { label: "Работы", value: formatMoney(plumbingResult.worksTotal) },
    { label: "Материалы", value: formatMoney(plumbingResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(plumbingResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(plumbingResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(plumbingResult.total), isStrong: true },
  ];
  const plumbingSpecItems = plumbingResult.section.items;
  const isPlumbingSpecLong = plumbingSpecItems.length > PLUMBING_SPEC_COLLAPSED_LIMIT;
  const visiblePlumbingSpecItems =
    isPlumbingSpecLong && !isPlumbingSpecExpanded
      ? plumbingSpecItems.slice(0, PLUMBING_SPEC_COLLAPSED_LIMIT)
      : plumbingSpecItems;
  const hiddenPlumbingSpecCount = Math.max(0, plumbingSpecItems.length - visiblePlumbingSpecItems.length);

  function updateRoom(roomId: string, patch: Partial<EstimateRoomDraft>) {
    setRooms((currentRooms) => currentRooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)));
  }

  function updateWarmFloorRoom(roomId: string, patch: WarmFloorRoomDraft) {
    setWarmFloorRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateFlooringRoom(roomId: string, patch: FlooringRoomDraft) {
    setFlooringRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateFlooringCovering(roomId: string, coveringType: FlooringCoveringType) {
    updateFlooringRoom(roomId, {
      coveringType,
      layoutType: getDefaultFlooringLayout(coveringType),
    });
  }

  function updateFlooringOptions(patch: Partial<FlooringOptionsDraft>) {
    setFlooringOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateWallsRoom(roomId: string, patch: WallsRoomDraft) {
    setWallsRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateCeilingRoom(roomId: string, patch: CeilingRoomDraft) {
    setCeilingRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateElectricRoom(roomId: string, patch: ElectricRoomDraft) {
    setElectricRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateElectricOptions(patch: Partial<ElectricOptions>) {
    setElectricOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updatePlumbingOptions(patch: Partial<PlumbingOptions>) {
    setPlumbingOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function addRoom() {
    setRooms((currentRooms) => [...currentRooms, createEstimateRoom()]);
  }

  function removeRoom(roomId: string) {
    setRooms((currentRooms) => (currentRooms.length > 1 ? currentRooms.filter((room) => room.id !== roomId) : currentRooms));
    setWarmFloorRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setFlooringRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setWallsRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setCeilingRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setElectricRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }

  return (
    <main className="public-landing public-estimate-page">
      <header className="public-estimate-header">
        <a className="public-brand public-privacy-brand" href="/" aria-label="Danko, на главную">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="public-brand-copy">
            <span className="public-brand-name">Danko</span>
            <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
          </span>
        </a>
        <a className="public-privacy-back" href="/">
          Вернуться на главную
        </a>
      </header>

      <section className="public-estimate" aria-labelledby="public-estimate-title">
        <div className="public-estimate-card public-estimate-card-main">
          <div className="public-estimate-intro">
            <p className="public-section-kicker">Калькулятор ремонта</p>
            <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
            <p className="public-estimate-subtitle">
              Первый блок считает геометрию объекта по площадям помещений: пол, периметр, стены, проёмы, потолки и
              плинтус.
            </p>
          </div>

          <section className="public-estimate-summary" aria-labelledby="public-estimate-summary-title">
            <div className="public-estimate-summary-head">
              <p className="public-section-kicker">Объём объекта</p>
              <h2 id="public-estimate-summary-title">Предварительная геометрия</h2>
            </div>

            <div className="public-estimate-summary-grid">
              {summaryItems.map((item) => (
                <div className="public-estimate-summary-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="public-estimate-geometry" aria-labelledby="public-estimate-geometry-title">
            <div className="public-estimate-geometry-head">
              <div>
                <span>Шаг 01</span>
                <h2 id="public-estimate-geometry-title">Объект и помещения</h2>
              </div>

              <label className="public-estimate-field public-estimate-ceiling-field">
                <span>Высота потолков, м</span>
                <input
                  className="public-estimate-input"
                  inputMode="decimal"
                  value={ceilingHeightInput}
                  onChange={(event) => setCeilingHeightInput(event.target.value)}
                />
              </label>
            </div>

            <div className="public-estimate-room-header" aria-hidden="true">
              <span>№</span>
              <span>Помещение</span>
              <span>Тип</span>
              <span>Площадь</span>
              <span>Двери</span>
              <span>Окна</span>
              <span>Стены к отделке</span>
              <span />
            </div>

            <div className="public-estimate-room-list" aria-label="Список помещений">
              {roomGeometries.map((room, index) => {
                const roomDraft = rooms[index];

                return (
                  <article className="public-estimate-room-row" key={room.id}>
                    <div className="public-estimate-room-top">
                      <div className="public-estimate-room-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <label className="public-estimate-field public-estimate-room-name">
                        <span className="public-estimate-mobile-label">Помещение</span>
                        <input
                          aria-label="Помещение"
                          className="public-estimate-input"
                          value={roomDraft.name}
                          onChange={(event) => updateRoom(room.id, { name: event.target.value })}
                        />
                      </label>

                      <button
                        aria-label="Удалить помещение"
                        className="public-estimate-row-remove"
                        type="button"
                        disabled={rooms.length <= 1}
                        onClick={() => removeRoom(room.id)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="public-estimate-room-main">
                      <label className="public-estimate-field public-estimate-room-type">
                        <span className="public-estimate-mobile-label">Тип</span>
                        <select
                          aria-label="Тип помещения"
                          className="public-estimate-select"
                          value={roomDraft.type}
                          onChange={(event) => updateRoom(room.id, { type: event.target.value as EstimateRoomType })}
                        >
                          {roomTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="public-estimate-room-metrics">
                        <label className="public-estimate-field public-estimate-room-area">
                          <span className="public-estimate-mobile-label">Площадь</span>
                          <input
                            aria-label="Площадь помещения"
                            className="public-estimate-input"
                            inputMode="decimal"
                            value={roomDraft.area}
                            onChange={(event) => updateRoom(room.id, { area: event.target.value })}
                          />
                        </label>

                        <label className="public-estimate-field public-estimate-room-doors">
                          <span className="public-estimate-mobile-label">Двери</span>
                          <input
                            aria-label="Количество дверей"
                            className="public-estimate-input"
                            inputMode="numeric"
                            value={roomDraft.doorCount}
                            onChange={(event) => updateRoom(room.id, { doorCount: event.target.value })}
                          />
                        </label>

                        <label className="public-estimate-field public-estimate-room-windows">
                          <span className="public-estimate-mobile-label">Окна</span>
                          <input
                            aria-label="Количество окон"
                            className="public-estimate-input"
                            inputMode="numeric"
                            value={roomDraft.windowCount}
                            onChange={(event) => updateRoom(room.id, { windowCount: event.target.value })}
                          />
                        </label>
                      </div>

                      <div className="public-estimate-room-result">
                        <span className="public-estimate-mobile-label">Стены к отделке</span>
                        <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-geometry-footer">
              <button className="public-estimate-small-action" type="button" onClick={addRoom}>
                Добавить помещение
              </button>
              <p>
                Расчёт предварительный: используем площади по БТИ и коэффициент формы, без ручного замера каждой стены.
              </p>
            </div>
          </section>

          <section className="public-estimate-warm-floor" aria-labelledby="public-estimate-warm-floor-title">
            <div className="public-estimate-warm-floor-head">
              <div>
                <span>Шаг 02</span>
                <h2 id="public-estimate-warm-floor-title">Тёплый пол</h2>
                <p>Выберите помещения, площадь зоны и тип системы. Раздел сразу попадает в итоговую смету.</p>
              </div>

              <div className="public-estimate-toggle-group" aria-label="Тип тёплого пола">
                <button
                  className={warmFloorMode === "water" ? "public-estimate-toggle-active" : undefined}
                  type="button"
                  aria-pressed={warmFloorMode === "water"}
                  onClick={() => setWarmFloorMode("water")}
                >
                  Водяной
                </button>
                <button
                  className={warmFloorMode === "electric" ? "public-estimate-toggle-active" : undefined}
                  type="button"
                  aria-pressed={warmFloorMode === "electric"}
                  onClick={() => setWarmFloorMode("electric")}
                >
                  Электрический
                </button>
              </div>
            </div>

            <div className="public-estimate-room-toggle-list" aria-label="Помещения для тёплого пола">
              {rooms.map((room, index) => {
                const warmFloorDraft = warmFloorRooms[room.id] ?? {};
                const isSelected = warmFloorDraft.isSelected ?? room.type === "bathroom";
                const warmFloorArea = warmFloorDraft.warmFloorArea ?? room.area;
                const normalizedArea = roomInputs[index]?.area ?? 0;

                return (
                  <article className="public-estimate-warm-floor-row" key={room.id}>
                    <label className="public-estimate-warm-floor-room">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => updateWarmFloorRoom(room.id, { isSelected: event.target.checked })}
                      />
                      <span>
                        <strong>{room.name.trim() || "Помещение"}</strong>
                        <small>{formatMeasurement(normalizedArea, "м²")}</small>
                      </span>
                    </label>

                    <label className="public-estimate-field public-estimate-warm-floor-area">
                      <span>Площадь тёплого пола</span>
                      <input
                        className="public-estimate-input"
                        inputMode="decimal"
                        value={warmFloorArea}
                        disabled={!isSelected}
                        onChange={(event) => updateWarmFloorRoom(room.id, { warmFloorArea: event.target.value })}
                      />
                    </label>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-warm-floor-summary" aria-label="Итоги по тёплому полу">
              {warmFloorSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-warm-floor-total" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {warmFloorResult.section.items.length > 0 ? (
              <div className="public-estimate-warm-floor-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>
                    {warmFloorModeLabel}; подключение: {warmFloorConnectionLabel}
                  </span>
                </div>
                <ul>
                  {warmFloorResult.section.items.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Выберите хотя бы одно помещение, чтобы добавить тёплый пол в смету.</p>
            )}
          </section>

          <section className="public-estimate-flooring" aria-labelledby="public-estimate-flooring-title">
            <div className="public-estimate-flooring-head">
              <div>
                <span>Шаг 03</span>
                <h2 id="public-estimate-flooring-title">Полы</h2>
                <p>Выберите покрытие, подготовку и способ укладки по помещениям. Плинтус, порожки и демонтаж считаются отдельными строками.</p>
              </div>
            </div>

            <div className="public-estimate-flooring-header" aria-hidden="true">
              <span>Помещение</span>
              <span>Покрытие</span>
              <span>Подготовка</span>
              <span>Укладка</span>
              <span>Закупка</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-flooring-room-list" aria-label="Помещения для расчёта полов">
              {flooringResult.roomResults.map((room) => {
                const flooringDraft = flooringRooms[room.roomId] ?? {};
                const isIncluded = flooringDraft.isIncluded ?? true;

                return (
                  <article className="public-estimate-flooring-row" key={room.roomId}>
                    <label className="public-estimate-flooring-room">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) => updateFlooringRoom(room.roomId, { isIncluded: event.target.checked })}
                      />
                      <span>
                        <strong>{room.roomName}</strong>
                        <small>{formatMeasurement(room.area, "м²")}</small>
                      </span>
                    </label>

                    <label className="public-estimate-field public-estimate-flooring-covering">
                      <span className="public-estimate-mobile-label">Покрытие</span>
                      <select
                        className="public-estimate-select"
                        value={room.coveringType}
                        disabled={!isIncluded}
                        onChange={(event) => updateFlooringCovering(room.roomId, event.target.value as FlooringCoveringType)}
                      >
                        {flooringCoveringOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="public-estimate-field public-estimate-flooring-preparation">
                      <span className="public-estimate-mobile-label">Подготовка</span>
                      <select
                        className="public-estimate-select"
                        value={room.preparationType}
                        disabled={!isIncluded}
                        onChange={(event) => updateFlooringRoom(room.roomId, { preparationType: event.target.value as FlooringPreparationType })}
                      >
                        {flooringPreparationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="public-estimate-field public-estimate-flooring-layout">
                      <span className="public-estimate-mobile-label">Укладка</span>
                      <select
                        className="public-estimate-select"
                        value={room.layoutType}
                        disabled={!isIncluded}
                        onChange={(event) => updateFlooringRoom(room.roomId, { layoutType: event.target.value as FlooringLayoutType })}
                      >
                        {flooringLayoutOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="public-estimate-flooring-result">
                      <span className="public-estimate-mobile-label">Закупка</span>
                      <strong>{formatMeasurement(room.purchaseArea, "м²")}</strong>
                    </div>

                    <div className="public-estimate-flooring-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(room.roomTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-flooring-options">
              <div className="public-estimate-flooring-option-zone">
                <div className="public-estimate-flooring-option-head">
                  <label className="public-estimate-option-check">
                    <input
                      type="checkbox"
                      checked={flooringOptions.includePlinth}
                      onChange={(event) => updateFlooringOptions({ includePlinth: event.target.checked })}
                    />
                    <span>Плинтус</span>
                  </label>
                  <small>Периметр помещений</small>
                </div>

                <label className="public-estimate-field">
                  <span>Тип плинтуса</span>
                  <select
                    className="public-estimate-select"
                    value={flooringOptions.plinthType}
                    disabled={!flooringOptions.includePlinth}
                    onChange={(event) => updateFlooringOptions({ plinthType: event.target.value as FlooringPlinthType })}
                  >
                    {flooringPlinthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="public-estimate-flooring-option-zone">
                <div className="public-estimate-flooring-option-head">
                  <label className="public-estimate-option-check">
                    <input
                      type="checkbox"
                      checked={flooringOptions.includeThresholds}
                      onChange={(event) => updateFlooringOptions({ includeThresholds: event.target.checked })}
                    />
                    <span>Порожки</span>
                  </label>
                  <small>Стыки и переходы</small>
                </div>

                <label className="public-estimate-field">
                  <span>Количество</span>
                  <input
                    className="public-estimate-input"
                    inputMode="numeric"
                    value={flooringOptions.thresholdCount}
                    disabled={!flooringOptions.includeThresholds}
                    onChange={(event) => updateFlooringOptions({ thresholdCount: event.target.value })}
                  />
                </label>
              </div>

              <div className="public-estimate-flooring-option-zone public-estimate-flooring-option-zone-compact">
                <div className="public-estimate-flooring-option-head">
                  <label className="public-estimate-option-check">
                    <input
                      type="checkbox"
                      checked={flooringOptions.includeDemolition}
                      onChange={(event) => updateFlooringOptions({ includeDemolition: event.target.checked })}
                    />
                    <span>Демонтаж</span>
                  </label>
                  <small>Старое покрытие</small>
                </div>
              </div>
            </div>

            <div className="public-estimate-flooring-summary" aria-label="Итоги по полам">
              {flooringSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-flooring-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {flooringResult.section.items.length > 0 ? (
              <div className="public-estimate-flooring-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Покрытия, подготовка, плинтус и расходники</span>
                </div>
                <ul>
                  {visibleFlooringSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isFlooringSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isFlooringSpecExpanded}
                    onClick={() => setIsFlooringSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isFlooringSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenFlooringSpecCount > 0 ? `: ещё ${hiddenFlooringSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить полы в смету.</p>
            )}
          </section>

          <section className="public-estimate-walls" aria-labelledby="public-estimate-walls-title">
            <div className="public-estimate-walls-head">
              <div>
                <span>Шаг 04</span>
                <h2 id="public-estimate-walls-title">Стены</h2>
                <p>Расчёт отделки стен по чистой площади из геометрии: покрытие, подготовка, закупка и расходники по каждому помещению.</p>
              </div>
            </div>

            <div className="public-estimate-walls-header" aria-hidden="true">
              <span>Помещение</span>
              <span>Покрытие</span>
              <span>Подготовка</span>
              <span>Площадь стен</span>
              <span>Закупка</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-walls-room-list" aria-label="Помещения для расчёта стен">
              {wallsResult.roomResults.map((room) => {
                const wallsDraft = wallsRooms[room.roomId] ?? {};
                const isIncluded = wallsDraft.isIncluded ?? true;

                return (
                  <article className="public-estimate-walls-row" key={room.roomId}>
                    <label className="public-estimate-walls-room">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) => updateWallsRoom(room.roomId, { isIncluded: event.target.checked })}
                      />
                      <span>
                        <strong>{room.roomName}</strong>
                        <small>{formatMeasurement(room.finishWallArea, "м²")}</small>
                      </span>
                    </label>

                    <label className="public-estimate-field public-estimate-walls-covering">
                      <span className="public-estimate-mobile-label">Покрытие</span>
                      <select
                        className="public-estimate-select"
                        value={room.coveringType}
                        disabled={!isIncluded}
                        onChange={(event) => updateWallsRoom(room.roomId, { coveringType: event.target.value as WallsCoveringType })}
                      >
                        {wallsCoveringOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="public-estimate-field public-estimate-walls-preparation">
                      <span className="public-estimate-mobile-label">Подготовка</span>
                      <select
                        className="public-estimate-select"
                        value={room.preparationType}
                        disabled={!isIncluded}
                        onChange={(event) => updateWallsRoom(room.roomId, { preparationType: event.target.value as WallsPreparationType })}
                      >
                        {wallsPreparationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="public-estimate-walls-result">
                      <span className="public-estimate-mobile-label">Площадь стен</span>
                      <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
                    </div>

                    <div className="public-estimate-walls-result">
                      <span className="public-estimate-mobile-label">Закупка</span>
                      <strong>{formatMeasurement(room.purchaseArea, "м²")}</strong>
                    </div>

                    <div className="public-estimate-walls-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(room.roomTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-walls-summary" aria-label="Итоги по стенам">
              {wallsSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-walls-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {wallsResult.section.items.length > 0 ? (
              <div className="public-estimate-walls-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Покрытия, подготовка стен и расходники</span>
                </div>
                <ul>
                  {visibleWallsSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isWallsSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isWallsSpecExpanded}
                    onClick={() => setIsWallsSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isWallsSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenWallsSpecCount > 0 ? `: ещё ${hiddenWallsSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить стены в смету.</p>
            )}
          </section>

          <section className="public-estimate-ceiling" aria-labelledby="public-estimate-ceiling-title">
            <div className="public-estimate-ceiling-head">
              <div>
                <span>Шаг 05</span>
                <h2 id="public-estimate-ceiling-title">Потолки</h2>
                <p>Первый срез потолков: ПВХ матовый / сатин и точечный свет с закладными, врезкой и светильниками GX53.</p>
              </div>
            </div>

            <div className="public-estimate-ceiling-header" aria-hidden="true">
              <span>Помещение</span>
              <span>Потолок</span>
              <span>Точечный свет</span>
              <span>Площадь</span>
              <span>Точки</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-ceiling-room-list" aria-label="Помещения для расчёта потолков">
              {ceilingResult.roomResults.map((room) => {
                const ceilingDraft = ceilingRooms[room.roomId] ?? {};
                const lightDefaults = getDefaultCeilingLightSettings(
                  rooms.find((estimateRoom) => estimateRoom.id === room.roomId)?.type ?? "other",
                );
                const isIncluded = ceilingDraft.isIncluded ?? true;
                const hasPointLights = ceilingDraft.hasPointLights ?? lightDefaults.hasPointLights;

                return (
                  <article className="public-estimate-ceiling-row" key={room.roomId}>
                    <label className="public-estimate-ceiling-room">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) => updateCeilingRoom(room.roomId, { isIncluded: event.target.checked })}
                      />
                      <span>
                        <strong>{room.roomName}</strong>
                        <small>{formatMeasurement(room.ceilingArea, "м²")}</small>
                      </span>
                    </label>

                    <div className="public-estimate-ceiling-type">
                      <span className="public-estimate-mobile-label">Потолок</span>
                      <strong>ПВХ матовый / сатин</strong>
                    </div>

                    <label className="public-estimate-ceiling-light">
                      <input
                        type="checkbox"
                        checked={hasPointLights}
                        disabled={!isIncluded}
                        onChange={(event) => updateCeilingRoom(room.roomId, { hasPointLights: event.target.checked })}
                      />
                      <span>Точечный свет</span>
                    </label>

                    <div className="public-estimate-ceiling-result">
                      <span className="public-estimate-mobile-label">Площадь</span>
                      <strong>{formatMeasurement(room.ceilingArea, "м²")}</strong>
                    </div>

                    <div className="public-estimate-ceiling-result">
                      <span className="public-estimate-mobile-label">Точки</span>
                      <strong>{room.pointCount} шт.</strong>
                    </div>

                    <div className="public-estimate-ceiling-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(room.roomTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-ceiling-summary" aria-label="Итоги по потолкам">
              {ceilingSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-ceiling-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {ceilingResult.section.items.length > 0 ? (
              <div className="public-estimate-ceiling-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>ПВХ потолок, закладные, врезка и светильники GX53</span>
                </div>
                <ul>
                  {visibleCeilingSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isCeilingSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isCeilingSpecExpanded}
                    onClick={() => setIsCeilingSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isCeilingSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenCeilingSpecCount > 0 ? `: ещё ${hiddenCeilingSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить потолки в смету.</p>
            )}
          </section>

          <section className="public-estimate-electric" aria-labelledby="public-estimate-electric-title">
            <div className="public-estimate-electric-head">
              <div>
                <span>Шаг 06</span>
                <h2 id="public-estimate-electric-title">Электрика</h2>
                <p>Предварительный расчёт точек, кухонных выводов, света, выключателей и базового щита.</p>
              </div>
            </div>

            <div className="public-estimate-electric-header" aria-hidden="true">
              <span>Помещение</span>
              <span>Розетки</span>
              <span>Свет</span>
              <span>Выключатель</span>
              <span>Площадь</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-electric-room-list" aria-label="Помещения для расчёта электрики">
              {electricResult.roomResults.map((room) => {
                const electricDraft = electricRooms[room.roomId] ?? {};
                const isIncluded = electricDraft.isIncluded ?? true;

                return (
                  <article className="public-estimate-electric-row" key={room.roomId}>
                    <label className="public-estimate-electric-room">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) => updateElectricRoom(room.roomId, { isIncluded: event.target.checked })}
                      />
                      <span>
                        <strong>{room.roomName}</strong>
                        <small>{room.roomType === "bathroom" ? "влагозащищённые розетки" : "розетки 1 пост"}</small>
                      </span>
                    </label>

                    <div className="public-estimate-electric-result">
                      <span className="public-estimate-mobile-label">Розетки</span>
                      <strong>
                        {room.socketCount} шт.
                        {room.waterproofSocketCount > 0 ? " IP" : ""}
                      </strong>
                    </div>

                    <div className="public-estimate-electric-result">
                      <span className="public-estimate-mobile-label">Свет</span>
                      <strong>{room.lightOutputCount} шт.</strong>
                    </div>

                    <div className="public-estimate-electric-result">
                      <span className="public-estimate-mobile-label">Выключатель</span>
                      <strong>{room.switchCount} шт.</strong>
                    </div>

                    <div className="public-estimate-electric-result">
                      <span className="public-estimate-mobile-label">Площадь</span>
                      <strong>{formatMeasurement(room.area, "м²")}</strong>
                    </div>

                    <div className="public-estimate-electric-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(room.roomTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-electric-options" aria-label="Опции электрики">
              <label className="public-estimate-electric-option-zone">
                <input
                  type="checkbox"
                  checked={electricOptions.includeKitchenOutputs}
                  onChange={(event) => updateElectricOptions({ includeKitchenOutputs: event.target.checked })}
                />
                <span>
                  <strong>Кухонные выводы</strong>
                  <small>варочная, духовка, ПММ, холодильник, СВЧ и вытяжка</small>
                </span>
              </label>

              <label className="public-estimate-electric-option-zone">
                <input
                  type="checkbox"
                  checked={electricOptions.includeSwitchboard}
                  onChange={(event) => updateElectricOptions({ includeSwitchboard: event.target.checked })}
                />
                <span>
                  <strong>Щит и базовая автоматика</strong>
                  <small>щит, автоматы, УЗО, реле, шины и комплект расходников</small>
                </span>
              </label>
            </div>

            <div className="public-estimate-electric-summary" aria-label="Итоги по электрике">
              {electricSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-electric-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {electricResult.section.items.length > 0 ? (
              <div className="public-estimate-electric-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Розетки, выводы света, кухонные выводы и базовый щит</span>
                </div>
                <ul>
                  {visibleElectricSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isElectricSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isElectricSpecExpanded}
                    onClick={() => setIsElectricSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isElectricSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenElectricSpecCount > 0 ? `: ещё ${hiddenElectricSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить электрику в смету.</p>
            )}
          </section>

          <section className="public-estimate-plumbing" aria-labelledby="public-estimate-plumbing-title">
            <div className="public-estimate-plumbing-head">
              <div>
                <span>Шаг 07</span>
                <h2 id="public-estimate-plumbing-title">Сантехника</h2>
                <p>Предварительный расчёт санузла, кухни, выводов под технику и базового сантехнического узла.</p>
              </div>
            </div>

            <div className="public-estimate-plumbing-composition" aria-label="Состав сантехнического расчёта">
              {plumbingCompositionItems.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="public-estimate-plumbing-options" aria-label="Опции сантехники">
              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeBathroomSet}
                  onChange={(event) => updatePlumbingOptions({ includeBathroomSet: event.target.checked })}
                />
                <span>
                  <strong>Санузел: тумба, смеситель, инсталляция</strong>
                  <small>комплект базовых приборов на каждый санузел</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeBath}
                  onChange={(event) => updatePlumbingOptions({ includeBath: event.target.checked })}
                />
                <span>
                  <strong>Ванна со смесителем</strong>
                  <small>акриловая ванна, сифон и смеситель с лейкой</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeHygienicShower}
                  onChange={(event) => updatePlumbingOptions({ includeHygienicShower: event.target.checked })}
                />
                <span>
                  <strong>Гигиенический душ</strong>
                  <small>выводы и подключение в санузле</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeElectricTowelRail}
                  onChange={(event) => updatePlumbingOptions({ includeElectricTowelRail: event.target.checked })}
                />
                <span>
                  <strong>Электрический полотенцесушитель</strong>
                  <small>монтаж и подключение к электрике</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeKitchenSink}
                  onChange={(event) => updatePlumbingOptions({ includeKitchenSink: event.target.checked })}
                />
                <span>
                  <strong>Кухонная мойка</strong>
                  <small>выводы под мойку и сифон кухонной мойки</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeDishwasherOutput}
                  onChange={(event) => updatePlumbingOptions({ includeDishwasherOutput: event.target.checked })}
                />
                <span>
                  <strong>Вывод под ПММ</strong>
                  <small>холодная вода, горячая вода и канализация</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeWasherOutput}
                  onChange={(event) => updatePlumbingOptions({ includeWasherOutput: event.target.checked })}
                />
                <span>
                  <strong>Вывод под стиральную машину</strong>
                  <small>выводы под стиральную и сушильную машину</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeWaterNode}
                  onChange={(event) => updatePlumbingOptions({ includeWaterNode: event.target.checked })}
                />
                <span>
                  <strong>Коллектор, фильтры и отсечные краны</strong>
                  <small>базовый сантехнический узел объекта</small>
                </span>
              </label>

              <label className="public-estimate-plumbing-option-zone public-estimate-plumbing-option-zone-wide">
                <input
                  type="checkbox"
                  checked={plumbingOptions.includeLeakProtection}
                  onChange={(event) => updatePlumbingOptions({ includeLeakProtection: event.target.checked })}
                />
                <span>
                  <strong>Система защиты от протечек</strong>
                  <small>датчики и перекрытие воды, опционально</small>
                </span>
              </label>
            </div>

            <div className="public-estimate-plumbing-summary" aria-label="Итоги по сантехнике">
              {plumbingSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-plumbing-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {plumbingResult.section.items.length > 0 ? (
              <div className="public-estimate-plumbing-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Санузел, кухня, выводы под технику и сантехнический узел</span>
                </div>
                <ul>
                  {visiblePlumbingSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isPlumbingSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isPlumbingSpecExpanded}
                    onClick={() => setIsPlumbingSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isPlumbingSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenPlumbingSpecCount > 0 ? `: ещё ${hiddenPlumbingSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Добавьте санузел, кухню или вывод под технику, чтобы включить сантехнику в смету.</p>
            )}
          </section>

          <section className="public-estimate-costs" aria-labelledby="public-estimate-costs-title">
            <div className="public-estimate-costs-head">
              <p className="public-section-kicker">Итоговая смета</p>
              <h2 id="public-estimate-costs-title">Стоимость по разделам</h2>
            </div>

            <div className="public-estimate-cost-grid">
              {estimateTotalItems.map((item) => (
                <div className={`public-estimate-cost-cell${item.isStrong ? " public-estimate-cost-cell-total" : ""}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <p className="public-estimate-cost-note">
              Сейчас в смету включены тёплый пол, полы, стены, потолки, электрика и сантехника. Следующие разделы подключим отдельно: двери и дополнительные работы.
            </p>
          </section>

          <div className="public-estimate-actions" aria-label="Действия на странице калькулятора">
            <a className="public-action" href="/#contacts">
              Оставить заявку
            </a>
            <a className="public-hero-secondary" href="/">
              Вернуться на главную
            </a>
          </div>
        </div>

        <aside className="public-estimate-card public-estimate-scenario" aria-label="Будущий сценарий расчёта">
          <div className="public-estimate-preview-head">
            <span>Сценарий</span>
            <h2>Следующие блоки</h2>
          </div>
          <ol className="public-estimate-steps">
            {estimateSteps.map((step, index) => (
              <li className={index === 0 ? "public-estimate-step-active" : undefined} key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
