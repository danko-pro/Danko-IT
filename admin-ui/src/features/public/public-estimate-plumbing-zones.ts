import type { EstimateCostCategory, EstimateLineItem, EstimateSection } from "./public-estimate-model";

/** Синхронизировано с catalog-editor/plumbing-seed.ts → zone-kitchen-sink (коммиты до c77e827). */
export type PlumbingPackageLevel = "c" | "b" | "a";

export const KITCHEN_SINK_ZONE_RISK_PERCENT = 6.4;

export const KITCHEN_SINK_ZONE_DISCLAIMER =
  "Ориентировочный расчёт труб и штробления без проекта. Точный метраж и трассу уточняем по планировке.";

export const kitchenSinkPackageLabels: Record<PlumbingPackageLevel, string> = {
  c: "Пакет C",
  b: "Пакет B",
  a: "Пакет A",
};

type ZoneAtom = {
  id: string;
  title: string;
  unit: string;
  publicPrice: number;
  quantity: number;
  category: EstimateCostCategory;
};

/** Базовый состав зоны мойки — атомы из plumbing-seed / ZONES_SEED. */
const KITCHEN_SINK_ZONE_BASE: ZoneAtom[] = [
  { id: "work-water-point", title: "Монтаж точки ХВС/ГВС", unit: "шт", publicPrice: 3500, quantity: 1, category: "works" },
  { id: "work-sewer-point", title: "Монтаж точки канализации", unit: "шт", publicPrice: 2500, quantity: 1, category: "works" },
  {
    id: "work-sink-mixer-siphon-connect",
    title: "Подключение смесителя и сифона мойки",
    unit: "шт",
    publicPrice: 1500,
    quantity: 1,
    category: "works",
  },
  {
    id: "kitchen-sink-siphon",
    title: "Сифон для кухонной мойки",
    unit: "шт",
    publicPrice: 4500,
    quantity: 1,
    category: "materials",
  },
  {
    id: "pipe-sewer-50",
    title: "Труба канализационная 50 мм",
    unit: "м.п.",
    publicPrice: 155,
    quantity: 3.5,
    category: "materials",
  },
  { id: "pipe-ppr-d20", title: "Труба PPR d20", unit: "м.п.", publicPrice: 115, quantity: 20, category: "materials" },
  {
    id: "ppr-d20-outlet",
    title: "Выход / подключение PPR d20",
    unit: "шт",
    publicPrice: 121.28,
    quantity: 12,
    category: "materials",
  },
  {
    id: "ppr-d20-fitting",
    title: "Фитинг / поворот PPR d20",
    unit: "шт",
    publicPrice: 10.05,
    quantity: 12,
    category: "materials",
  },
  {
    id: "pipe-clamp-ppr-d20",
    title: "Крепёж трубы (хомут) PPR d20",
    unit: "шт",
    publicPrice: 77.52,
    quantity: 30,
    category: "materials",
  },
  {
    id: "pipe-clamp-sewer",
    title: "Крепёж трубы (хомут) канализация",
    unit: "шт",
    publicPrice: 86.64,
    quantity: 5.25,
    category: "materials",
  },
  {
    id: "work-groove-pipe",
    title: "Штробление под трубу",
    unit: "м.п.",
    publicPrice: 900,
    quantity: 6,
    category: "works",
  },
];

const KITCHEN_SINK_ZONE_PACKAGES: Record<PlumbingPackageLevel, ZoneAtom[]> = {
  c: [
    { id: "kitchen-faucet-c", title: "Смеситель кухонный — пакет C", unit: "шт", publicPrice: 11500, quantity: 1, category: "equipment" },
    { id: "kitchen-sink-bowl-c", title: "Мойка кухонная — пакет C", unit: "шт", publicPrice: 0, quantity: 1, category: "equipment" },
  ],
  b: [
    { id: "kitchen-faucet-b", title: "Смеситель кухонный — пакет B", unit: "шт", publicPrice: 16300, quantity: 1, category: "equipment" },
    { id: "kitchen-sink-bowl-b", title: "Мойка кухонная — пакет B", unit: "шт", publicPrice: 0, quantity: 1, category: "equipment" },
  ],
  a: [
    { id: "kitchen-faucet-a", title: "Смеситель кухонный — пакет A", unit: "шт", publicPrice: 27000, quantity: 1, category: "equipment" },
    { id: "kitchen-sink-bowl-a", title: "Мойка кухонная — пакет A", unit: "шт", publicPrice: 0, quantity: 1, category: "equipment" },
  ],
};

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
  return [...KITCHEN_SINK_ZONE_BASE, ...KITCHEN_SINK_ZONE_PACKAGES[packageLevel]].map(zoneAtomToLineItem);
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
