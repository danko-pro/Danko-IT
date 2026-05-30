import plumbingSnapshotData from "./generated/plumbing.snapshot.json";

import type {
  EstimateCostCategory,
  EstimateLineItem,
  EstimateSection,
} from "./public-estimate-model";

/**
 * Состав, цены и запечённые итоги зон — из build-time снапшота
 * `generated/plumbing.snapshot.json` (единственный источник правды публичного
 * калькулятора, A8). Снапшот собирается на сборке (prebuild) из ГЛОБАЛЬНОГО
 * каталога БД (owner=NULL, Слой 0) с уже запечённым резервом 6.4 % (Q3):
 * клиент НЕ прибавляет резерв сам — берёт готовые суммы. Internal-поля
 * (`riskPercent`, разбивка цен, coefficient, source, note) в снапшот не
 * попадают по whitelist, поэтому процент резерва тут недоступен и не считается.
 */

export type PlumbingPackageLevel = "c" | "b" | "a";

const PACKAGE_LEVELS: PlumbingPackageLevel[] = ["c", "b", "a"];

type PlumbingSnapshotComposition = {
  itemCode: string;
  quantity: number;
  coefficient?: number;
};

type PlumbingSnapshotPackage = {
  code: PlumbingPackageLevel;
  label: string;
  items: PlumbingSnapshotComposition[];
  total: number;
};

type PlumbingSnapshotZone = {
  code: string;
  subgroup: string;
  title: string;
  disclaimer: string | null;
  activePackage: PlumbingPackageLevel | null;
  base: PlumbingSnapshotComposition[];
  packages: PlumbingSnapshotPackage[];
  total: number;
};

type PlumbingSnapshotItem = {
  code: string;
  title: string;
  unit: string;
  category: EstimateCostCategory;
  unitPrice: number;
};

type PlumbingSnapshot = {
  version: string;
  items: PlumbingSnapshotItem[];
  zones: PlumbingSnapshotZone[];
};

const PLUMBING_SNAPSHOT = plumbingSnapshotData as unknown as PlumbingSnapshot;

const SNAPSHOT_ITEMS = new Map<string, PlumbingSnapshotItem>(
  PLUMBING_SNAPSHOT.items.map((item) => [item.code, item]),
);

const SNAPSHOT_ZONES = new Map<string, PlumbingSnapshotZone>(
  PLUMBING_SNAPSHOT.zones.map((zone) => [zone.code, zone]),
);

export const PLUMBING_ZONE_IDS = {
  KITCHEN_SINK: "zone-kitchen-sink",

  KITCHEN_DISHWASHER: "zone-kitchen-dishwasher",

  BATHROOM_VANITY: "zone-bathroom-vanity",

  BATHROOM_SHOWER: "zone-bathroom-shower",

  BATHROOM_INSTALL_RELOCATION: "zone-bathroom-install-relocation",

  // A8.2: мигрированные legacy-опции (единый итог, без пакетов C/B/A).
  BATHROOM_SET: "zone-bathroom-set",

  BATHROOM_BATH: "zone-bathroom-bath",

  BATHROOM_HYGIENIC_SHOWER: "zone-bathroom-hygienic-shower",

  BATHROOM_TOWEL_RAIL: "zone-bathroom-towel-rail",

  TECH_WASHER_OUTPUT: "zone-tech-washer-output",

  WATER_NODE: "zone-water-node",

  WATER_LEAK_PROTECTION: "zone-water-leak-protection",
} as const;

export type PlumbingZoneId =
  (typeof PLUMBING_ZONE_IDS)[keyof typeof PLUMBING_ZONE_IDS];

export type PlumbingZoneDefinition = {
  zoneId: PlumbingZoneId;

  lineIdPrefix: string;

  title: string;

  disclaimer: string;

  hasPackages: boolean;

  forbiddenAtomIds: ReadonlySet<string>;
};

function zoneIdToLineIdPrefix(zoneId: string): string {
  return zoneId.startsWith("zone-")
    ? `${zoneId.slice("zone-".length)}-zone`
    : `${zoneId}-zone`;
}

const DEFAULT_ZONE_DISCLAIMER =
  "Ориентировочный расчёт труб и штробления без проекта. Точный метраж и трассу уточняем по планировке.";

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

