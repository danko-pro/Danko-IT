import {
  catalogItemUnitPrice,
  DEFAULT_ZONE_RISK_PERCENT,
  getPlumbingCatalogItem,
  ZONES_SEED,
  type CatalogZone,
  type ZoneCompositionRow,
} from "../catalog-editor/plumbing-seed";
import type { EstimateCostCategory, EstimateLineItem, EstimateSection } from "./public-estimate-model";

/** Состав и цены зон кухни — из catalog-editor/plumbing-seed.ts (ZONES_SEED + PLUMBING_SEED). */
export type PlumbingPackageLevel = "c" | "b" | "a";

const PACKAGE_LEVELS: PlumbingPackageLevel[] = ["c", "b", "a"];

const KITCHEN_SINK_ZONE_ID = "zone-kitchen-sink";
const KITCHEN_DISHWASHER_ZONE_ID = "zone-kitchen-dishwasher";

const KITCHEN_SINK_ZONE_SEED = ZONES_SEED.find((zone) => zone.id === KITCHEN_SINK_ZONE_ID)!;
const KITCHEN_DISHWASHER_ZONE_SEED = ZONES_SEED.find((zone) => zone.id === KITCHEN_DISHWASHER_ZONE_ID)!;

if (!KITCHEN_SINK_ZONE_SEED) {
  throw new Error("zone-kitchen-sink missing from ZONES_SEED");
}
if (!KITCHEN_DISHWASHER_ZONE_SEED) {
  throw new Error("zone-kitchen-dishwasher missing from ZONES_SEED");
}

export const KITCHEN_SINK_ZONE_RISK_PERCENT = KITCHEN_SINK_ZONE_SEED.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT;

export const KITCHEN_SINK_ZONE_DISCLAIMER =
  "Ориентировочный расчёт труб и штробления без проекта. Точный метраж и трассу уточняем по планировке.";

export const KITCHEN_DISHWASHER_ZONE_DISCLAIMER =
  "Ориентировочный расчёт труб и штробления для зоны ПММ без проекта. Точный метраж и трассу уточняем по планировке.";

/** Legacy / чужие зоны — никогда не показываем в spec зоны мойки. */
const SINK_ZONE_FORBIDDEN_ATOMIC_IDS = new Set([
  "kitchen-sink",
  "dishwasher-output",
  "dishwasher-outputs-alt",
  "dishwasher-45-package-c",
  "dishwasher-45-package-b",
  "dishwasher-60-package-a",
  "work-dishwasher-connect",
  "kitchen-siphon-dishwasher",
]);

function isDishwasherAtomicId(id: string): boolean {
  return id.startsWith("dishwasher") || id.includes("dishwasher");
}

export const kitchenSinkPackageLabels: Record<PlumbingPackageLevel, string> = Object.fromEntries(
  PACKAGE_LEVELS.map((level) => {
    const variant = KITCHEN_SINK_ZONE_SEED.priceClassVariants?.find((v) => v.id === level);
    return [level, variant?.label ?? `Пакет ${level.toUpperCase()}`];
  }),
) as Record<PlumbingPackageLevel, string>;

export const dishwasherPackageLabels: Record<PlumbingPackageLevel, string> = Object.fromEntries(
  PACKAGE_LEVELS.map((level) => {
    const variant = KITCHEN_DISHWASHER_ZONE_SEED.priceClassVariants?.find((v) => v.id === level);
    return [level, variant?.label ?? `Пакет ${level.toUpperCase()}`];
  }),
) as Record<PlumbingPackageLevel, string>;

type ZoneAtom = {
  id: string;
  title: string;
  unit: string;
  publicPrice: number;
  quantity: number;
  category: EstimateCostCategory;
};

function compositionToZoneAtom(row: ZoneCompositionRow): ZoneAtom {
  const item = getPlumbingCatalogItem(row.atomicItemId);
  if (!item) {
    throw new Error(`PLUMBING_SEED: нет позиции ${row.atomicItemId}`);
  }
  const rowCoef = row.coefficient ?? 1;
  return {
    id: item.id,
    title: item.publicTitle,
    unit: item.unit,
    publicPrice: catalogItemUnitPrice(item),
    quantity: row.quantity * rowCoef,
    category: item.category,
  };
}

function buildZoneAtoms(zoneSeed: CatalogZone) {
  const base = zoneSeed.items.map(compositionToZoneAtom);
  const packages = Object.fromEntries(
    PACKAGE_LEVELS.map((level) => {
      const variant = zoneSeed.priceClassVariants?.find((v) => v.id === level);
      if (!variant) {
        throw new Error(`${zoneSeed.id}: нет пакета ${level}`);
      }
      return [level, variant.items.map(compositionToZoneAtom)];
    }),
  ) as Record<PlumbingPackageLevel, ZoneAtom[]>;

  return { base, packages };
}

