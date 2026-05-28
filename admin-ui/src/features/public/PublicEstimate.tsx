import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { calculateCeiling } from "./public-estimate-ceiling";
import { calculateCompletion, type CompletionOptions } from "./public-estimate-completion";
import {
  applianceItemCatalog,
  appliancePackageLabels,
  calculateAppliances,
  createDefaultAppliancesOptions,
  fridgeVariantLabels,
  getApplianceUnitPrice,
  type ApplianceItemKey,
  type AppliancePackageLevel,
  type AppliancesOptions,
  type FridgeVariant,
} from "./public-estimate-appliances";
import {
  calculateLooseFurniture,
  createDefaultLooseFurnitureOptions,
  getLooseFurnitureUnitPrice,
  looseFurnitureGroupLabels,
  looseFurnitureItemCatalog,
  looseFurniturePackageLabels,
  type LooseFurnitureItemKey,
  type LooseFurnitureOptions,
  type LooseFurniturePackageLevel,
} from "./public-estimate-loose-furniture";
import {
  calculateHomeGoods,
  cleaningRatePerM2,
  createDefaultHomeGoodsOptions,
  homeGoodsPackageLabels,
  homeGoodsPackageRates,
  type HomeGoodsOptions,
  type HomeGoodsPackageLevel,
} from "./public-estimate-home-goods";
import {
  calculateDoors,
  type DoorOptions,
  type DoorPackageType,
} from "./public-estimate-doors";
import { calculateElectric, type ElectricOptions } from "./public-estimate-electric";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  parseEstimateInteger,
  type EstimateRoomInput,
  type EstimateRoomType,
} from "./public-estimate-geometry";
import {
  estimateNumericFieldProps,
  estimateTextFieldProps,
  normalizeEstimateCeilingHeightOnBlur,
  normalizeEstimateCountOnBlur,
  normalizeEstimateDecimalOnBlur,
  normalizeEstimateQuantityOnBlur,
  sanitizeEstimateDecimalInput,
  sanitizeEstimateIntegerInput,
} from "./public-estimate-input";
import {
  calculateFlooring,
  type FlooringCoveringType,
  type FlooringLayoutType,
  type FlooringPlinthType,
  type FlooringPreparationType,
} from "./public-estimate-flooring";
import { calculateEstimateTotals } from "./public-estimate-model";
import { classifyEstimatePackage } from "./public-estimate-package";
import { calculatePlumbing, type PlumbingOptions } from "./public-estimate-plumbing";
import { calculateWarmFloor, type WarmFloorMode } from "./public-estimate-warm-floor";
import {
  calculateWalls,
  type WallsCoveringType,
  type WallsPreparationType,
} from "./public-estimate-walls";

const roomTypeOptions: Array<{ value: EstimateRoomType; label: string }> = [
  { value: "living_room", label: "Комната" },
  { value: "kitchen", label: "Кухня" },
  { value: "bathroom", label: "Санузел" },
  { value: "hallway", label: "Прихожая" },
  { value: "balcony", label: "Балкон" },
  { value: "other", label: "Другое" },
];

const GEOMETRY_STEP_HINT =
  "Площадь, двери и окна по БТИ — периметр и стены пересчитаются автоматически.";

const GEOMETRY_ROW_REMOVE_MS = 280;