const ZONE_FORBIDDEN_ATOMS: Partial<
  Record<PlumbingZoneId, ReadonlySet<string>>
> = {
  [PLUMBING_ZONE_IDS.KITCHEN_SINK]: SINK_ZONE_FORBIDDEN_ATOMIC_IDS,
};

const ZONE_DISCLAIMERS: Partial<Record<PlumbingZoneId, string>> = {
  [PLUMBING_ZONE_IDS.KITCHEN_SINK]: DEFAULT_ZONE_DISCLAIMER,

  [PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER]:
    "Ориентировочный расчёт труб и штробления для зоны ПММ без проекта. Точный метраж и трассу уточняем по планировке.",

  [PLUMBING_ZONE_IDS.BATHROOM_SHOWER]:
    "Ориентировочный расчёт душевой зоны без проекта. Тип ограждения и трассу уточняем по планировке.",

  [PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION]:
    "Ориентировочный расчёт переноса инсталляции без проекта. Точный метраж и трассу уточняем по планировке.",
};

/** Legacy split-rate позиции, заменённые зонами. */

export const LEGACY_PLUMBING_LINE_IDS = {
  KITCHEN_SINK: ["kitchen-sink", "kitchen-sink-works"],

  DISHWASHER_OUTPUT: ["dishwasher-output"],

  ACRYLIC_BATH: ["acrylic-bath", "bath-siphon", "bath-mixer"],
} as const;

function isDishwasherAtomicId(id: string): boolean {
  return id.startsWith("dishwasher") || id.includes("dishwasher");
}

function buildZoneDefinition(zone: PlumbingSnapshotZone): PlumbingZoneDefinition {
  const zoneId = zone.code as PlumbingZoneId;

  return {
    zoneId,

    lineIdPrefix: zoneIdToLineIdPrefix(zone.code),

    title: zone.title,

    disclaimer: ZONE_DISCLAIMERS[zoneId] ?? DEFAULT_ZONE_DISCLAIMER,

    hasPackages: zone.packages.length > 0,

    forbiddenAtomIds: ZONE_FORBIDDEN_ATOMS[zoneId] ?? new Set(),
  };
}

const ZONE_REGISTRY = new Map<PlumbingZoneId, PlumbingZoneDefinition>(
  PLUMBING_SNAPSHOT.zones.map((zone) => [
    zone.code as PlumbingZoneId,
    buildZoneDefinition(zone),
  ]),
);

export function getPlumbingZoneDefinition(
  zoneId: PlumbingZoneId,
): PlumbingZoneDefinition {
  const definition = ZONE_REGISTRY.get(zoneId);

  if (!definition) {
    throw new Error(`Unknown plumbing zone: ${zoneId}`);
  }

  return definition;
}

function getSnapshotZone(zoneId: PlumbingZoneId): PlumbingSnapshotZone {
  const zone = SNAPSHOT_ZONES.get(zoneId);

  if (!zone) {
    throw new Error(`plumbing.snapshot: нет зоны ${zoneId}`);
  }

  return zone;
}

export const KITCHEN_SINK_ZONE_DISCLAIMER = getPlumbingZoneDefinition(
  PLUMBING_ZONE_IDS.KITCHEN_SINK,
).disclaimer;

export const KITCHEN_DISHWASHER_ZONE_DISCLAIMER = getPlumbingZoneDefinition(
  PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER,
).disclaimer;

export const BATHROOM_SHOWER_ZONE_DISCLAIMER = getPlumbingZoneDefinition(
  PLUMBING_ZONE_IDS.BATHROOM_SHOWER,
).disclaimer;

export const BATHROOM_INSTALL_RELOCATION_ZONE_DISCLAIMER =
  getPlumbingZoneDefinition(
    PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION,
  ).disclaimer;