const KITCHEN_SINK_ZONE = buildZoneAtoms(KITCHEN_SINK_ZONE_SEED);
const KITCHEN_DISHWASHER_ZONE = buildZoneAtoms(KITCHEN_DISHWASHER_ZONE_SEED);

/** Канонический состав zone-kitchen-sink из seed (база + пакеты). */
export const KITCHEN_SINK_ZONE_BASE_ATOMIC_IDS = KITCHEN_SINK_ZONE.base.map((atom) => atom.id);
export const KITCHEN_SINK_ZONE_PACKAGE_ATOMIC_IDS = Object.fromEntries(
  PACKAGE_LEVELS.map((level) => [level, KITCHEN_SINK_ZONE.packages[level].map((atom) => atom.id)]),
) as Record<PlumbingPackageLevel, string[]>;

export type FilterClientSpecLinesOptions = {
  /** Строки пакета — всегда в spec (с note «уточняется» при total=0). */
  alwaysShowIds?: ReadonlySet<string>;
};

/**
 * База: total > 0. Пакет: alwaysShowIds. Без cross-zone: id вне allowlist отбрасывается.
 */
function atomIdFromZoneLineId(zoneIdPrefix: string, lineId: string): string {
  const prefix = `${zoneIdPrefix}-`;
  return lineId.startsWith(prefix) ? lineId.slice(prefix.length) : lineId;
}

export function filterClientSpecLines(
  items: EstimateLineItem[],
  options: FilterClientSpecLinesOptions & { zoneIdPrefix?: string } = {},
): EstimateLineItem[] {
  const alwaysShow = options.alwaysShowIds;
  const zoneIdPrefix = options.zoneIdPrefix;

  return items.filter((item) => {
    const atomId =
      zoneIdPrefix != null ? atomIdFromZoneLineId(zoneIdPrefix, item.id) : item.id;
    if (alwaysShow?.has(atomId)) {
      return true;
    }
    return item.total > 0;
  });
}

function atomLineTotal(atom: ZoneAtom): number {
  return Math.round(atom.publicPrice * atom.quantity);
}

function atomsSubtotal(atoms: ZoneAtom[]): number {
  return atoms.reduce((sum, atom) => sum + atomLineTotal(atom), 0);
}

function isAllowedSinkZoneAtom(atom: ZoneAtom): boolean {
  if (SINK_ZONE_FORBIDDEN_ATOMIC_IDS.has(atom.id)) {
    return false;
  }
  if (isDishwasherAtomicId(atom.id)) {
    return false;
  }
  return true;
}

function zoneAtomToLineItem(zoneIdPrefix: string, atom: ZoneAtom): EstimateLineItem {
  return {
    id: `${zoneIdPrefix}-${atom.id}`,
    sectionId: "plumbing",
    title: atom.title,
    category: atom.category,
    quantity: atom.quantity,
    unit: atom.unit,
    unitPrice: atom.publicPrice,
    total: atomLineTotal(atom),
    isIncluded: true,
  };
}

function packageCompositionSpecLines(
  zoneIdPrefix: string,
  packageAtoms: ZoneAtom[],
): EstimateLineItem[] {
  return packageAtoms.map((atom) => zoneAtomToLineItem(zoneIdPrefix, atom)).map((line) => {
    if (line.total > 0) {
      return line;
    }
    return { ...line, note: "уточняется" };
  });
}

function buildZoneSpecItems(
  zoneIdPrefix: string,
  baseAtoms: ZoneAtom[],
  packageAtoms: ZoneAtom[],
  allowAtom?: (atom: ZoneAtom) => boolean,
): EstimateLineItem[] {
  const allowedBase = allowAtom ? baseAtoms.filter(allowAtom) : baseAtoms;
  const allowedPackage = allowAtom ? packageAtoms.filter(allowAtom) : packageAtoms;
  const packageIds = new Set(allowedPackage.map((atom) => atom.id));

  const baseLines = filterClientSpecLines(
    allowedBase.map((atom) => zoneAtomToLineItem(zoneIdPrefix, atom)),
    { alwaysShowIds: packageIds, zoneIdPrefix },
  );

  return [...baseLines, ...packageCompositionSpecLines(zoneIdPrefix, allowedPackage)];
}