function getGeometryRowRemoveDelayMs(): number {
  if (typeof window === "undefined") {
    return GEOMETRY_ROW_REMOVE_MS;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GEOMETRY_ROW_REMOVE_MS;
}

function prefersReducedEstimateMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function inferRoomTypeFromName(name: string): EstimateRoomType | null {
  const normalized = name.trim().toLocaleLowerCase("ru-RU");

  if (!normalized) {
    return null;
  }

  const matchedOption = roomTypeOptions.find((option) => option.label.toLocaleLowerCase("ru-RU") === normalized);

  return matchedOption?.value ?? null;
}

const validEstimateRoomTypes = new Set<EstimateRoomType>(roomTypeOptions.map((option) => option.value));

function normalizeEstimateRoomType(type: string | undefined | null): EstimateRoomType {
  if (type && validEstimateRoomTypes.has(type as EstimateRoomType)) {
    return type as EstimateRoomType;
  }

  return "other";
}

function normalizeEstimateRoomDraft(room: EstimateRoomDraft): EstimateRoomDraft {
  const type = normalizeEstimateRoomType(room.type);
  const inferredType = inferRoomTypeFromName(room.name);

  return {
    ...room,
    type: inferredType ?? type,
  };
}

const NEW_ROOM_DEFAULT_NAME = "Новое помещение";

function buildNewRoomName(existingRooms: EstimateRoomDraft[]): string {
  const usedNames = new Set(existingRooms.map((room) => room.name.trim().toLocaleLowerCase("ru-RU")));
  const baseName = NEW_ROOM_DEFAULT_NAME;

  if (!usedNames.has(baseName.toLocaleLowerCase("ru-RU"))) {
    return baseName;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseName} ${suffix}`;

    if (!usedNames.has(candidate.toLocaleLowerCase("ru-RU"))) {
      return candidate;
    }
  }

  return `Помещение ${existingRooms.length + 1}`;
}

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

const doorPackageOptions: Array<{ value: DoorPackageType; label: string }> = [
  { value: "invisible_19000", label: "INVISIBLE 3 / 19 000" },
  { value: "invisible_20350", label: "INVISIBLE 3 / 20 350" },
];

type EstimateNavigationIcon =
  | "object"
  | "geometry"
  | "warmFloor"
  | "flooring"
  | "walls"
  | "ceiling"
  | "electric"
  | "plumbing"
  | "doors"
  | "completion"
  | "appliances"
  | "furniture"
  | "cleaning"
  | "total";

const estimateNavigationItems: Array<{
  id: string;
  label: string;
  icon: EstimateNavigationIcon;
}> = [
  { id: "estimate-object", label: "Объект", icon: "object" },
  { id: "estimate-geometry", label: "Геометрия", icon: "geometry" },
  { id: "estimate-warm-floor", label: "Тёплый пол", icon: "warmFloor" },
  { id: "estimate-flooring", label: "Полы", icon: "flooring" },
  { id: "estimate-walls", label: "Стены", icon: "walls" },
  { id: "estimate-ceiling", label: "Потолки", icon: "ceiling" },
  { id: "estimate-electric", label: "Электрика", icon: "electric" },
  { id: "estimate-plumbing", label: "Сантехника", icon: "plumbing" },
  { id: "estimate-doors", label: "Двери", icon: "doors" },
  { id: "estimate-completion", label: "Комплектация", icon: "completion" },
  { id: "estimate-appliances", label: "Техника", icon: "appliances" },
  { id: "estimate-loose-furniture", label: "Мебель", icon: "furniture" },
  { id: "estimate-home-goods", label: "Уборка и товары для дома", icon: "cleaning" },
  { id: "estimate-costs", label: "Итог", icon: "total" },
];

const ESTIMATE_INITIAL_SECTION_ID = estimateNavigationItems[0]?.id ?? "estimate-object";
const ESTIMATE_SCROLL_SPY_SECTION_IDS = estimateNavigationItems.map((item) => item.id);
const ESTIMATE_PAGE_BOTTOM_THRESHOLD_PX = 96;
const ESTIMATE_SCROLL_ACTIVATION_LINE_DESKTOP_PX = 96;
const ESTIMATE_SCROLL_ACTIVATION_LINE_MOBILE_PX = 64;
const ESTIMATE_MOBILE_BREAKPOINT_QUERY = "(max-width: 1180px)";

function getEstimateScrollActivationLinePx(): number {
  return window.matchMedia(ESTIMATE_MOBILE_BREAKPOINT_QUERY).matches
    ? ESTIMATE_SCROLL_ACTIVATION_LINE_MOBILE_PX
    : ESTIMATE_SCROLL_ACTIVATION_LINE_DESKTOP_PX;
}
const ESTIMATE_PROGRAMMATIC_SCROLL_MAX_MS = 3000;
const ESTIMATE_PROGRAMMATIC_SCROLL_REDUCED_MOTION_MAX_MS = 150;
const ESTIMATE_SCROLL_STABILIZE_FRAMES = 4;
const ESTIMATE_SCROLL_STABILIZE_PX = 2;
const ESTIMATE_USER_SCROLL_CANCEL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

type EstimateNavigationScrollLock = {
  targetSectionId: string;
  cleanup: () => void;
};

function releaseEstimateNavigationScrollLock(
  lockRef: { current: EstimateNavigationScrollLock | null },
) {
  const lock = lockRef.current;

  if (!lock) {
    return;
  }

  lock.cleanup();
  lockRef.current = null;
}

function pickActiveEstimateSectionByScrollLine(
  sections: HTMLElement[],
  activationLinePx: number,
): string {
  let activeId = sections[0]?.id ?? ESTIMATE_INITIAL_SECTION_ID;

  for (const section of sections) {
    if (section.getBoundingClientRect().top <= activationLinePx) {
      activeId = section.id;
    }
  }

  return activeId;
}

function getEstimateStepIndex(sectionId: string): number {
  return estimateNavigationItems.findIndex((item) => item.id === sectionId);
}

function formatEstimateStep(sectionId: string): string {
  const index = getEstimateStepIndex(sectionId);

  if (index < 0) {
    return "";
  }

  return `Шаг ${String(index + 1).padStart(2, "0")}`;
}

function withActiveEstimateSection(sectionId: string, activeSectionId: string, className: string): string {
  return activeSectionId === sectionId ? `${className} is-active` : className;
}

function EstimateNavigationIcon({ name }: { name: EstimateNavigationIcon }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "geometry":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="1.5" />
          <path d="M4 20 20 4" />
        </svg>
      );
    case "object":
      return (
        <svg {...commonProps}>
          <path d="M3 21h18" />
          <path d="M6 21V8l6-4 6 4v13" />
          <path d="M10 21v-5h4v5" />
        </svg>
      );
    case "warmFloor":
      return (
        <svg {...commonProps}>
          <path d="M3 10c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0" />
          <path d="M3 15c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0" />
        </svg>
      );
    case "flooring":
      return (
        <svg {...commonProps}>
          <path d="M12 3 2 8l10 5 10-5-10-5z" />
          <path d="M2 13l10 5 10-5" />
          <path d="M2 18l10 5 10-5" />
        </svg>
      );
    case "walls":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 3v18" />
        </svg>
      );
    case "ceiling":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M6 11h12" />
          <path d="M8 15h8" />
        </svg>
      );
    case "electric":
      return (
        <svg {...commonProps}>
          <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      );
    case "plumbing":
      return (
        <svg {...commonProps}>
          <path d="M12 3c3.5 3.5 5.5 6 5.5 9a5.5 5.5 0 1 1-11 0c0-3 2-5.5 5.5-9z" />
        </svg>
      );
    case "doors":
      return (
        <svg {...commonProps}>
          <path d="M4 20V6a2 2 0 0 1 2-2h8" />
          <path d="M14 4h4a2 2 0 0 1 2 2v14" />
          <path d="M2 20h20" />
        </svg>
      );
    case "completion":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "appliances":
      return (
        <svg {...commonProps}>
          <rect x="5" y="2" width="14" height="20" rx="1.5" />
          <path d="M5 10h14" />
        </svg>
      );
    case "furniture":
      return (
        <svg {...commonProps}>
          <path d="M19 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" />
          <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
          <path d="M5 18v2" />
          <path d="M19 18v2" />
        </svg>
      );
    case "cleaning":
      return (
        <svg {...commonProps}>
          <path d="M12 3v4" />
          <path d="m8 7 4-4 4 4" />
          <path d="M8 7v3l-3 9h14l-3-9V7" />
        </svg>
      );
    case "total":
      return (
        <svg {...commonProps}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
      );
  }
}

type EstimateObjectMeta = {
  address: string;
  complexName: string;
  apartmentNumber: string;
  contact: string;
};

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

type CompletionOptionsDraft = Omit<CompletionOptions, "kitchenLengthMeters"> & {
  kitchenLengthMeters: string;
};

type AppliancesOptionsDraft = Omit<AppliancesOptions, "items"> & {
  items: Record<ApplianceItemKey, { isIncluded: boolean; quantity: string }>;
};

type LooseFurnitureOptionsDraft = Omit<LooseFurnitureOptions, "items"> & {
  items: Record<LooseFurnitureItemKey, { isIncluded: boolean; quantity: string }>;
};

function createDefaultAppliancesOptionsDraft(): AppliancesOptionsDraft {
  const base = createDefaultAppliancesOptions();
  const items = {} as AppliancesOptionsDraft["items"];

  for (const item of applianceItemCatalog) {
    items[item.key] = {
      isIncluded: base.items[item.key].isIncluded,
      quantity: String(base.items[item.key].quantity),
    };
  }

  return { packageLevel: base.packageLevel, fridgeVariant: base.fridgeVariant, items };
}

function normalizeAppliancesOptionsDraft(draft: AppliancesOptionsDraft): AppliancesOptions {
  const items = {} as AppliancesOptions["items"];

  for (const item of applianceItemCatalog) {
    const itemDraft = draft.items[item.key];
    items[item.key] = {
      isIncluded: itemDraft.isIncluded,
      quantity: Math.max(1, parseEstimateInteger(itemDraft.quantity)),
    };
  }

  return { packageLevel: draft.packageLevel, fridgeVariant: draft.fridgeVariant, items };
}

function createDefaultLooseFurnitureOptionsDraft(): LooseFurnitureOptionsDraft {
  const base = createDefaultLooseFurnitureOptions();
  const items = {} as LooseFurnitureOptionsDraft["items"];

  for (const item of looseFurnitureItemCatalog) {
    items[item.key] = {
      isIncluded: base.items[item.key].isIncluded,
      quantity: String(base.items[item.key].quantity),
    };
  }

  return { packageLevel: base.packageLevel, items };
}

function normalizeLooseFurnitureOptionsDraft(draft: LooseFurnitureOptionsDraft): LooseFurnitureOptions {
  const items = {} as LooseFurnitureOptions["items"];

  for (const item of looseFurnitureItemCatalog) {
    const itemDraft = draft.items[item.key];
    items[item.key] = {
      isIncluded: itemDraft.isIncluded,
      quantity: Math.max(1, parseEstimateInteger(itemDraft.quantity)),
    };
  }

  return { packageLevel: draft.packageLevel, items };
}

const FLOORING_SPEC_COLLAPSED_LIMIT = 10;
const WALLS_SPEC_COLLAPSED_LIMIT = 10;
const CEILING_SPEC_COLLAPSED_LIMIT = 10;
const ELECTRIC_SPEC_COLLAPSED_LIMIT = 10;
const PLUMBING_SPEC_COLLAPSED_LIMIT = 10;
const DOORS_SPEC_COLLAPSED_LIMIT = 10;
const COMPLETION_SPEC_COLLAPSED_LIMIT = 10;
const APPLIANCES_SPEC_COLLAPSED_LIMIT = 10;
const LOOSE_FURNITURE_SPEC_COLLAPSED_LIMIT = 10;
const HOME_GOODS_SPEC_COLLAPSED_LIMIT = 10;

const initialRooms: EstimateRoomDraft[] = [
  { id: "hallway", name: "Прихожая", type: "hallway", area: "6.5", doorCount: "1", windowCount: "0" },
  { id: "kitchen", name: "Кухня", type: "kitchen", area: "12", doorCount: "1", windowCount: "1" },
  { id: "living-room", name: "Комната", type: "living_room", area: "18", doorCount: "1", windowCount: "1" },
  { id: "bathroom", name: "Санузел", type: "bathroom", area: "4.3", doorCount: "1", windowCount: "0" },
  { id: "balcony", name: "Балкон", type: "balcony", area: "2.2", doorCount: "1", windowCount: "1" },
];

function normalizeRoom(room: EstimateRoomDraft): EstimateRoomInput {
  const normalizedDraft = normalizeEstimateRoomDraft(room);

  return {
    ...normalizedDraft,
    area: parseEstimateDecimal(normalizedDraft.area),
    doorCount: parseEstimateDecimal(normalizedDraft.doorCount),
    windowCount: parseEstimateDecimal(normalizedDraft.windowCount),
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

function createEstimateRoom(existingRooms: EstimateRoomDraft[]): EstimateRoomDraft {
  return normalizeEstimateRoomDraft({
    id: `room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: buildNewRoomName(existingRooms),
    type: "other",
    area: "",
    doorCount: "1",
    windowCount: "0",
  });
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
  const [objectMeta, setObjectMeta] = useState<EstimateObjectMeta>({
    address: "",
    complexName: "",
    apartmentNumber: "",
    contact: "",
  });
  const [ceilingHeightInput, setCeilingHeightInput] = useState("2.7");
  const [rooms, setRooms] = useState<EstimateRoomDraft[]>(() => initialRooms.map(normalizeEstimateRoomDraft));
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
  const [doorOptions, setDoorOptions] = useState<DoorOptions>({
    packageType: "invisible_19000",
    includeHandles: true,
    includePrivacyLocks: true,
    includeLogistics: true,
    includeInstallation: true,
  });
  const [completionOptions, setCompletionOptions] = useState<CompletionOptionsDraft>({
    includeKitchenBase: false,
    kitchenLengthMeters: "5",
    includeKitchenAppliancePenal: false,
    includeKitchenFridgePenal: false,
    includeWardrobe: false,
    includeBathroomFurniture: false,
  });
  const [appliancesOptions, setAppliancesOptions] = useState<AppliancesOptionsDraft>(() =>
    createDefaultAppliancesOptionsDraft(),
  );
  const [looseFurnitureOptions, setLooseFurnitureOptions] = useState<LooseFurnitureOptionsDraft>(() =>
    createDefaultLooseFurnitureOptionsDraft(),
  );
  const [homeGoodsOptions, setHomeGoodsOptions] = useState<HomeGoodsOptions>(() => createDefaultHomeGoodsOptions());
  const [isFlooringSpecExpanded, setIsFlooringSpecExpanded] = useState(false);
  const [isWallsSpecExpanded, setIsWallsSpecExpanded] = useState(false);
  const [isCeilingSpecExpanded, setIsCeilingSpecExpanded] = useState(false);
  const [isElectricSpecExpanded, setIsElectricSpecExpanded] = useState(false);
  const [isPlumbingSpecExpanded, setIsPlumbingSpecExpanded] = useState(false);
  const [isDoorsSpecExpanded, setIsDoorsSpecExpanded] = useState(false);
  const [isCompletionSpecExpanded, setIsCompletionSpecExpanded] = useState(false);
  const [isAppliancesSpecExpanded, setIsAppliancesSpecExpanded] = useState(false);
  const [isLooseFurnitureSpecExpanded, setIsLooseFurnitureSpecExpanded] = useState(false);
  const [isHomeGoodsSpecExpanded, setIsHomeGoodsSpecExpanded] = useState(false);
  const [isMobileVolumesExpanded, setIsMobileVolumesExpanded] = useState(false);
  const [activeEstimateSection, setActiveEstimateSection] = useState(ESTIMATE_INITIAL_SECTION_ID);
  const estimateRailScrollRef = useRef<HTMLElement>(null);
  const navigationScrollTargetRef = useRef<EstimateNavigationScrollLock | null>(null);
  const pendingAddedRoomIdRef = useRef<string | null>(null);
  const geometryRemoveTimeoutsRef = useRef<Record<string, number>>({});
  const [enteringRoomIds, setEnteringRoomIds] = useState<string[]>([]);
  const [removingRoomIds, setRemovingRoomIds] = useState<string[]>([]);

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
          plinthLength: roomGeometries[index]?.plinthLength ?? 0,
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
  const doorRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => ({
        roomId: room.id,
        roomName: room.name.trim() || "Помещение",
        roomType: room.type,
        area: roomInputs[index]?.area ?? 0,
        doorCount: roomInputs[index]?.doorCount ?? 0,
      })),
    [roomInputs, rooms],
  );
  const doorsResult = useMemo(() => calculateDoors(doorRoomInputs, doorOptions), [doorOptions, doorRoomInputs]);
  const completionResult = useMemo(
    () =>
      calculateCompletion({
        ...completionOptions,
        kitchenLengthMeters: parseEstimateDecimal(completionOptions.kitchenLengthMeters),
      }),
    [completionOptions],
  );
  const normalizedAppliancesOptions = useMemo(
    () => normalizeAppliancesOptionsDraft(appliancesOptions),
    [appliancesOptions],
  );
  const normalizedLooseFurnitureOptions = useMemo(
    () => normalizeLooseFurnitureOptionsDraft(looseFurnitureOptions),
    [looseFurnitureOptions],
  );
  const appliancesResult = useMemo(
    () => calculateAppliances(normalizedAppliancesOptions),
    [normalizedAppliancesOptions],
  );
  const looseFurnitureResult = useMemo(
    () => calculateLooseFurniture(normalizedLooseFurnitureOptions),
    [normalizedLooseFurnitureOptions],
  );
  const homeGoodsResult = useMemo(
    () => calculateHomeGoods({ floorArea: totals.floorArea, options: homeGoodsOptions }),
    [homeGoodsOptions, totals.floorArea],
  );
  const estimateResult = useMemo(() => {
    const sections = [
      ...(warmFloorResult.selectedArea > 0 ? [warmFloorResult.section] : []),
      ...(flooringResult.flooringArea > 0 ? [flooringResult.section] : []),
      ...(wallsResult.wallFinishArea > 0 ? [wallsResult.section] : []),
      ...(ceilingResult.ceilingArea > 0 ? [ceilingResult.section] : []),
      ...(electricResult.section.items.length > 0 ? [electricResult.section] : []),
      ...(plumbingResult.section.items.length > 0 ? [plumbingResult.section] : []),
      ...(doorsResult.section.items.length > 0 ? [doorsResult.section] : []),
      ...(completionResult.section.items.length > 0 ? [completionResult.section] : []),
      ...(appliancesResult.section.items.length > 0 ? [appliancesResult.section] : []),
      ...(looseFurnitureResult.section.items.length > 0 ? [looseFurnitureResult.section] : []),
      ...(homeGoodsResult.section.items.length > 0 ? [homeGoodsResult.section] : []),
    ];

    return {
      sections,
      totals: calculateEstimateTotals(sections, totals.floorArea),
    };
  }, [
    appliancesResult,
    looseFurnitureResult,
    homeGoodsResult,
    ceilingResult,
    completionResult,
    doorsResult,
    electricResult,
    flooringResult,
    plumbingResult,
    totals.floorArea,
    wallsResult,
    warmFloorResult,
  ]);

  const summaryItems = [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(totals.plinthLength, "м") },
  ];
  const compactVolumeItems = summaryItems.filter((item) =>
    ["Площадь пола", "Стены к отделке", "Потолки"].includes(item.label),
  );
  const estimateTotalItems = [
    { label: "Работы", value: formatMoney(estimateResult.totals.works) },
    { label: "Материалы", value: formatMoney(estimateResult.totals.materials) },
    { label: "Оборудование", value: formatMoney(estimateResult.totals.equipment) },
    { label: "Расходники", value: formatMoney(estimateResult.totals.consumables) },
    { label: "Итого", value: formatMoney(estimateResult.totals.total), isStrong: true },
    { label: "₽/м²", value: `${formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²` },
  ];
  const packageClassification = classifyEstimatePackage(estimateResult.totals.pricePerSquareMeter);
  const scrollToEstimateSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    releaseEstimateNavigationScrollLock(navigationScrollTargetRef);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const activationLinePx = getEstimateScrollActivationLinePx();
    const targetTop = Math.max(0, section.getBoundingClientRect().top + window.scrollY - activationLinePx);

    setActiveEstimateSection(sectionId);

    const cleanups: Array<() => void> = [];
    let released = false;

    const releaseLock = () => {
      if (released) {
        return;
      }

      released = true;
      cleanups.forEach((cleanup) => cleanup());

      if (navigationScrollTargetRef.current?.targetSectionId === sectionId) {
        navigationScrollTargetRef.current = null;
      }
    };

    const cancelLockForUserScroll = () => {
      releaseLock();
    };

    const handleUserScrollKeydown = (event: KeyboardEvent) => {
      if (ESTIMATE_USER_SCROLL_CANCEL_KEYS.has(event.key)) {
        cancelLockForUserScroll();
      }
    };

    window.addEventListener("wheel", cancelLockForUserScroll, { passive: true });
    window.addEventListener("touchstart", cancelLockForUserScroll, { passive: true });
    window.addEventListener("keydown", handleUserScrollKeydown);
    cleanups.push(() => {
      window.removeEventListener("wheel", cancelLockForUserScroll);
      window.removeEventListener("touchstart", cancelLockForUserScroll);
      window.removeEventListener("keydown", handleUserScrollKeydown);
    });

    const onScrollEnd = () => {
      releaseLock();
    };

    const scrollEndSupported = "onscrollend" in window;

    if (scrollEndSupported) {
      window.addEventListener("scrollend", onScrollEnd, { once: true });
      cleanups.push(() => window.removeEventListener("scrollend", onScrollEnd));
    } else {
      let lastScrollY = window.scrollY;
      let stableFrames = 0;
      let stabilizeFrameId = 0;

      const checkScrollStable = () => {
        if (released) {
          return;
        }

        const currentScrollY = window.scrollY;

        if (Math.abs(currentScrollY - lastScrollY) <= ESTIMATE_SCROLL_STABILIZE_PX) {
          stableFrames += 1;

          if (stableFrames >= ESTIMATE_SCROLL_STABILIZE_FRAMES) {
            releaseLock();
            return;
          }
        } else {
          stableFrames = 0;
          lastScrollY = currentScrollY;
        }

        stabilizeFrameId = window.requestAnimationFrame(checkScrollStable);
      };

      stabilizeFrameId = window.requestAnimationFrame(checkScrollStable);
      cleanups.push(() => {
        if (stabilizeFrameId) {
          window.cancelAnimationFrame(stabilizeFrameId);
        }
      });
    }

    const maxLockMs = prefersReducedMotion
      ? ESTIMATE_PROGRAMMATIC_SCROLL_REDUCED_MOTION_MAX_MS
      : ESTIMATE_PROGRAMMATIC_SCROLL_MAX_MS;
    const timeoutId = window.setTimeout(releaseLock, maxLockMs);

    cleanups.push(() => window.clearTimeout(timeoutId));

    navigationScrollTargetRef.current = {
      targetSectionId: sectionId,
      cleanup: releaseLock,
    };

    window.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (prefersReducedMotion) {
      window.requestAnimationFrame(() => {
        releaseLock();
      });
    }
  }, []);

  const isEstimatePageBottom = useCallback(() => {
    return (
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - ESTIMATE_PAGE_BOTTOM_THRESHOLD_PX
    );
  }, []);

  useEffect(() => {
    const sections = ESTIMATE_SCROLL_SPY_SECTION_IDS.map((sectionId) => document.getElementById(sectionId)).filter(
      (section): section is HTMLElement => Boolean(section),
    );

    if (!sections.length) {
      return;
    }

    let frameId = 0;

    const updateActiveSection = () => {
      const navigationScrollTarget = navigationScrollTargetRef.current;

      if (navigationScrollTarget) {
        setActiveEstimateSection((current) =>
          current === navigationScrollTarget.targetSectionId
            ? current
            : navigationScrollTarget.targetSectionId,
        );
        return;
      }

      if (isEstimatePageBottom()) {
        setActiveEstimateSection((current) => (current === "estimate-costs" ? current : "estimate-costs"));
        return;
      }

      const nextSectionId = pickActiveEstimateSectionByScrollLine(
        sections,
        getEstimateScrollActivationLinePx(),
      );

      setActiveEstimateSection((current) => (current === nextSectionId ? current : nextSectionId));
    };

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      releaseEstimateNavigationScrollLock(navigationScrollTargetRef);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isEstimatePageBottom]);

  useEffect(() => {
    const railScroll = estimateRailScrollRef.current;

    if (!railScroll) {
      return;
    }

    const activeLink = railScroll.querySelector<HTMLAnchorElement>(`a[href="#${activeEstimateSection}"]`);

    if (!activeLink) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const isHorizontalRail = window.matchMedia("(max-width: 1180px)").matches;

    if (isHorizontalRail) {
      activeLink.scrollIntoView({
        behavior: scrollBehavior,
        block: "nearest",
        inline: "center",
      });
      return;
    }

    const railRect = railScroll.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const edgePadding = 10;

    if (linkRect.top >= railRect.top + edgePadding && linkRect.bottom <= railRect.bottom - edgePadding) {
      return;
    }

    const linkTop = linkRect.top - railRect.top + railScroll.scrollTop;
    const targetTop = linkTop - (railScroll.clientHeight - activeLink.offsetHeight) / 2;

    railScroll.scrollTo({
      top: Math.max(0, targetTop),
      behavior: scrollBehavior,
    });
  }, [activeEstimateSection]);

  useEffect(() => {
    return () => {
      Object.values(geometryRemoveTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useLayoutEffect(() => {
    if (!enteringRoomIds.length) {
      return;
    }

    if (prefersReducedEstimateMotion()) {
      setEnteringRoomIds([]);
      return;
    }

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        setEnteringRoomIds([]);
      });
    });

    return () => {
      if (outerFrame) {
        window.cancelAnimationFrame(outerFrame);
      }

      if (innerFrame) {
        window.cancelAnimationFrame(innerFrame);
      }
    };
  }, [enteringRoomIds]);

  useEffect(() => {
    const roomId = pendingAddedRoomIdRef.current;

    if (!roomId) {
      return;
    }

    const row = document.querySelector<HTMLElement>(`[data-estimate-room-id="${roomId}"]`);

    if (!row) {
      return;
    }

    pendingAddedRoomIdRef.current = null;

    const nameInput = row.querySelector<HTMLInputElement>(".public-estimate-room-name input");
    const prefersReducedMotion = prefersReducedEstimateMotion();

    nameInput?.focus({ preventScroll: true });
    nameInput?.select();
    row.scrollIntoView({
      block: prefersReducedMotion ? "nearest" : "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [rooms]);

  useEffect(() => {
    const railScroll = estimateRailScrollRef.current;

    if (!railScroll) {
      return;
    }

    const horizontalRailQuery = window.matchMedia("(max-width: 1180px)");
    let dragPointerId: number | null = null;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let dragMoved = false;
    let suppressLinkClickUntil = 0;

    const isHorizontalRail = () => horizontalRailQuery.matches;

    const canScrollHorizontally = () => railScroll.scrollWidth > railScroll.clientWidth + 1;

    const handleWheel = (event: WheelEvent) => {
      if (!isHorizontalRail() || !canScrollHorizontally()) {
        return;
      }

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

      if (delta === 0) {
        return;
      }

      railScroll.scrollLeft += delta;
      event.preventDefault();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isHorizontalRail() || event.button !== 0 || !canScrollHorizontally()) {
        return;
      }

      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScrollLeft = railScroll.scrollLeft;
      dragMoved = false;
      railScroll.classList.add("is-dragging");
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      const deltaX = event.clientX - dragStartX;

      if (Math.abs(deltaX) > 4) {
        dragMoved = true;
      }

      railScroll.scrollLeft = dragStartScrollLeft - deltaX;
    };

    const finishDrag = (event: PointerEvent) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      if (dragMoved) {
        suppressLinkClickUntil = Date.now() + 300;
      }

      dragPointerId = null;
      dragMoved = false;
      railScroll.classList.remove("is-dragging");
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (Date.now() < suppressLinkClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    railScroll.addEventListener("wheel", handleWheel, { passive: false });
    railScroll.addEventListener("pointerdown", handlePointerDown);
    railScroll.addEventListener("pointermove", handlePointerMove);
    railScroll.addEventListener("pointerup", finishDrag);
    railScroll.addEventListener("pointercancel", finishDrag);
    railScroll.addEventListener("click", handleClickCapture, true);

    return () => {
      railScroll.removeEventListener("wheel", handleWheel);
      railScroll.removeEventListener("pointerdown", handlePointerDown);
      railScroll.removeEventListener("pointermove", handlePointerMove);
      railScroll.removeEventListener("pointerup", finishDrag);
      railScroll.removeEventListener("pointercancel", finishDrag);
      railScroll.removeEventListener("click", handleClickCapture, true);
      railScroll.classList.remove("is-dragging");
    };
  }, []);

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
    { label: "Площадь материалов", value: formatMeasurement(flooringResult.purchaseArea, "м²") },
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
    { label: "Площадь материалов", value: formatMeasurement(wallsResult.purchaseArea, "м²") },
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
  const doorCompositionItems = [
    { label: "Дверей", value: `${doorsResult.totalDoorCount} шт.` },
    { label: "Санузловых заверток", value: `${doorsResult.privacyLockCount} шт.` },
    { label: "Пакет", value: doorsResult.packageLabel },
    { label: "Монтаж", value: doorOptions.includeInstallation ? "да" : "нет" },
    { label: "Логистика", value: doorOptions.includeLogistics ? "да" : "нет" },
  ];
  const doorSummaryItems = [
    { label: "Двери", value: `${doorsResult.totalDoorCount} шт.` },
    { label: "Ручки", value: `${doorsResult.handleCount} шт.` },
    { label: "Завертки", value: `${doorsResult.privacyLockCount} шт.` },
    { label: "Доставка / подъём", value: formatMoney(doorsResult.logisticsTotal) },
    { label: "Работы", value: formatMoney(doorsResult.worksTotal) },
    { label: "Материалы", value: formatMoney(doorsResult.materialsTotal) },
    { label: "Фурнитура", value: formatMoney(doorsResult.hardwareTotal) },
    { label: "Доп. расходы", value: formatMoney(doorsResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(doorsResult.total), isStrong: true },
  ];
  const doorSpecItems = doorsResult.section.items;
  const isDoorsSpecLong = doorSpecItems.length > DOORS_SPEC_COLLAPSED_LIMIT;
  const visibleDoorSpecItems =
    isDoorsSpecLong && !isDoorsSpecExpanded
      ? doorSpecItems.slice(0, DOORS_SPEC_COLLAPSED_LIMIT)
      : doorSpecItems;
  const hiddenDoorsSpecCount = Math.max(0, doorSpecItems.length - visibleDoorSpecItems.length);
  const completionSummaryItems = [
    { label: "Кухня", value: formatMoney(completionResult.kitchenTotal) },
    { label: "Мебель", value: formatMoney(completionResult.furnitureTotal) },
    { label: "Компонентов включено", value: `${completionResult.includedComponentCount} шт.` },
    { label: "Итого", value: formatMoney(completionResult.total), isStrong: true },
  ];
  const completionSpecItems = completionResult.section.items;
  const isCompletionSpecLong = completionSpecItems.length > COMPLETION_SPEC_COLLAPSED_LIMIT;
  const visibleCompletionSpecItems =
    isCompletionSpecLong && !isCompletionSpecExpanded
      ? completionSpecItems.slice(0, COMPLETION_SPEC_COLLAPSED_LIMIT)
      : completionSpecItems;
  const hiddenCompletionSpecCount = Math.max(0, completionSpecItems.length - visibleCompletionSpecItems.length);
  const appliancesSummaryItems = [
    { label: "Пакет", value: appliancesResult.packageLabel },
    { label: "Позиции включены", value: `${appliancesResult.includedItemCount} шт.` },
    { label: "Кухонная техника", value: formatMoney(appliancesResult.kitchenAppliancesTotal) },
    { label: "TV-зона", value: formatMoney(appliancesResult.tvTotal) },
    { label: "Стирка", value: formatMoney(appliancesResult.laundryTotal) },
    { label: "Итого", value: formatMoney(appliancesResult.total), isStrong: true },
  ];
  const appliancesSpecItems = appliancesResult.section.items;
  const isAppliancesSpecLong = appliancesSpecItems.length > APPLIANCES_SPEC_COLLAPSED_LIMIT;
  const visibleAppliancesSpecItems =
    isAppliancesSpecLong && !isAppliancesSpecExpanded
      ? appliancesSpecItems.slice(0, APPLIANCES_SPEC_COLLAPSED_LIMIT)
      : appliancesSpecItems;
  const hiddenAppliancesSpecCount = Math.max(0, appliancesSpecItems.length - visibleAppliancesSpecItems.length);
  const looseFurnitureSummaryItems = [
    { label: "Пакет", value: looseFurnitureResult.packageLabel },
    { label: "Позиции включены", value: `${looseFurnitureResult.includedItemCount} шт.` },
    { label: looseFurnitureGroupLabels.dining, value: formatMoney(looseFurnitureResult.diningTotal) },
    { label: looseFurnitureGroupLabels.living, value: formatMoney(looseFurnitureResult.livingTotal) },
    { label: looseFurnitureGroupLabels.bedroom, value: formatMoney(looseFurnitureResult.bedroomTotal) },
    { label: looseFurnitureGroupLabels.loggia, value: formatMoney(looseFurnitureResult.loggiaTotal) },
    { label: looseFurnitureGroupLabels.work, value: formatMoney(looseFurnitureResult.workTotal) },
    { label: looseFurnitureGroupLabels.storage, value: formatMoney(looseFurnitureResult.storageTotal) },
    { label: looseFurnitureGroupLabels.hall, value: formatMoney(looseFurnitureResult.hallTotal) },
    { label: "Итого", value: formatMoney(looseFurnitureResult.total), isStrong: true },
  ];
  const looseFurnitureSpecItems = looseFurnitureResult.section.items;
  const isLooseFurnitureSpecLong = looseFurnitureSpecItems.length > LOOSE_FURNITURE_SPEC_COLLAPSED_LIMIT;
  const visibleLooseFurnitureSpecItems =
    isLooseFurnitureSpecLong && !isLooseFurnitureSpecExpanded
      ? looseFurnitureSpecItems.slice(0, LOOSE_FURNITURE_SPEC_COLLAPSED_LIMIT)
      : looseFurnitureSpecItems;
  const hiddenLooseFurnitureSpecCount = Math.max(
    0,
    looseFurnitureSpecItems.length - visibleLooseFurnitureSpecItems.length,
  );
  const homeGoodsSummaryItems = [
    { label: "Уборка", value: formatMoney(homeGoodsResult.cleaningTotal) },
    { label: "Товары для дома", value: formatMoney(homeGoodsResult.homeGoodsTotal) },
    { label: "Пакет", value: homeGoodsResult.packageLabel },
    { label: "Итого", value: formatMoney(homeGoodsResult.total), isStrong: true },
  ];
  const homeGoodsSpecItems = homeGoodsResult.section.items;
  const isHomeGoodsSpecLong = homeGoodsSpecItems.length > HOME_GOODS_SPEC_COLLAPSED_LIMIT;
  const visibleHomeGoodsSpecItems =
    isHomeGoodsSpecLong && !isHomeGoodsSpecExpanded
      ? homeGoodsSpecItems.slice(0, HOME_GOODS_SPEC_COLLAPSED_LIMIT)
      : homeGoodsSpecItems;
  const hiddenHomeGoodsSpecCount = Math.max(0, homeGoodsSpecItems.length - visibleHomeGoodsSpecItems.length);

  function updateRoom(roomId: string, patch: Partial<EstimateRoomDraft>) {
    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.id !== roomId) {
          return room;
        }

        const nextRoom = normalizeEstimateRoomDraft({ ...room, ...patch });

        if ("name" in patch) {
          const inferredType = inferRoomTypeFromName(nextRoom.name);

          if (inferredType !== null) {
            nextRoom.type = inferredType;
          }
        }

        return nextRoom;
      }),
    );
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

  function updateDoorOptions(patch: Partial<DoorOptions>) {
    setDoorOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateCompletionOptions(patch: Partial<CompletionOptionsDraft>) {
    setCompletionOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateAppliancesOptions(patch: Partial<Pick<AppliancesOptions, "packageLevel" | "fridgeVariant">>) {
    setAppliancesOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateApplianceItem(key: ApplianceItemKey, patch: Partial<{ isIncluded: boolean; quantity: string }>) {
    setAppliancesOptions((currentOptions) => ({
      ...currentOptions,
      items: {
        ...currentOptions.items,
        [key]: {
          ...currentOptions.items[key],
          ...patch,
        },
      },
    }));
  }

  function updateLooseFurnitureOptions(patch: Partial<Pick<LooseFurnitureOptions, "packageLevel">>) {
    setLooseFurnitureOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateLooseFurnitureItem(
    key: LooseFurnitureItemKey,
    patch: Partial<{ isIncluded: boolean; quantity: string }>,
  ) {
    setLooseFurnitureOptions((currentOptions) => ({
      ...currentOptions,
      items: {
        ...currentOptions.items,
        [key]: {
          ...currentOptions.items[key],
          ...patch,
        },
      },
    }));
  }

  function updateHomeGoodsOptions(patch: Partial<HomeGoodsOptions>) {
    setHomeGoodsOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function handlePrintEstimate() {
    window.print();
  }

  function handlePrintVolumes() {
    document.body.classList.add("public-estimate-print-volumes");

    const cleanup = () => {
      document.body.classList.remove("public-estimate-print-volumes");
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }

  function purgeRoomFromRelatedState(roomId: string) {
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

  function finalizeRoomRemove(roomId: string) {
    setRooms((currentRooms) =>
      currentRooms.length > 1 ? currentRooms.filter((room) => room.id !== roomId) : currentRooms,
    );
    purgeRoomFromRelatedState(roomId);
    setRemovingRoomIds((current) => current.filter((id) => id !== roomId));
    delete geometryRemoveTimeoutsRef.current[roomId];
  }

  function addRoom() {
    let newRoomId = "";

    setRooms((currentRooms) => {
      const newRoom = createEstimateRoom(currentRooms);

      newRoomId = newRoom.id;
      pendingAddedRoomIdRef.current = newRoom.id;

      return [...currentRooms, newRoom];
    });

    if (!prefersReducedEstimateMotion() && newRoomId) {
      setEnteringRoomIds((current) => (current.includes(newRoomId) ? current : [...current, newRoomId]));
    }
  }

  function removeRoom(roomId: string) {
    if (rooms.length <= 1 || removingRoomIds.includes(roomId)) {
      return;
    }

    const removeDelayMs = getGeometryRowRemoveDelayMs();

    if (removeDelayMs === 0) {
      finalizeRoomRemove(roomId);
      return;
    }

    setRemovingRoomIds((current) => (current.includes(roomId) ? current : [...current, roomId]));

    geometryRemoveTimeoutsRef.current[roomId] = window.setTimeout(() => {
      finalizeRoomRemove(roomId);
    }, removeDelayMs);
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

      <section className="public-estimate public-estimate-workbench" aria-labelledby="public-estimate-title">
        <aside className="public-estimate-rail" aria-label="Навигация по разделам расчёта">
          <div className="public-estimate-rail-head">
            <span>Калькулятор</span>
            <strong>Разделы расчёта</strong>
          </div>

          <nav className="public-estimate-rail-nav" aria-label="Разделы расчёта" ref={estimateRailScrollRef}>
            <ol className="public-estimate-rail-list">
              {estimateNavigationItems.map((item, index) => {
                const isActive = activeEstimateSection === item.id;
                const stepLabel = String(index + 1).padStart(2, "0");

                return (
                  <li className="public-estimate-rail-item" key={item.id}>
                    <a
                      className={`public-estimate-rail-link${isActive ? " is-active" : ""}`}
                      href={`#${item.id}`}
                      aria-current={isActive ? "location" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToEstimateSection(item.id);
                      }}
                    >
                      <span className="public-estimate-rail-icon">
                        <EstimateNavigationIcon name={item.icon} />
                      </span>
                      <span className="public-estimate-rail-copy">
                        <span className="public-estimate-rail-step">{stepLabel}</span>
                        <span className="public-estimate-rail-label">{item.label}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="public-estimate-geometry-compact" aria-label="Ключевые объёмы объекта">
            <div className="public-estimate-geometry-compact-row">
              {compactVolumeItems.map((item) => (
                <div className="public-estimate-geometry-compact-metric" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
              <button
                className="public-estimate-geometry-compact-toggle"
                type="button"
                aria-expanded={isMobileVolumesExpanded}
                onClick={() => setIsMobileVolumesExpanded((expanded) => !expanded)}
              >
                {isMobileVolumesExpanded ? "Свернуть" : "Все объёмы"}
              </button>
            </div>

            {isMobileVolumesExpanded ? (
              <dl className="public-estimate-geometry-compact-full">
                {summaryItems.map((item) => (
                  <div className="public-estimate-geometry-compact-item" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <button
              className="public-estimate-geometry-compact-print"
              type="button"
              onClick={handlePrintVolumes}
            >
              Скачать объёмы
            </button>
          </div>
        </aside>

        <div className="public-estimate-card public-estimate-card-main">
          <div className="public-estimate-intro">
            <p className="public-section-kicker">Калькулятор ремонта</p>
            <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
            <p className="public-estimate-subtitle">
              Задайте помещения и параметры объекта — геометрия и итоги обновляются автоматически по мере заполнения
              разделов.
            </p>
          </div>

          <section
            id="estimate-object"
            className={withActiveEstimateSection("estimate-object", activeEstimateSection, "public-estimate-object")}
            aria-labelledby="public-estimate-object-title"
          >
            <div className="public-estimate-object-head">
              <div>
                <span>{formatEstimateStep("estimate-object")}</span>
                <h2 id="public-estimate-object-title">Объект</h2>
              </div>
            </div>

            <div className="public-estimate-object-form">
              <label className="public-estimate-field">
                <span>Адрес объекта</span>
                <input
                  className="public-estimate-input"
                  value={objectMeta.address}
                  {...estimateTextFieldProps}
                  onChange={(event) =>
                    setObjectMeta((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </label>

              <label className="public-estimate-field">
                <span>Название ЖК</span>
                <input
                  className="public-estimate-input"
                  placeholder="Необязательно"
                  value={objectMeta.complexName}
                  {...estimateTextFieldProps}
                  onChange={(event) =>
                    setObjectMeta((current) => ({ ...current, complexName: event.target.value }))
                  }
                />
              </label>

              <label className="public-estimate-field">
                <span>Номер квартиры</span>
                <input
                  className="public-estimate-input"
                  value={objectMeta.apartmentNumber}
                  {...estimateTextFieldProps}
                  onChange={(event) =>
                    setObjectMeta((current) => ({ ...current, apartmentNumber: event.target.value }))
                  }
                />
              </label>

              <label className="public-estimate-field public-estimate-object-contact">
                <span>Контакт</span>
                <input
                  className="public-estimate-input"
                  placeholder="Телефон или имя + телефон"
                  value={objectMeta.contact}
                  {...estimateTextFieldProps}
                  onChange={(event) =>
                    setObjectMeta((current) => ({ ...current, contact: event.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          <section
            id="estimate-geometry"
            className={withActiveEstimateSection(
              "estimate-geometry",
              activeEstimateSection,
              "public-estimate-geometry",
            )}
            aria-labelledby="public-estimate-geometry-title"
          >
            <div className="public-estimate-geometry-head">
              <span>{formatEstimateStep("estimate-geometry")}</span>
              <div className="public-estimate-geometry-title-row">
                <h2 id="public-estimate-geometry-title">Помещения и объём</h2>
                <span className="public-estimate-geometry-hint">{GEOMETRY_STEP_HINT}</span>
              </div>
            </div>

            <div className="public-estimate-geometry-toolbar">
              <label className="public-estimate-field public-estimate-ceiling-field">
                <span>Высота потолков, м</span>
                <input
                  className="public-estimate-input"
                  inputMode="decimal"
                  value={ceilingHeightInput}
                  {...estimateNumericFieldProps}
                  onChange={(event) => setCeilingHeightInput(sanitizeEstimateDecimalInput(event.target.value))}
                  onBlur={(event) => setCeilingHeightInput(normalizeEstimateCeilingHeightOnBlur(event.target.value))}
                />
              </label>
            </div>

            <div className="public-estimate-room-header" aria-hidden="true">
              <span>№</span>
              <span>Помещение</span>
              <span className="public-estimate-room-header-metric">Площадь</span>
              <span className="public-estimate-room-header-count">Двери</span>
              <span className="public-estimate-room-header-count">Окна</span>
              <span>Стены к отделке</span>
              <span />
            </div>

            <div className="public-estimate-room-list" aria-label="Список помещений">
              {roomGeometries.map((room, index) => {
                const roomDraft = rooms[index];
                const isEntering = enteringRoomIds.includes(room.id);
                const isRemoving = removingRoomIds.includes(room.id);
                const rowShellClassName = [
                  "public-estimate-geometry-row-shell",
                  isEntering ? "is-entering" : "",
                  isRemoving ? "is-removing" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div className={rowShellClassName} key={room.id}>
                    <div className="public-estimate-geometry-row-shell-inner">
                      <article
                        className="public-estimate-room-row public-estimate-geometry-row"
                        data-estimate-room-id={room.id}
                      >
                        <div className="public-estimate-room-top">
                          <div className="public-estimate-room-index" aria-hidden="true">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <label className="public-estimate-field public-estimate-room-name">
                            <span className="public-estimate-mobile-label">Помещение</span>
                            <input
                              aria-label="Помещение"
                              className="public-estimate-input"
                              placeholder="Название по БТИ"
                              value={roomDraft.name}
                              onChange={(event) => updateRoom(room.id, { name: event.target.value })}
                            />
                          </label>

                          <button
                            aria-label="Удалить помещение"
                            className="public-estimate-row-remove"
                            type="button"
                            disabled={rooms.length <= 1 || isRemoving}
                            onClick={() => removeRoom(room.id)}
                          >
                            ×
                          </button>
                        </div>

                        <div className="public-estimate-room-main">
                          <div className="public-estimate-room-metrics">
                            <label className="public-estimate-field public-estimate-room-area">
                              <span className="public-estimate-mobile-label">Площадь</span>
                              <input
                                aria-label="Площадь помещения"
                                className="public-estimate-input"
                                inputMode="decimal"
                                value={roomDraft.area}
                                {...estimateNumericFieldProps}
                                onChange={(event) =>
                                  updateRoom(room.id, { area: sanitizeEstimateDecimalInput(event.target.value) })
                                }
                                onBlur={(event) =>
                                  updateRoom(room.id, { area: normalizeEstimateDecimalOnBlur(event.target.value) })
                                }
                              />
                            </label>

                            <label className="public-estimate-field public-estimate-room-doors">
                              <span className="public-estimate-mobile-label">Двери</span>
                              <input
                                aria-label="Количество дверей"
                                className="public-estimate-input"
                                inputMode="numeric"
                                value={roomDraft.doorCount}
                                {...estimateNumericFieldProps}
                                onChange={(event) =>
                                  updateRoom(room.id, { doorCount: sanitizeEstimateIntegerInput(event.target.value) })
                                }
                                onBlur={(event) =>
                                  updateRoom(room.id, { doorCount: normalizeEstimateCountOnBlur(event.target.value) })
                                }
                              />
                            </label>

                            <label className="public-estimate-field public-estimate-room-windows">
                              <span className="public-estimate-mobile-label">Окна</span>
                              <input
                                aria-label="Количество окон"
                                className="public-estimate-input"
                                inputMode="numeric"
                                value={roomDraft.windowCount}
                                {...estimateNumericFieldProps}
                                onChange={(event) =>
                                  updateRoom(room.id, { windowCount: sanitizeEstimateIntegerInput(event.target.value) })
                                }
                                onBlur={(event) =>
                                  updateRoom(room.id, { windowCount: normalizeEstimateCountOnBlur(event.target.value) })
                                }
                              />
                            </label>
                          </div>

                          <div className="public-estimate-room-result">
                            <span className="public-estimate-mobile-label">Стены к отделке</span>
                            <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="public-estimate-geometry-footer">
              <button className="public-estimate-small-action" type="button" onClick={addRoom}>
                Добавить помещение
              </button>
            </div>
          </section>

          <section
            id="estimate-warm-floor"
            className={withActiveEstimateSection(
              "estimate-warm-floor",
              activeEstimateSection,
              "public-estimate-warm-floor",
            )}
            aria-labelledby="public-estimate-warm-floor-title"
          >
            <div className="public-estimate-warm-floor-head">
              <div>
                <span>{formatEstimateStep("estimate-warm-floor")}</span>
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
                        {...estimateNumericFieldProps}
                        onChange={(event) =>
                          updateWarmFloorRoom(room.id, {
                            warmFloorArea: sanitizeEstimateDecimalInput(event.target.value),
                          })
                        }
                        onBlur={(event) =>
                          updateWarmFloorRoom(room.id, {
                            warmFloorArea: normalizeEstimateDecimalOnBlur(event.target.value),
                          })
                        }
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

          <section
            id="estimate-flooring"
            className={withActiveEstimateSection("estimate-flooring", activeEstimateSection, "public-estimate-flooring")}
            aria-labelledby="public-estimate-flooring-title"
          >
            <div className="public-estimate-flooring-head">
              <div>
                <span>{formatEstimateStep("estimate-flooring")}</span>
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
                    {...estimateNumericFieldProps}
                    onChange={(event) =>
                      updateFlooringOptions({ thresholdCount: sanitizeEstimateIntegerInput(event.target.value) })
                    }
                    onBlur={(event) =>
                      updateFlooringOptions({ thresholdCount: normalizeEstimateCountOnBlur(event.target.value) })
                    }
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

          <section
            id="estimate-walls"
            className={withActiveEstimateSection("estimate-walls", activeEstimateSection, "public-estimate-walls")}
            aria-labelledby="public-estimate-walls-title"
          >
            <div className="public-estimate-walls-head">
              <div>
                <span>{formatEstimateStep("estimate-walls")}</span>
                <h2 id="public-estimate-walls-title">Стены</h2>
                <p>Расчёт отделки стен по чистой площади из геометрии: покрытие, подготовка, материалы и расходники по каждому помещению.</p>
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

          <section
            id="estimate-ceiling"
            className={withActiveEstimateSection("estimate-ceiling", activeEstimateSection, "public-estimate-ceiling")}
            aria-labelledby="public-estimate-ceiling-title"
          >
            <div className="public-estimate-ceiling-head">
              <div>
                <span>{formatEstimateStep("estimate-ceiling")}</span>
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

          <section
            id="estimate-electric"
            className={withActiveEstimateSection("estimate-electric", activeEstimateSection, "public-estimate-electric")}
            aria-labelledby="public-estimate-electric-title"
          >
            <div className="public-estimate-electric-head">
              <div>
                <span>{formatEstimateStep("estimate-electric")}</span>
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

          <section
            id="estimate-plumbing"
            className={withActiveEstimateSection("estimate-plumbing", activeEstimateSection, "public-estimate-plumbing")}
            aria-labelledby="public-estimate-plumbing-title"
          >
            <div className="public-estimate-plumbing-head">
              <div>
                <span>{formatEstimateStep("estimate-plumbing")}</span>
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

          <section
            id="estimate-doors"
            className={withActiveEstimateSection("estimate-doors", activeEstimateSection, "public-estimate-doors")}
            aria-labelledby="public-estimate-doors-title"
          >
            <div className="public-estimate-doors-head">
              <div>
                <span>{formatEstimateStep("estimate-doors")}</span>
                <h2 id="public-estimate-doors-title">Двери</h2>
                <p>Предварительный расчёт дверных комплектов, фурнитуры, доставки, подъёма и монтажа.</p>
              </div>
            </div>

            <div className="public-estimate-doors-composition" aria-label="Состав расчёта дверей">
              {doorCompositionItems.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="public-estimate-doors-options" aria-label="Опции дверей">
              <label className="public-estimate-field public-estimate-doors-package">
                <span>Пакет дверей</span>
                <select
                  className="public-estimate-select"
                  value={doorOptions.packageType}
                  onChange={(event) => updateDoorOptions({ packageType: event.target.value as DoorPackageType })}
                >
                  {doorPackageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-estimate-doors-option-zone">
                <input
                  type="checkbox"
                  checked={doorOptions.includeHandles}
                  onChange={(event) => updateDoorOptions({ includeHandles: event.target.checked })}
                />
                <span>
                  <strong>Ручки</strong>
                  <small>по одной ручке на каждый дверной комплект</small>
                </span>
              </label>

              <label className="public-estimate-doors-option-zone">
                <input
                  type="checkbox"
                  checked={doorOptions.includePrivacyLocks}
                  onChange={(event) => updateDoorOptions({ includePrivacyLocks: event.target.checked })}
                />
                <span>
                  <strong>Завертки для санузлов</strong>
                  <small>считаются по дверям помещений типа санузел</small>
                </span>
              </label>

              <label className="public-estimate-doors-option-zone">
                <input
                  type="checkbox"
                  checked={doorOptions.includeLogistics}
                  onChange={(event) => updateDoorOptions({ includeLogistics: event.target.checked })}
                />
                <span>
                  <strong>Доставка и подъём</strong>
                  <small>одна доставка и подъём по количеству дверей</small>
                </span>
              </label>

              <label className="public-estimate-doors-option-zone">
                <input
                  type="checkbox"
                  checked={doorOptions.includeInstallation}
                  onChange={(event) => updateDoorOptions({ includeInstallation: event.target.checked })}
                />
                <span>
                  <strong>Монтаж</strong>
                  <small>монтаж каждого дверного комплекта</small>
                </span>
              </label>
            </div>

            <div className="public-estimate-doors-summary" aria-label="Итоги по дверям">
              {doorSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-doors-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {doorsResult.section.items.length > 0 ? (
              <div className="public-estimate-doors-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Дверные комплекты, фурнитура, логистика и монтаж</span>
                </div>
                <ul>
                  {visibleDoorSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isDoorsSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isDoorsSpecExpanded}
                    onClick={() => setIsDoorsSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isDoorsSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenDoorsSpecCount > 0 ? `: ещё ${hiddenDoorsSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Укажите двери в помещениях, чтобы добавить дверные комплекты в смету.</p>
            )}
          </section>

          <section
            id="estimate-completion"
            className={withActiveEstimateSection(
              "estimate-completion",
              activeEstimateSection,
              "public-estimate-completion",
            )}
            aria-labelledby="public-estimate-completion-title"
          >
            <div className="public-estimate-completion-head">
              <div>
                <span>{formatEstimateStep("estimate-completion")}</span>
                <h2 id="public-estimate-completion-title">Комплектация</h2>
                <p>Кухня, пеналы, гардеробная и мебель санузла включаются отдельно.</p>
              </div>
            </div>

            <div className="public-estimate-completion-groups" aria-label="Опции комплектации">
              <div className="public-estimate-completion-group">
                <div className="public-estimate-completion-group-head">
                  <div>
                    <span>Кухня</span>
                    <strong>{formatMoney(completionResult.kitchenTotal)}</strong>
                  </div>
                  <small>базовая кухня и высокие модули</small>
                </div>

                <label className="public-estimate-completion-option-zone">
                  <input
                    type="checkbox"
                    checked={completionOptions.includeKitchenBase}
                    onChange={(event) => updateCompletionOptions({ includeKitchenBase: event.target.checked })}
                  />
                  <span>
                    <strong>Кухня базовая</strong>
                    <small>расчёт по длине в погонных метрах</small>
                  </span>
                </label>

                <label className="public-estimate-field public-estimate-completion-length">
                  <span>Длина кухни, м.п.</span>
                  <input
                    className="public-estimate-input"
                    inputMode="decimal"
                    min="0"
                    type="text"
                    value={completionOptions.kitchenLengthMeters}
                    {...estimateNumericFieldProps}
                    onChange={(event) =>
                      updateCompletionOptions({
                        kitchenLengthMeters: sanitizeEstimateDecimalInput(event.target.value),
                      })
                    }
                    onBlur={(event) =>
                      updateCompletionOptions({
                        kitchenLengthMeters: normalizeEstimateDecimalOnBlur(event.target.value),
                      })
                    }
                  />
                </label>

                <label className="public-estimate-completion-option-zone">
                  <input
                    type="checkbox"
                    checked={completionOptions.includeKitchenAppliancePenal}
                    onChange={(event) => updateCompletionOptions({ includeKitchenAppliancePenal: event.target.checked })}
                  />
                  <span>
                    <strong>Пенал под технику</strong>
                    <small>отдельный высокий модуль под встроенную технику</small>
                  </span>
                </label>

                <label className="public-estimate-completion-option-zone">
                  <input
                    type="checkbox"
                    checked={completionOptions.includeKitchenFridgePenal}
                    onChange={(event) => updateCompletionOptions({ includeKitchenFridgePenal: event.target.checked })}
                  />
                  <span>
                    <strong>Пенал под холодильник / высокий модуль</strong>
                    <small>отдельная опция, не смешивается с базовой кухней</small>
                  </span>
                </label>
              </div>

              <div className="public-estimate-completion-group">
                <div className="public-estimate-completion-group-head">
                  <div>
                    <span>Мебель</span>
                    <strong>{formatMoney(completionResult.furnitureTotal)}</strong>
                  </div>
                  <small>гардеробная и мебель санузла отдельно</small>
                </div>

                <label className="public-estimate-completion-option-zone">
                  <input
                    type="checkbox"
                    checked={completionOptions.includeWardrobe}
                    onChange={(event) => updateCompletionOptions({ includeWardrobe: event.target.checked })}
                  />
                  <span>
                    <strong>Гардеробная / шкаф-купе</strong>
                    <small>встроенная мебель отдельным компонентом</small>
                  </span>
                </label>

                <label className="public-estimate-completion-option-zone">
                  <input
                    type="checkbox"
                    checked={completionOptions.includeBathroomFurniture}
                    onChange={(event) => updateCompletionOptions({ includeBathroomFurniture: event.target.checked })}
                  />
                  <span>
                    <strong>Мебель санузла / пеналы</strong>
                    <small>пеналы и встроенная мебель санузла</small>
                  </span>
                </label>
              </div>

            </div>

            <div className="public-estimate-completion-summary" aria-label="Итоги по комплектации">
              {completionSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-completion-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {completionResult.section.items.length > 0 ? (
              <div className="public-estimate-completion-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Кухня, пеналы, гардеробная и мебель санузла</span>
                </div>
                <ul>
                  {visibleCompletionSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isCompletionSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isCompletionSpecExpanded}
                    onClick={() => setIsCompletionSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isCompletionSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenCompletionSpecCount > 0 ? `: ещё ${hiddenCompletionSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Включите кухню, мебельные компоненты или технику, чтобы добавить комплектацию в смету.</p>
            )}
          </section>

          <section
            id="estimate-appliances"
            className={withActiveEstimateSection(
              "estimate-appliances",
              activeEstimateSection,
              "public-estimate-appliances",
            )}
            aria-labelledby="public-estimate-appliances-title"
          >
            <div className="public-estimate-appliances-head">
              <div>
                <span>{formatEstimateStep("estimate-appliances")}</span>
                <h2 id="public-estimate-appliances-title">Бытовая техника</h2>
                <p>Техника выбирается по позициям, а уровень цены задаётся пакетом C / B / A.</p>
              </div>
            </div>

            <div className="public-estimate-appliances-package" aria-label="Пакет техники">
              <div className="public-estimate-appliances-package-copy">
                <span>Пакет техники</span>
                <small>
                  Модели и бренды уточняются при финальной комплектации. Сейчас расчёт показывает публичный ориентир по
                  классу техники.
                </small>
              </div>
              <div className="public-estimate-toggle-group public-estimate-appliances-toggle-group" role="group" aria-label="Пакет техники">
                {(["c", "b", "a"] as AppliancePackageLevel[]).map((level) => (
                  <button
                    key={level}
                    className={appliancesOptions.packageLevel === level ? "public-estimate-toggle-active" : undefined}
                    type="button"
                    aria-pressed={appliancesOptions.packageLevel === level}
                    onClick={() => updateAppliancesOptions({ packageLevel: level })}
                  >
                    {appliancePackageLabels[level]}
                  </button>
                ))}
              </div>
            </div>

            <div className="public-estimate-appliances-header" aria-hidden="true">
              <span>Включить</span>
              <span>Позиция</span>
              <span>Вариант</span>
              <span>Кол-во</span>
              <span>Цена за ед.</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-appliances-list" aria-label="Позиции бытовой техники">
              {applianceItemCatalog.map((catalogItem) => {
                const itemDraft = appliancesOptions.items[catalogItem.key];
                const isIncluded = itemDraft.isIncluded;
                const quantity = itemDraft.quantity;
                const unitPrice = getApplianceUnitPrice(catalogItem.key, appliancesOptions);
                const lineTotal = isIncluded ? unitPrice * Math.max(1, parseEstimateInteger(quantity)) : 0;

                return (
                  <article className="public-estimate-appliances-row" key={catalogItem.key}>
                    <label className="public-estimate-appliances-include">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) => updateApplianceItem(catalogItem.key, { isIncluded: event.target.checked })}
                      />
                      <span className="public-estimate-mobile-label">Включить</span>
                    </label>

                    <div className="public-estimate-appliances-title-cell">
                      <span className="public-estimate-mobile-label">Позиция</span>
                      <strong>{catalogItem.title}</strong>
                      {catalogItem.note ? <small>{catalogItem.note}</small> : null}
                    </div>

                    <div className="public-estimate-appliances-variant-cell">
                      <span className="public-estimate-mobile-label">Вариант</span>
                      {catalogItem.key === "fridge" ? (
                        <select
                          className="public-estimate-select"
                          value={appliancesOptions.fridgeVariant}
                          disabled={!isIncluded}
                          onChange={(event) =>
                            updateAppliancesOptions({ fridgeVariant: event.target.value as FridgeVariant })
                          }
                        >
                          {(Object.keys(fridgeVariantLabels) as FridgeVariant[]).map((variant) => (
                            <option key={variant} value={variant}>
                              {fridgeVariantLabels[variant]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="public-estimate-appliances-variant-placeholder">—</span>
                      )}
                    </div>

                    <label className="public-estimate-appliances-quantity">
                      <span className="public-estimate-mobile-label">Кол-во</span>
                      <input
                        className="public-estimate-input"
                        disabled={!isIncluded}
                        inputMode="numeric"
                        type="text"
                        value={quantity}
                        {...estimateNumericFieldProps}
                        onChange={(event) =>
                          updateApplianceItem(catalogItem.key, {
                            quantity: sanitizeEstimateIntegerInput(event.target.value),
                          })
                        }
                        onBlur={(event) =>
                          updateApplianceItem(catalogItem.key, {
                            quantity: normalizeEstimateQuantityOnBlur(event.target.value),
                          })
                        }
                      />
                    </label>

                    <div className="public-estimate-appliances-unit-price">
                      <span className="public-estimate-mobile-label">Цена за ед.</span>
                      <strong>{formatMoney(unitPrice)}</strong>
                    </div>

                    <div className="public-estimate-appliances-line-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(lineTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-appliances-summary" aria-label="Итоги по бытовой технике">
              {appliancesSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-appliances-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {appliancesResult.section.items.length > 0 ? (
              <div className="public-estimate-appliances-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Бытовая техника по выбранному пакету</span>
                </div>
                <ul>
                  {visibleAppliancesSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isAppliancesSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isAppliancesSpecExpanded}
                    onClick={() => setIsAppliancesSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isAppliancesSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenAppliancesSpecCount > 0 ? `: ещё ${hiddenAppliancesSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">
                Включите нужные позиции техники, чтобы добавить их в смету.
              </p>
            )}
          </section>

          <section
            id="estimate-loose-furniture"
            className={withActiveEstimateSection(
              "estimate-loose-furniture",
              activeEstimateSection,
              "public-estimate-loose-furniture",
            )}
            aria-labelledby="public-estimate-loose-furniture-title"
          >
            <div className="public-estimate-loose-furniture-head">
              <div>
                <span>{formatEstimateStep("estimate-loose-furniture")}</span>
                <h2 id="public-estimate-loose-furniture-title">Свободная мебель</h2>
                <p>Мебель выбирается по позициям, а уровень цены задаётся пакетом C / B / A.</p>
              </div>
            </div>

            <div className="public-estimate-loose-furniture-package" aria-label="Пакет мебели">
              <div className="public-estimate-loose-furniture-package-copy">
                <span>Пакет мебели</span>
                <small>
                  Модели и бренды уточняются при финальной комплектации. Сейчас расчёт показывает публичный ориентир по
                  классу мебели.
                </small>
              </div>
              <div
                className="public-estimate-toggle-group public-estimate-loose-furniture-toggle-group"
                role="group"
                aria-label="Пакет мебели"
              >
                {(["c", "b", "a"] as LooseFurniturePackageLevel[]).map((level) => (
                  <button
                    key={level}
                    className={
                      looseFurnitureOptions.packageLevel === level ? "public-estimate-toggle-active" : undefined
                    }
                    type="button"
                    aria-pressed={looseFurnitureOptions.packageLevel === level}
                    onClick={() => updateLooseFurnitureOptions({ packageLevel: level })}
                  >
                    {looseFurniturePackageLabels[level]}
                  </button>
                ))}
              </div>
            </div>

            <div className="public-estimate-loose-furniture-header" aria-hidden="true">
              <span>Включить</span>
              <span>Позиция</span>
              <span>Группа</span>
              <span>Кол-во</span>
              <span>Цена за ед.</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-loose-furniture-list" aria-label="Позиции свободной мебели">
              {looseFurnitureItemCatalog.map((catalogItem) => {
                const itemDraft = looseFurnitureOptions.items[catalogItem.key];
                const isIncluded = itemDraft.isIncluded;
                const quantity = itemDraft.quantity;
                const unitPrice = getLooseFurnitureUnitPrice(catalogItem.key, looseFurnitureOptions);
                const lineTotal = isIncluded ? unitPrice * Math.max(1, parseEstimateInteger(quantity)) : 0;

                return (
                  <article className="public-estimate-loose-furniture-row" key={catalogItem.key}>
                    <label className="public-estimate-loose-furniture-include">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) =>
                          updateLooseFurnitureItem(catalogItem.key, { isIncluded: event.target.checked })
                        }
                      />
                      <span className="public-estimate-mobile-label">Включить</span>
                    </label>

                    <div className="public-estimate-loose-furniture-title-cell">
                      <span className="public-estimate-mobile-label">Позиция</span>
                      <strong>{catalogItem.title}</strong>
                    </div>

                    <div className="public-estimate-loose-furniture-group-cell">
                      <span className="public-estimate-mobile-label">Группа</span>
                      <strong>{looseFurnitureGroupLabels[catalogItem.group]}</strong>
                    </div>

                    <label className="public-estimate-loose-furniture-quantity">
                      <span className="public-estimate-mobile-label">Кол-во</span>
                      <input
                        className="public-estimate-input"
                        disabled={!isIncluded}
                        inputMode="numeric"
                        type="text"
                        value={quantity}
                        {...estimateNumericFieldProps}
                        onChange={(event) =>
                          updateLooseFurnitureItem(catalogItem.key, {
                            quantity: sanitizeEstimateIntegerInput(event.target.value),
                          })
                        }
                        onBlur={(event) =>
                          updateLooseFurnitureItem(catalogItem.key, {
                            quantity: normalizeEstimateQuantityOnBlur(event.target.value),
                          })
                        }
                      />
                    </label>

                    <div className="public-estimate-loose-furniture-unit-price">
                      <span className="public-estimate-mobile-label">Цена за ед.</span>
                      <strong>{formatMoney(unitPrice)}</strong>
                    </div>

                    <div className="public-estimate-loose-furniture-line-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(lineTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-loose-furniture-summary" aria-label="Итоги по свободной мебели">
              {looseFurnitureSummaryItems.map((item) => (
                <div
                  className={item.isStrong ? "public-estimate-loose-furniture-total-cell" : undefined}
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {looseFurnitureResult.section.items.length > 0 ? (
              <div className="public-estimate-loose-furniture-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Свободная мебель по выбранному пакету</span>
                </div>
                <ul>
                  {visibleLooseFurnitureSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isLooseFurnitureSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isLooseFurnitureSpecExpanded}
                    onClick={() => setIsLooseFurnitureSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isLooseFurnitureSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenLooseFurnitureSpecCount > 0 ? `: ещё ${hiddenLooseFurnitureSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">
                Включите нужные позиции мебели, чтобы добавить их в смету.
              </p>
            )}
          </section>

          <section
            id="estimate-home-goods"
            className={withActiveEstimateSection(
              "estimate-home-goods",
              activeEstimateSection,
              "public-estimate-home-goods",
            )}
            aria-labelledby="public-estimate-home-goods-title"
          >
            <div className="public-estimate-home-goods-head">
              <div>
                <span>{formatEstimateStep("estimate-home-goods")}</span>
                <h2 id="public-estimate-home-goods-title">Уборка и товары для дома</h2>
                <p>
                  Финишная уборка считается по площади пола, а комплект товаров для дома — фиксированным пакетом C / B /
                  A.
                </p>
              </div>
            </div>

            <div className="public-estimate-home-goods-cards" aria-label="Опции уборки и товаров для дома">
              <article className="public-estimate-home-goods-card">
                <label className="public-estimate-home-goods-card-head">
                  <input
                    type="checkbox"
                    checked={homeGoodsOptions.includeCleaning}
                    onChange={(event) => updateHomeGoodsOptions({ includeCleaning: event.target.checked })}
                  />
                  <span className="public-estimate-home-goods-card-title">Финишная уборка</span>
                </label>
                <div className="public-estimate-home-goods-card-body">
                  <div className="public-estimate-home-goods-metric">
                    <span className="public-estimate-mobile-label">Площадь</span>
                    <span>Площадь</span>
                    <strong>{formatMeasurement(totals.floorArea, "м²")}</strong>
                  </div>
                  <div className="public-estimate-home-goods-metric">
                    <span className="public-estimate-mobile-label">Ставка</span>
                    <span>Ставка</span>
                    <strong>{formatMoney(cleaningRatePerM2)}/м²</strong>
                  </div>
                  <div className="public-estimate-home-goods-metric public-estimate-home-goods-metric-total">
                    <span className="public-estimate-mobile-label">Итого</span>
                    <span>Итого</span>
                    <strong>{formatMoney(homeGoodsResult.cleaningTotal)}</strong>
                  </div>
                </div>
              </article>

              <article className="public-estimate-home-goods-card">
                <label className="public-estimate-home-goods-card-head">
                  <input
                    type="checkbox"
                    checked={homeGoodsOptions.includeHomeGoods}
                    onChange={(event) => updateHomeGoodsOptions({ includeHomeGoods: event.target.checked })}
                  />
                  <span className="public-estimate-home-goods-card-title">Товары для дома</span>
                </label>
                <div className="public-estimate-home-goods-card-body">
                  <div className="public-estimate-home-goods-package" aria-label="Пакет товаров для дома">
                    <span className="public-estimate-mobile-label">Пакет</span>
                    <span>Пакет</span>
                    <div
                      className="public-estimate-toggle-group public-estimate-home-goods-toggle-group"
                      role="group"
                      aria-label="Пакет товаров для дома"
                    >
                      {(["c", "b", "a"] as HomeGoodsPackageLevel[]).map((level) => (
                        <button
                          key={level}
                          className={
                            homeGoodsOptions.packageLevel === level ? "public-estimate-toggle-active" : undefined
                          }
                          type="button"
                          aria-pressed={homeGoodsOptions.packageLevel === level}
                          onClick={() => updateHomeGoodsOptions({ packageLevel: level })}
                        >
                          {homeGoodsPackageLabels[level]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="public-estimate-home-goods-metric">
                    <span className="public-estimate-mobile-label">Стоимость пакета</span>
                    <span>Стоимость пакета</span>
                    <strong>{formatMoney(homeGoodsPackageRates[homeGoodsOptions.packageLevel])}</strong>
                  </div>
                  <div className="public-estimate-home-goods-metric public-estimate-home-goods-metric-total">
                    <span className="public-estimate-mobile-label">Итого</span>
                    <span>Итого</span>
                    <strong>{formatMoney(homeGoodsResult.homeGoodsTotal)}</strong>
                  </div>
                </div>
              </article>
            </div>

            <div className="public-estimate-home-goods-summary" aria-label="Итоги по уборке и товарам для дома">
              {homeGoodsSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-home-goods-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {homeGoodsResult.section.items.length > 0 ? (
              <div className="public-estimate-home-goods-spec">
                <p>Спецификация раздела</p>
                <ul>
                  {visibleHomeGoodsSpecItems.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.title} · {item.quantity} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isHomeGoodsSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isHomeGoodsSpecExpanded}
                    onClick={() => setIsHomeGoodsSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isHomeGoodsSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenHomeGoodsSpecCount > 0 ? `: ещё ${hiddenHomeGoodsSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">
                Включите финишную уборку или комплект товаров для дома, чтобы добавить их в смету.
              </p>
            )}
          </section>

          <section
            id="estimate-costs"
            className={withActiveEstimateSection("estimate-costs", activeEstimateSection, "public-estimate-costs")}
            aria-labelledby="public-estimate-costs-title"
          >
            <div className="public-estimate-costs-head">
              <div>
                <span>{formatEstimateStep("estimate-costs")}</span>
                <p className="public-section-kicker">Итоговая смета</p>
                <h2 id="public-estimate-costs-title">Стоимость по разделам</h2>
              </div>
            </div>

            <div className="public-estimate-cost-grid">
              {estimateTotalItems.map((item) => (
                <div className={`public-estimate-cost-cell${item.isStrong ? " public-estimate-cost-cell-total" : ""}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {estimateResult.sections.length > 0 ? (
              <div className="public-estimate-cost-sections" aria-label="Стоимость по разделам">
                <div className="public-estimate-cost-sections-head" aria-hidden="true">
                  <span>Раздел</span>
                  <span>Сумма ₽</span>
                </div>
                <ul className="public-estimate-cost-sections-list">
                  {estimateResult.sections.map((section) => (
                    <li className="public-estimate-cost-sections-row" key={section.id}>
                      <span>{section.title}</span>
                      <strong>{formatMoney(section.totals.total)}</strong>
                    </li>
                  ))}
                  <li className="public-estimate-cost-sections-row public-estimate-cost-sections-row-total">
                    <span>Итого по разделам</span>
                    <strong>{formatMoney(estimateResult.totals.total)}</strong>
                  </li>
                </ul>
              </div>
            ) : (
              <p className="public-estimate-cost-empty">
                Заполните геометрию и выберите разделы — разбивка по разделам появится здесь автоматически.
              </p>
            )}

            <p className="public-estimate-cost-note">
              Сейчас в смету включены тёплый пол, полы, стены, потолки, электрика, сантехника, двери, встроенная
              комплектация, выбранная бытовая техника, выбранная свободная мебель, а также выбранная финишная уборка и
              товары для дома. Следующие разделы подключим отдельно: дополнительные работы и экспорт расчёта.
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

        <aside id="estimate-passport" className="public-estimate-passport-sidebar" aria-label="Паспорт сметы">
          <section
            id="estimate-passport-volumes"
            className="public-estimate-card public-estimate-passport public-estimate-passport-volumes-panel"
            aria-label="Объёмы объекта"
          >
            <div className="public-estimate-passport-volumes-head">
              <span>Объём объекта</span>
            </div>
            <dl className="public-estimate-passport-volumes-list">
              {summaryItems.map((item) => (
                <div className="public-estimate-passport-volumes-item" key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <button
              className="public-estimate-passport-volumes-action"
              type="button"
              onClick={handlePrintVolumes}
            >
              Скачать объёмы
            </button>
          </section>

          <section
            className="public-estimate-card public-estimate-passport public-estimate-passport-estimate-panel"
            aria-label="Оценка по составу сметы"
          >
            <div className="public-estimate-passport-head">
              <h2>Оценка по составу сметы</h2>
            </div>

            <div className="public-estimate-passport-metrics" aria-label="Итоги паспорта сметы">
              <div>
                <span>Итого</span>
                <strong>{formatMoney(estimateResult.totals.total)}</strong>
              </div>
              <div>
                <span>₽/м²</span>
                <strong>{formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²</strong>
              </div>
            </div>

            <div className="public-estimate-passport-detail">
              <span>Ориентир пакета (по всей смете)</span>
              <strong>
                {packageClassification.referencePrice > 0
                  ? `${packageClassification.referenceLabel}: ${formatMoney(packageClassification.referencePrice)}/м²`
                  : packageClassification.referenceLabel}
              </strong>
              {packageClassification.nextLabel ? (
                <small>
                  До {packageClassification.nextLabel.replace("Пакет ", "")}: +{formatMoney(packageClassification.nextDelta)}/м²
                </small>
              ) : (
                <small>Верхний ориентир публичной модели</small>
              )}
              <small className="public-estimate-passport-hint">
                Это ориентир уровня всей сметы по ₽/м², а не выбранный вами пакет C / B / A в разделах
                техники, мебели и комплектации.
              </small>
            </div>

            <button className="public-estimate-passport-action" type="button" onClick={handlePrintEstimate}>
              Скачать PDF сметы
            </button>
          </section>
        </aside>
      </section>

      <aside className="public-estimate-mobile-total" aria-label="Краткий итог сметы">
        <div className="public-estimate-mobile-total-main">
          <span>Итого</span>
          <strong>{formatMoney(estimateResult.totals.total)}</strong>
        </div>
        <div className="public-estimate-mobile-total-rate">
          <span>₽/м²</span>
          <strong>{formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²</strong>
        </div>
        <a
          className="public-estimate-mobile-total-link"
          href="#estimate-costs"
          onClick={(event) => {
            event.preventDefault();
            scrollToEstimateSection("estimate-costs");
          }}
        >
          Итог
        </a>
      </aside>

      <section className="public-estimate-volumes-print" aria-hidden="true">
        <h1>Объёмы объекта</h1>
        <dl className="public-estimate-volumes-print-list">
          {summaryItems.map((item) => (
            <div className="public-estimate-volumes-print-item" key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