export function getZonePackageLabels(
  zoneId: PlumbingZoneId,
): Record<PlumbingPackageLevel, string> {
  const zone = getSnapshotZone(zoneId);

  if (!zone.packages.length) {
    return Object.fromEntries(
      PACKAGE_LEVELS.map((level) => [level, `Пакет ${level.toUpperCase()}`]),
    ) as Record<PlumbingPackageLevel, string>;
  }

  return Object.fromEntries(
    PACKAGE_LEVELS.map((level) => {
      const variant = zone.packages.find((pkg) => pkg.code === level);

      return [level, variant?.label ?? `Пакет ${level.toUpperCase()}`];
    }),
  ) as Record<PlumbingPackageLevel, string>;
}

export const kitchenSinkPackageLabels = getZonePackageLabels(
  PLUMBING_ZONE_IDS.KITCHEN_SINK,
);

export const dishwasherPackageLabels = getZonePackageLabels(
  PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER,
);

export const showerPackageLabels = getZonePackageLabels(
  PLUMBING_ZONE_IDS.BATHROOM_SHOWER,
);

type ZoneAtom = {
  id: string;

  title: string;

  unit: string;

  publicPrice: number;

  quantity: number;

  category: EstimateCostCategory;
};

type BuiltZone = {
  definition: PlumbingZoneDefinition;

  base: ZoneAtom[];

  packages: Record<PlumbingPackageLevel, ZoneAtom[]>;

  /** Запечённые итоги зоны (с резервом) из снапшота — по уровню пакета. */
  bakedTotals: Record<PlumbingPackageLevel, number>;
};

function compositionToZoneAtom(row: PlumbingSnapshotComposition): ZoneAtom {
  const item = SNAPSHOT_ITEMS.get(row.itemCode);

  if (!item) {
    throw new Error(`plumbing.snapshot: нет позиции ${row.itemCode}`);
  }

  const rowCoef = row.coefficient ?? 1;

  return {
    id: item.code,

    title: item.title,

    unit: item.unit,

    publicPrice: item.unitPrice,

    quantity: row.quantity * rowCoef,

    category: item.category,
  };
}

function buildZoneFromSnapshot(zone: PlumbingSnapshotZone): BuiltZone {
  const definition = buildZoneDefinition(zone);

  const base = zone.base.map(compositionToZoneAtom);

  const hasPackages = zone.packages.length > 0;

  const emptyPackage: ZoneAtom[] = [];

  const packages = Object.fromEntries(
    PACKAGE_LEVELS.map((level) => {
      if (!hasPackages) {
        return [level, emptyPackage];
      }

      const variant = zone.packages.find((pkg) => pkg.code === level);

      if (!variant) {
        throw new Error(`${zone.code}: нет пакета ${level}`);
      }

      return [level, variant.items.map(compositionToZoneAtom)];
    }),
  ) as Record<PlumbingPackageLevel, ZoneAtom[]>;

  const bakedTotals = Object.fromEntries(
    PACKAGE_LEVELS.map((level) => {
      if (!hasPackages) {
        return [level, zone.total];
      }

      const variant = zone.packages.find((pkg) => pkg.code === level);

      return [level, variant ? variant.total : zone.total];
    }),
  ) as Record<PlumbingPackageLevel, number>;

  return { definition, base, packages, bakedTotals };
}

const BUILT_ZONES = new Map<PlumbingZoneId, BuiltZone>(
  PLUMBING_SNAPSHOT.zones.map((zone) => [
    zone.code as PlumbingZoneId,
    buildZoneFromSnapshot(zone),
  ]),
);

function getBuiltZone(zoneId: PlumbingZoneId): BuiltZone {
  const zone = BUILT_ZONES.get(zoneId);

  if (!zone) {
    throw new Error(`Zone not built: ${zoneId}`);
  }

  return zone;
}

const KITCHEN_SINK_ZONE = getBuiltZone(PLUMBING_ZONE_IDS.KITCHEN_SINK);

/** Канонический состав zone-kitchen-sink из seed (база + пакеты). */

export const KITCHEN_SINK_ZONE_BASE_ATOMIC_IDS = KITCHEN_SINK_ZONE.base.map(
  (atom) => atom.id,
);

export const KITCHEN_SINK_ZONE_PACKAGE_ATOMIC_IDS = Object.fromEntries(
  PACKAGE_LEVELS.map((level) => [
    level,
    KITCHEN_SINK_ZONE.packages[level].map((atom) => atom.id),
  ]),
) as Record<PlumbingPackageLevel, string[]>;