export function getKitchenSinkZoneSpecItems(packageLevel: PlumbingPackageLevel): EstimateLineItem[] {
  return buildZoneSpecItems(
    "kitchen-sink-zone",
    KITCHEN_SINK_ZONE.base,
    KITCHEN_SINK_ZONE.packages[packageLevel],
    isAllowedSinkZoneAtom,
  );
}

export function getDishwasherZoneSpecItems(packageLevel: PlumbingPackageLevel): EstimateLineItem[] {
  return buildZoneSpecItems(
    "kitchen-dishwasher-zone",
    KITCHEN_DISHWASHER_ZONE.base,
    KITCHEN_DISHWASHER_ZONE.packages[packageLevel],
  );
}

function computeZoneTotals(
  baseAtoms: ZoneAtom[],
  packageAtoms: ZoneAtom[],
  riskPercent: number,
) {
  const baseTotal = atomsSubtotal(baseAtoms);
  const packageTotal = atomsSubtotal(packageAtoms);
  const subtotal = baseTotal + packageTotal;
  const riskAmount = Math.round((subtotal * riskPercent) / 100);
  const total = subtotal + riskAmount;

  return { baseTotal, packageTotal, subtotal, riskAmount, total };
}

function computeKitchenSinkZoneTotals(packageLevel: PlumbingPackageLevel) {
  return computeZoneTotals(
    KITCHEN_SINK_ZONE.base,
    KITCHEN_SINK_ZONE.packages[packageLevel],
    KITCHEN_SINK_ZONE_RISK_PERCENT,
  );
}

function computeDishwasherZoneTotals(packageLevel: PlumbingPackageLevel) {
  const riskPercent = KITCHEN_DISHWASHER_ZONE_SEED.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT;
  return computeZoneTotals(
    KITCHEN_DISHWASHER_ZONE.base,
    KITCHEN_DISHWASHER_ZONE.packages[packageLevel],
    riskPercent,
  );
}

export function getKitchenSinkZoneSectionItem(packageLevel: PlumbingPackageLevel): EstimateLineItem {
  const { total } = computeKitchenSinkZoneTotals(packageLevel);

  return {
    id: "kitchen-sink-zone",
    sectionId: "plumbing",
    title: "Зона мойки",
    category: "works",
    quantity: 1,
    unit: "комплект",
    unitPrice: total,
    total,
    isIncluded: true,
  };
}

export function getDishwasherZoneSectionItem(packageLevel: PlumbingPackageLevel): EstimateLineItem {
  const { total } = computeDishwasherZoneTotals(packageLevel);

  return {
    id: "kitchen-dishwasher-zone",
    sectionId: "plumbing",
    title: "Зона ПММ",
    category: "works",
    quantity: 1,
    unit: "комплект",
    unitPrice: total,
    total,
    isIncluded: true,
  };
}

export type KitchenSinkZoneResult = {
  packageLevel: PlumbingPackageLevel;
  baseTotal: number;
  packageTotal: number;
  subtotal: number;
  riskAmount: number;
  total: number;
  sectionItem: EstimateLineItem;
  specItems: EstimateLineItem[];
};

export type DishwasherZoneResult = KitchenSinkZoneResult;

export function calculateKitchenSinkZone(packageLevel: PlumbingPackageLevel): KitchenSinkZoneResult {
  const totals = computeKitchenSinkZoneTotals(packageLevel);

  return {
    packageLevel,
    ...totals,
    sectionItem: getKitchenSinkZoneSectionItem(packageLevel),
    specItems: getKitchenSinkZoneSpecItems(packageLevel),
  };
}

export function calculateDishwasherZone(packageLevel: PlumbingPackageLevel): DishwasherZoneResult {
  const totals = computeDishwasherZoneTotals(packageLevel);

  return {
    packageLevel,
    ...totals,
    sectionItem: getDishwasherZoneSectionItem(packageLevel),
    specItems: getDishwasherZoneSpecItems(packageLevel),
  };
}

export function getKitchenSinkZonePackageTotal(packageLevel: PlumbingPackageLevel): number {
  return calculateKitchenSinkZone(packageLevel).total;
}

export function calculateKitchenSinkZoneTotal(packageLevel: PlumbingPackageLevel): number {
  return getKitchenSinkZonePackageTotal(packageLevel);
}

export function getDishwasherZonePackageTotal(packageLevel: PlumbingPackageLevel): number {
  return calculateDishwasherZone(packageLevel).total;
}

const KITCHEN_SINK_ZONE_ITEM_ID_PREFIX = "kitchen-sink-zone";
const KITCHEN_DISHWASHER_ZONE_ITEM_ID_PREFIX = "kitchen-dishwasher-zone";

