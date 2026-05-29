import {
  catalogItemUnitPrice,
  DEFAULT_ZONE_RISK_PERCENT,
  getPlumbingCatalogItem,
  ZONES_SEED,
  type ZoneCompositionRow,
} from "../catalog-editor/plumbing-seed";
import type { EstimateCostCategory, EstimateLineItem, EstimateSection } from "./public-estimate-model";

/** Состав и цены зоны мойки — из catalog-editor/plumbing-seed.ts (ZONES_SEED + PLUMBING_SEED). */
export type PlumbingPackageLevel = "c" | "b" | "a";

const KITCHEN_SINK_ZONE_SEED = ZONES_SEED.find((zone) => zone.id === "zone-kitchen-sink");
if (!KITCHEN_SINK_ZONE_SEED) {
  throw new Error("zone-kitchen-sink missing from ZONES_SEED");
}

export const KITCHEN_SINK_ZONE_RISK_PERCENT = KITCHEN_SINK_ZONE_SEED.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT;

export const KITCHEN_SINK_ZONE_DISCLAIMER =
  "Ориентировочный расчёт труб и штробления без проекта. Точный метраж и трассу уточняем по планировке.";

const PACKAGE_LEVELS: PlumbingPackageLevel[] = ["c", "b", "a"];

export const kitchenSinkPackageLabels: Record<PlumbingPackageLevel, string> = Object.fromEntries(
  PACKAGE_LEVELS.map((level) => {
    const variant = KITCHEN_SINK_ZONE_SEED.priceClassVariants?.find((v) => v.id === level);
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

const KITCHEN_SINK_ZONE_BASE: ZoneAtom[] = KITCHEN_SINK_ZONE_SEED.items.map(compositionToZoneAtom);

const KITCHEN_SINK_ZONE_PACKAGES: Record<PlumbingPackageLevel, ZoneAtom[]> = Object.fromEntries(
  PACKAGE_LEVELS.map((level) => {
    const variant = KITCHEN_SINK_ZONE_SEED.priceClassVariants?.find((v) => v.id === level);
    if (!variant) {
      throw new Error(`zone-kitchen-sink: нет пакета ${level}`);
    }
    return [level, variant.items.map(compositionToZoneAtom)];
  }),
) as Record<PlumbingPackageLevel, ZoneAtom[]>;

/** Строки с total=0 — placeholder без публичной цены; не выводим в spec базового состава. */
export function filterClientSpecLines(items: EstimateLineItem[]): EstimateLineItem[] {
  return items.filter((item) => item.total > 0);
}

/** Позиции активного пакета (смеситель + мойка) — всегда в spec, как в catalog-editor. */
function packageCompositionSpecLines(packageLevel: PlumbingPackageLevel): EstimateLineItem[] {
  return KITCHEN_SINK_ZONE_PACKAGES[packageLevel].map(zoneAtomToLineItem).map((line) => {
    if (line.total > 0) {
      return line;
    }
    return { ...line, note: "уточняется" };
  });
}

function atomLineTotal(atom: ZoneAtom): number {
  return Math.round(atom.publicPrice * atom.quantity);
}

function atomsSubtotal(atoms: ZoneAtom[]): number {
  return atoms.reduce((sum, atom) => sum + atomLineTotal(atom), 0);
}

function zoneAtomToLineItem(atom: ZoneAtom): EstimateLineItem {
  return {
    id: `kitchen-sink-zone-${atom.id}`,
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

export function getKitchenSinkZoneSpecItems(packageLevel: PlumbingPackageLevel): EstimateLineItem[] {
  const baseLines = filterClientSpecLines(KITCHEN_SINK_ZONE_BASE.map(zoneAtomToLineItem));
  return [...baseLines, ...packageCompositionSpecLines(packageLevel)];
}

function computeKitchenSinkZoneTotals(packageLevel: PlumbingPackageLevel) {
  const packageAtoms = KITCHEN_SINK_ZONE_PACKAGES[packageLevel];
  const baseTotal = atomsSubtotal(KITCHEN_SINK_ZONE_BASE);
  const packageTotal = atomsSubtotal(packageAtoms);
  const subtotal = baseTotal + packageTotal;
  const riskAmount = Math.round((subtotal * KITCHEN_SINK_ZONE_RISK_PERCENT) / 100);
  const total = subtotal + riskAmount;

  return { baseTotal, packageTotal, subtotal, riskAmount, total };
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

export function calculateKitchenSinkZone(packageLevel: PlumbingPackageLevel): KitchenSinkZoneResult {
  const totals = computeKitchenSinkZoneTotals(packageLevel);

  return {
    packageLevel,
    ...totals,
    sectionItem: getKitchenSinkZoneSectionItem(packageLevel),
    specItems: getKitchenSinkZoneSpecItems(packageLevel),
  };
}

export function getKitchenSinkZonePackageTotal(packageLevel: PlumbingPackageLevel): number {
  return calculateKitchenSinkZone(packageLevel).total;
}

const KITCHEN_SINK_ZONE_ITEM_ID_PREFIX = "kitchen-sink-zone";

function isKitchenSinkZoneLine(item: EstimateLineItem): boolean {
  return item.id === KITCHEN_SINK_ZONE_ITEM_ID_PREFIX || item.id.startsWith(`${KITCHEN_SINK_ZONE_ITEM_ID_PREFIX}-`);
}

export type EstimateSpecSection = EstimateSection & {
  specIntro?: string;
};

/** Разворачивает зону мойки в атомы для клиентской спецификации (без строки резерва). */
export function expandPlumbingSectionForSpec(
  section: EstimateSection,
  packageLevel: PlumbingPackageLevel,
  includeKitchenSink: boolean,
): EstimateSpecSection {
  if (!includeKitchenSink) {
    return section;
  }

  const zoneIndex = section.items.findIndex(isKitchenSinkZoneLine);

  if (zoneIndex < 0) {
    return section;
  }

  const specItems = getKitchenSinkZoneSpecItems(packageLevel);
  const before = section.items.slice(0, zoneIndex);
  const after = section.items.slice(zoneIndex + 1).filter((item) => !isKitchenSinkZoneLine(item));

  return {
    ...section,
    specIntro: KITCHEN_SINK_ZONE_DISCLAIMER,
    items: [...before, ...specItems, ...after],
  };
}

export function sumKitchenSinkZoneSpecLines(specItems: EstimateLineItem[]): number {
  return specItems.reduce((sum, item) => sum + (item.isIncluded ? item.total : 0), 0);
}