export type FilterClientSpecLinesOptions = {
  /** Строки пакета — всегда в spec (с note «уточняется» при total=0). */

  alwaysShowIds?: ReadonlySet<string>;
};

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
      zoneIdPrefix != null
        ? atomIdFromZoneLineId(zoneIdPrefix, item.id)
        : item.id;

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

function zoneAtomToLineItem(
  zoneIdPrefix: string,
  atom: ZoneAtom,
): EstimateLineItem {
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
  return packageAtoms
    .map((atom) => zoneAtomToLineItem(zoneIdPrefix, atom))
    .map((line) => {
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

  const allowedPackage = allowAtom
    ? packageAtoms.filter(allowAtom)
    : packageAtoms;

  const packageIds = new Set(allowedPackage.map((atom) => atom.id));

  const baseLines = filterClientSpecLines(
    allowedBase.map((atom) => zoneAtomToLineItem(zoneIdPrefix, atom)),

    { alwaysShowIds: packageIds, zoneIdPrefix },
  );

  return [
    ...baseLines,
    ...packageCompositionSpecLines(zoneIdPrefix, allowedPackage),
  ];
}

function resolveAllowAtom(
  zoneId: PlumbingZoneId,
): ((atom: ZoneAtom) => boolean) | undefined {
  if (zoneId === PLUMBING_ZONE_IDS.KITCHEN_SINK) {
    return isAllowedSinkZoneAtom;
  }

  return undefined;
}

export function getZoneSpecItems(
  zoneId: PlumbingZoneId,
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem[] {
  const zone = getBuiltZone(zoneId);

  return buildZoneSpecItems(
    zone.definition.lineIdPrefix,

    zone.base,

    zone.packages[packageLevel],

    resolveAllowAtom(zoneId),
  );
}

function computeZoneTotals(
  baseAtoms: ZoneAtom[],
  packageAtoms: ZoneAtom[],
  bakedTotal: number,
) {
  const baseTotal = atomsSubtotal(baseAtoms);

  const packageTotal = atomsSubtotal(packageAtoms);

  const subtotal = baseTotal + packageTotal;

  // Резерв уже запечён в `bakedTotal` снапшота (Q3); клиент не считает процент
  // сам, а выводит запечённую сумму. Остаток = разница с суммой атомов.
  const total = bakedTotal;

  const riskAmount = total - subtotal;

  return { baseTotal, packageTotal, subtotal, riskAmount, total };
}

export function getZoneSectionItem(
  zoneId: PlumbingZoneId,
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem {
  const result = calculateZone(zoneId, packageLevel);

  const zone = getBuiltZone(zoneId);

  return {
    id: zone.definition.lineIdPrefix,

    sectionId: "plumbing",

    title: zone.definition.title,

    category: "works",

    quantity: 1,

    unit: "комплект",

    unitPrice: result.total,

    total: result.total,

    isIncluded: true,
  };
}

export type PlumbingZoneResult = {
  zoneId: PlumbingZoneId;

  packageLevel: PlumbingPackageLevel;

  baseTotal: number;

  packageTotal: number;

  subtotal: number;

  riskAmount: number;

  total: number;

  sectionItem: EstimateLineItem;

  specItems: EstimateLineItem[];
};

export function calculateZone(
  zoneId: PlumbingZoneId,
  packageLevel: PlumbingPackageLevel,
): PlumbingZoneResult {
  const zone = getBuiltZone(zoneId);

  const totals = computeZoneTotals(
    zone.base,
    zone.packages[packageLevel],
    zone.bakedTotals[packageLevel],
  );

  return {
    zoneId,

    packageLevel,

    ...totals,

    sectionItem: {
      id: zone.definition.lineIdPrefix,

      sectionId: "plumbing",

      title: zone.definition.title,

      category: "works",

      quantity: 1,

      unit: "комплект",

      unitPrice: totals.total,

      total: totals.total,

      isIncluded: true,
    },

    specItems: getZoneSpecItems(zoneId, packageLevel),
  };
}

export function calculateZoneTotal(
  zoneId: PlumbingZoneId,
  packageLevel: PlumbingPackageLevel,
): number {
  return calculateZone(zoneId, packageLevel).total;
}

export function getZonePackageTotal(
  zoneId: PlumbingZoneId,
  packageLevel: PlumbingPackageLevel,
): number {
  return calculateZoneTotal(zoneId, packageLevel);
}

// --- Backward-compatible kitchen sink API ---

export type KitchenSinkZoneResult = PlumbingZoneResult;

export type DishwasherZoneResult = PlumbingZoneResult;

export function getKitchenSinkZoneSpecItems(
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem[] {
  return getZoneSpecItems(PLUMBING_ZONE_IDS.KITCHEN_SINK, packageLevel);
}

export function getDishwasherZoneSpecItems(
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem[] {
  return getZoneSpecItems(PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER, packageLevel);
}

export function getShowerZoneSpecItems(
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem[] {
  return getZoneSpecItems(PLUMBING_ZONE_IDS.BATHROOM_SHOWER, packageLevel);
}

export function getInstallRelocationZoneSpecItems(): EstimateLineItem[] {
  return getZoneSpecItems(PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION, "b");
}

export function getKitchenSinkZoneSectionItem(
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem {
  return getZoneSectionItem(PLUMBING_ZONE_IDS.KITCHEN_SINK, packageLevel);
}

export function getDishwasherZoneSectionItem(
  packageLevel: PlumbingPackageLevel,
): EstimateLineItem {
  return getZoneSectionItem(PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER, packageLevel);
}

export function calculateKitchenSinkZone(
  packageLevel: PlumbingPackageLevel,
): KitchenSinkZoneResult {
  return calculateZone(PLUMBING_ZONE_IDS.KITCHEN_SINK, packageLevel);
}

export function calculateDishwasherZone(
  packageLevel: PlumbingPackageLevel,
): DishwasherZoneResult {
  return calculateZone(PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER, packageLevel);
}

export function calculateShowerZone(
  packageLevel: PlumbingPackageLevel,
): PlumbingZoneResult {
  return calculateZone(PLUMBING_ZONE_IDS.BATHROOM_SHOWER, packageLevel);
}

export function calculateInstallRelocationZone(): PlumbingZoneResult {
  return calculateZone(PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION, "b");
}

export function getKitchenSinkZonePackageTotal(
  packageLevel: PlumbingPackageLevel,
): number {
  return getZonePackageTotal(PLUMBING_ZONE_IDS.KITCHEN_SINK, packageLevel);
}

export function calculateKitchenSinkZoneTotal(
  packageLevel: PlumbingPackageLevel,
): number {
  return calculateZoneTotal(PLUMBING_ZONE_IDS.KITCHEN_SINK, packageLevel);
}

export function getDishwasherZonePackageTotal(
  packageLevel: PlumbingPackageLevel,
): number {
  return getZonePackageTotal(
    PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER,
    packageLevel,
  );
}

export function getShowerZonePackageTotal(
  packageLevel: PlumbingPackageLevel,
): number {
  return getZonePackageTotal(PLUMBING_ZONE_IDS.BATHROOM_SHOWER, packageLevel);
}

export function getInstallRelocationZoneTotal(): number {
  return calculateZoneTotal(PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION, "b");
}

function isZoneLine(item: EstimateLineItem, lineIdPrefix: string): boolean {
  return item.id === lineIdPrefix || item.id.startsWith(`${lineIdPrefix}-`);
}

function isKitchenSinkZoneLine(item: EstimateLineItem): boolean {
  return isZoneLine(
    item,
    getPlumbingZoneDefinition(PLUMBING_ZONE_IDS.KITCHEN_SINK).lineIdPrefix,
  );
}

function isDishwasherZoneLine(item: EstimateLineItem): boolean {
  return isZoneLine(
    item,
    getPlumbingZoneDefinition(PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER)
      .lineIdPrefix,
  );
}

function isShowerZoneLine(item: EstimateLineItem): boolean {
  return isZoneLine(
    item,
    getPlumbingZoneDefinition(PLUMBING_ZONE_IDS.BATHROOM_SHOWER).lineIdPrefix,
  );
}

function isInstallRelocationZoneLine(item: EstimateLineItem): boolean {
  return isZoneLine(
    item,
    getPlumbingZoneDefinition(PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION)
      .lineIdPrefix,
  );
}

function isLegacyDishwasherOutputLine(item: EstimateLineItem): boolean {
  return LEGACY_PLUMBING_LINE_IDS.DISHWASHER_OUTPUT.some(
    (legacyId) => item.id === legacyId || item.id.startsWith(`${legacyId}-`),
  );
}

function isLegacyKitchenSinkLine(item: EstimateLineItem): boolean {
  if (
    item.id === "kitchen-sink-zone" ||
    item.id.startsWith("kitchen-sink-zone-")
  ) {
    return false;
  }

  return LEGACY_PLUMBING_LINE_IDS.KITCHEN_SINK.some(
    (legacyId) => item.id === legacyId || item.id.startsWith(`${legacyId}-`),
  );
}

function isLegacyBathLine(item: EstimateLineItem): boolean {
  return LEGACY_PLUMBING_LINE_IDS.ACRYLIC_BATH.some(
    (legacyId) => item.id === legacyId || item.id.startsWith(`${legacyId}-`),
  );
}

export type EstimateSpecSection = EstimateSection & {
  specIntro?: string;
};

export type ExpandPlumbingSectionForSpecOptions = {
  kitchenSinkPackageLevel: PlumbingPackageLevel;

  includeKitchenSink: boolean;

  dishwasherPackageLevel?: PlumbingPackageLevel;

  includeDishwasher?: boolean;

  showerPackageLevel?: PlumbingPackageLevel;

  includeShower?: boolean;

  includeInstallRelocation?: boolean;

  // A8.2: мигрированные legacy-опции (единый итог без пакетов).
  includeBathroomSet?: boolean;

  includeBath?: boolean;

  includeHygienicShower?: boolean;

  includeElectricTowelRail?: boolean;

  includeWasherOutput?: boolean;

  includeWaterNode?: boolean;

  includeLeakProtection?: boolean;
};

/** A8.2: простые мигрированные зоны (без пакетов) — флаг опции → zoneId. */
const MIGRATED_SIMPLE_ZONE_FLAGS: ReadonlyArray<
  [keyof ExpandPlumbingSectionForSpecOptions, PlumbingZoneId]
> = [
  ["includeBathroomSet", PLUMBING_ZONE_IDS.BATHROOM_SET],
  ["includeBath", PLUMBING_ZONE_IDS.BATHROOM_BATH],
  ["includeHygienicShower", PLUMBING_ZONE_IDS.BATHROOM_HYGIENIC_SHOWER],
  ["includeElectricTowelRail", PLUMBING_ZONE_IDS.BATHROOM_TOWEL_RAIL],
  ["includeWasherOutput", PLUMBING_ZONE_IDS.TECH_WASHER_OUTPUT],
  ["includeWaterNode", PLUMBING_ZONE_IDS.WATER_NODE],
  ["includeLeakProtection", PLUMBING_ZONE_IDS.WATER_LEAK_PROTECTION],
];

type ActiveZoneSpec = {
  zoneId: PlumbingZoneId;

  lineIdPrefix: string;

  packageLevel: PlumbingPackageLevel;

  disclaimer?: string;

  isLine: (item: EstimateLineItem) => boolean;
};

function buildActiveZones(
  options: ExpandPlumbingSectionForSpecOptions,
): ActiveZoneSpec[] {
  const zones: ActiveZoneSpec[] = [];

  if (options.includeKitchenSink) {
    const definition = getPlumbingZoneDefinition(
      PLUMBING_ZONE_IDS.KITCHEN_SINK,
    );

    zones.push({
      zoneId: PLUMBING_ZONE_IDS.KITCHEN_SINK,

      lineIdPrefix: definition.lineIdPrefix,

      packageLevel: options.kitchenSinkPackageLevel,

      disclaimer: definition.disclaimer,

      isLine: isKitchenSinkZoneLine,
    });
  }

  if (options.includeDishwasher) {
    zones.push({
      zoneId: PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER,

      lineIdPrefix: getPlumbingZoneDefinition(
        PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER,
      ).lineIdPrefix,

      packageLevel: options.dishwasherPackageLevel ?? "b",

      isLine: isDishwasherZoneLine,
    });
  }

  if (options.includeShower) {
    const definition = getPlumbingZoneDefinition(
      PLUMBING_ZONE_IDS.BATHROOM_SHOWER,
    );

    zones.push({
      zoneId: PLUMBING_ZONE_IDS.BATHROOM_SHOWER,

      lineIdPrefix: definition.lineIdPrefix,

      packageLevel: options.showerPackageLevel ?? "b",

      disclaimer: definition.disclaimer,

      isLine: isShowerZoneLine,
    });
  }

  if (options.includeInstallRelocation) {
    const definition = getPlumbingZoneDefinition(
      PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION,
    );

    zones.push({
      zoneId: PLUMBING_ZONE_IDS.BATHROOM_INSTALL_RELOCATION,

      lineIdPrefix: definition.lineIdPrefix,

      packageLevel: "b",

      disclaimer: definition.disclaimer,

      isLine: isInstallRelocationZoneLine,
    });
  }

  // A8.2: мигрированные legacy-опции — простые зоны без пакетов и без disclaimer-интро.
  for (const [flag, zoneId] of MIGRATED_SIMPLE_ZONE_FLAGS) {
    if (!options[flag]) {
      continue;
    }

    const lineIdPrefix = getPlumbingZoneDefinition(zoneId).lineIdPrefix;

    zones.push({
      zoneId,

      lineIdPrefix,

      packageLevel: "b",

      isLine: (item) => isZoneLine(item, lineIdPrefix),
    });
  }

  return zones;
}

/** Разворачивает активные зоны в атомы для клиентской спецификации (без строки резерва). */

export function expandPlumbingSectionForSpec(
  section: EstimateSection,

  kitchenSinkPackageLevelOrOptions:
    | PlumbingPackageLevel
    | ExpandPlumbingSectionForSpecOptions,

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

  const activeZones = buildActiveZones(options);

  if (activeZones.length === 0) {
    return section;
  }

  const activeLinePrefixes = new Set(
    activeZones.map((zone) => zone.lineIdPrefix),
  );

  const expandedItems: EstimateLineItem[] = [];

  let specIntro: string | undefined;

  for (const item of section.items) {
    if (
      isLegacyKitchenSinkLine(item) ||
      isLegacyDishwasherOutputLine(item) ||
      isLegacyBathLine(item)
    ) {
      continue;
    }

    const matchingZone = activeZones.find(
      (zone) => item.id === zone.lineIdPrefix,
    );

    if (matchingZone) {
      if (!specIntro && matchingZone.disclaimer) {
        specIntro = matchingZone.disclaimer;
      }

      expandedItems.push(
        ...getZoneSpecItems(matchingZone.zoneId, matchingZone.packageLevel),
      );

      continue;
    }

    if (activeZones.some((zone) => zone.isLine(item))) {
      continue;
    }

    if (
      [...activeLinePrefixes].some((prefix) => item.id.startsWith(`${prefix}-`))
    ) {
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

export function sumKitchenSinkZoneSpecLines(
  specItems: EstimateLineItem[],
): number {
  return specItems.reduce(
    (sum, item) => sum + (item.isIncluded ? item.total : 0),
    0,
  );
}

export function isKitchenSinkZoneSpecLine(item: EstimateLineItem): boolean {
  return isKitchenSinkZoneLine(item);
}

export function isSinkZoneContaminantLine(item: EstimateLineItem): boolean {
  if (!isKitchenSinkZoneLine(item)) {
    return false;
  }

  const atomId = item.id.slice(
    `${getPlumbingZoneDefinition(PLUMBING_ZONE_IDS.KITCHEN_SINK).lineIdPrefix}-`
      .length,
  );

  return (
    SINK_ZONE_FORBIDDEN_ATOMIC_IDS.has(atomId) || isDishwasherAtomicId(atomId)
  );
}

export function isPlumbingZoneSpecLine(item: EstimateLineItem): boolean {
  return (
    isKitchenSinkZoneLine(item) ||
    isDishwasherZoneLine(item) ||
    isShowerZoneLine(item) ||
    isInstallRelocationZoneLine(item)
  );
}