function isKitchenSinkZoneLine(item: EstimateLineItem): boolean {
  return item.id === KITCHEN_SINK_ZONE_ITEM_ID_PREFIX || item.id.startsWith(`${KITCHEN_SINK_ZONE_ITEM_ID_PREFIX}-`);
}

function isDishwasherZoneLine(item: EstimateLineItem): boolean {
  return (
    item.id === KITCHEN_DISHWASHER_ZONE_ITEM_ID_PREFIX ||
    item.id.startsWith(`${KITCHEN_DISHWASHER_ZONE_ITEM_ID_PREFIX}-`)
  );
}

/** Legacy split-rate «Выводы для ПМ машины» — заменены зоной zone-kitchen-dishwasher. */
function isLegacyDishwasherOutputLine(item: EstimateLineItem): boolean {
  return item.id === "dishwasher-output" || item.id.startsWith("dishwasher-output-");
}

function isLegacyKitchenSinkLine(item: EstimateLineItem): boolean {
  return item.id === "kitchen-sink" || item.id.startsWith("kitchen-sink-works");
}

export type EstimateSpecSection = EstimateSection & {
  specIntro?: string;
};

export type ExpandPlumbingSectionForSpecOptions = {
  kitchenSinkPackageLevel: PlumbingPackageLevel;
  includeKitchenSink: boolean;
  dishwasherPackageLevel?: PlumbingPackageLevel;
  includeDishwasher?: boolean;
};

/** Разворачивает зоны мойки и ПММ в атомы для клиентской спецификации (без строки резерва). */
export function expandPlumbingSectionForSpec(
  section: EstimateSection,
  kitchenSinkPackageLevelOrOptions: PlumbingPackageLevel | ExpandPlumbingSectionForSpecOptions,
  includeKitchenSinkLegacy?: boolean,
): EstimateSpecSection {
  const options: ExpandPlumbingSectionForSpecOptions =
    typeof kitchenSinkPackageLevelOrOptions === "object"
      ? kitchenSinkPackageLevelOrOptions
      : {
          kitchenSinkPackageLevel: kitchenSinkPackageLevelOrOptions,
          includeKitchenSink: includeKitchenSinkLegacy ?? false,
          dishwasherPackageLevel: "b",
          includeDishwasher: false,
        };

  const {
    kitchenSinkPackageLevel,
    includeKitchenSink,
    dishwasherPackageLevel = "b",
    includeDishwasher = false,
  } = options;

  if (!includeKitchenSink && !includeDishwasher) {
    return section;
  }

  const expandedItems: EstimateLineItem[] = [];
  let specIntro: string | undefined;

  for (const item of section.items) {
    if (isLegacyKitchenSinkLine(item) || isLegacyDishwasherOutputLine(item)) {
      continue;
    }

    if (includeKitchenSink && item.id === KITCHEN_SINK_ZONE_ITEM_ID_PREFIX) {
      if (!specIntro) {
        specIntro = KITCHEN_SINK_ZONE_DISCLAIMER;
      }
      expandedItems.push(...getKitchenSinkZoneSpecItems(kitchenSinkPackageLevel));
      continue;
    }

    if (includeDishwasher && item.id === KITCHEN_DISHWASHER_ZONE_ITEM_ID_PREFIX) {
      expandedItems.push(...getDishwasherZoneSpecItems(dishwasherPackageLevel));
      continue;
    }

    if (isKitchenSinkZoneLine(item) || isDishwasherZoneLine(item)) {
      continue;
    }

    expandedItems.push(item);
  }

  if (expandedItems.length === section.items.length && !specIntro) {
    return section;
  }

  return {
    ...section,
    specIntro,
    items: expandedItems,
  };
}

export function sumKitchenSinkZoneSpecLines(specItems: EstimateLineItem[]): number {
  return specItems.reduce((sum, item) => sum + (item.isIncluded ? item.total : 0), 0);
}

export function isKitchenSinkZoneSpecLine(item: EstimateLineItem): boolean {
  return isKitchenSinkZoneLine(item);
}

export function isSinkZoneContaminantLine(item: EstimateLineItem): boolean {
  if (!isKitchenSinkZoneLine(item)) {
    return false;
  }
  const atomId = item.id.slice(`${KITCHEN_SINK_ZONE_ITEM_ID_PREFIX}-`.length);
  return SINK_ZONE_FORBIDDEN_ATOMIC_IDS.has(atomId) || isDishwasherAtomicId(atomId);
}
