// Чистые функции маппинга между REST DTO каталога сантехники и доменной моделью редактора
// (CatalogItem / CatalogZone из plumbing-seed.ts), плюс планировщик синхронизации (diff).
// Без сетевых вызовов и React — легко покрывается unit-тестами.

import {
  CATALOG_CATEGORIES,
  CATALOG_GROUPS,
  CATALOG_SOURCES,
  CATALOG_UNITS,
  DEFAULT_ZONE_RISK_PERCENT,
  ZONE_SUBGROUPS,
  type CatalogCategory,
  type CatalogGroup,
  type CatalogItem,
  type CatalogSource,
  type CatalogUnit,
  type CatalogZone,
  type ZoneCompositionRow,
  type ZonePriceClassVariant,
  type ZoneSubgroup,
} from "../plumbing-seed";
import type {
  PlumbingCatalogItemDto,
  PlumbingCatalogItemPayload,
  PlumbingZoneCompositionDto,
  PlumbingZoneDto,
  PlumbingZoneItemPayload,
  PlumbingZoneItemsReplacePayload,
  PlumbingZonePackagesReplacePayload,
  PlumbingZonePayload,
} from "./types";

const PACKAGE_LABELS: Record<string, string> = {
  c: "Пакет C",
  b: "Пакет B",
  a: "Пакет A",
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function coerceCategory(value: string | null): CatalogCategory {
  return (CATALOG_CATEGORIES as readonly string[]).includes(value ?? "") ? (value as CatalogCategory) : "materials";
}

function coerceUnit(value: string | null): CatalogUnit {
  return (CATALOG_UNITS as readonly string[]).includes(value ?? "") ? (value as CatalogUnit) : "шт";
}

function coerceGroup(value: string | null): CatalogGroup {
  return (CATALOG_GROUPS as readonly string[]).includes(value ?? "") ? (value as CatalogGroup) : "Доп.";
}

function coerceSource(value: string | null): CatalogSource {
  return (CATALOG_SOURCES as readonly string[]).includes(value ?? "") ? (value as CatalogSource) : "вручную";
}

function coerceSubgroup(value: string | null): ZoneSubgroup {
  return (ZONE_SUBGROUPS as readonly string[]).includes(value ?? "") ? (value as ZoneSubgroup) : "Доп.";
}

// --- DTO → доменная модель ---

export function dtoToCatalogItem(dto: PlumbingCatalogItemDto): CatalogItem {
  const coefficient = num(dto.coefficient);
  return {
    id: dto.source_code,
    publicTitle: dto.public_title ?? "",
    technicalTitle: dto.technical_title ?? "",
    category: coerceCategory(dto.category),
    unit: coerceUnit(dto.unit),
    works: num(dto.work_price),
    materials: num(dto.material_price),
    equipment: num(dto.equipment_price),
    consumables: num(dto.consumables_price),
    coefficient: coefficient > 0 ? coefficient : 1,
    group: coerceGroup(dto.catalog_group),
    source: coerceSource(dto.source),
  };
}

function dtoCompositionToRow(dto: PlumbingZoneCompositionDto): ZoneCompositionRow {
  const coefficient = num(dto.coefficient);
  return {
    atomicItemId: dto.atomic_source_code,
    quantity: num(dto.quantity),
    coefficient: coefficient !== 1 && coefficient > 0 ? coefficient : undefined,
  };
}

export function dtoZoneToCatalogZone(dto: PlumbingZoneDto): CatalogZone {
  const packages = dto.packages ?? [];
  const priceClassVariants: ZonePriceClassVariant[] | undefined = packages.length
    ? packages.map((pkg) => ({
        id: pkg.package_code,
        label: pkg.label ?? PACKAGE_LABELS[pkg.package_code] ?? pkg.package_code,
        items: (pkg.items ?? []).map(dtoCompositionToRow),
      }))
    : undefined;

  const activeFromDto = dto.active_package_code ?? undefined;
  const activePriceClassId =
    priceClassVariants && activeFromDto && priceClassVariants.some((variant) => variant.id === activeFromDto)
      ? activeFromDto
      : priceClassVariants?.[0]?.id;

  return {
    id: dto.zone_code,
    subgroup: coerceSubgroup(dto.subgroup),
    title: dto.title ?? "Новая зона",
    description: dto.description ?? undefined,
    riskPercent: dto.risk_percent ?? DEFAULT_ZONE_RISK_PERCENT,
    items: (dto.base ?? []).map(dtoCompositionToRow),
    priceClassVariants,
    activePriceClassId,
  };
}

// --- Доменная модель → payload ---

export function catalogItemToPayload(item: CatalogItem): PlumbingCatalogItemPayload {
  return {
    source_code: item.id,
    public_title: item.publicTitle,
    category: item.category,
    unit: item.unit,
    technical_title: item.technicalTitle || null,
    work_price: num(item.works),
    material_price: num(item.materials),
    equipment_price: num(item.equipment),
    consumables_price: num(item.consumables),
    coefficient: item.coefficient > 0 ? item.coefficient : 1,
    catalog_group: item.group,
    source: item.source,
    sort_order: 100,
  };
}

export function zoneToPayload(zone: CatalogZone): PlumbingZonePayload {
  return {
    zone_code: zone.id,
    subgroup: zone.subgroup,
    title: zone.title,
    description: zone.description ?? null,
    risk_percent: zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT,
    active_package_code: zone.activePriceClassId ?? null,
  };
}

function rowToItemPayload(
  row: ZoneCompositionRow,
  idBySourceCode: Map<string, number>,
  index: number,
): PlumbingZoneItemPayload {
  return {
    atomic_source_code: row.atomicItemId,
    atomic_item_id: idBySourceCode.get(row.atomicItemId) ?? null,
    quantity: num(row.quantity),
    coefficient: row.coefficient != null && row.coefficient > 0 ? row.coefficient : 1,
    sort_order: (index + 1) * 10,
  };
}

export function zoneItemsToPayload(
  zone: CatalogZone,
  idBySourceCode: Map<string, number>,
): PlumbingZoneItemsReplacePayload {
  return {
    items: zone.items.map((row, index) => rowToItemPayload(row, idBySourceCode, index)),
  };
}

export function zonePackagesToPayload(
  zone: CatalogZone,
  idBySourceCode: Map<string, number>,
): PlumbingZonePackagesReplacePayload {
  return {
    packages: (zone.priceClassVariants ?? []).map((variant, packageIndex) => ({
      package_code: variant.id,
      label: variant.label,
      sort_order: (packageIndex + 1) * 10,
      items: variant.items.map((row, index) => rowToItemPayload(row, idBySourceCode, index)),
    })),
  };
}

// --- Планировщик синхронизации (diff локального состояния с последним сохранённым) ---

export type CatalogSnapshot = {
  items: CatalogItem[];
  zones: CatalogZone[];
};

export type CatalogSyncPlan = {
  itemsToCreate: CatalogItem[];
  itemsToUpdate: CatalogItem[];
  itemSourceCodesToDelete: string[];
  zonesToCreate: CatalogZone[];
  zonesToUpdateMeta: CatalogZone[];
  zonesToReplaceItems: CatalogZone[];
  zonesToReplacePackages: CatalogZone[];
  zoneCodesToDelete: string[];
};

function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return map;
}

function itemsEqual(a: CatalogItem, b: CatalogItem): boolean {
  return (
    a.publicTitle === b.publicTitle &&
    a.technicalTitle === b.technicalTitle &&
    a.category === b.category &&
    a.unit === b.unit &&
    a.works === b.works &&
    a.materials === b.materials &&
    a.equipment === b.equipment &&
    a.consumables === b.consumables &&
    a.coefficient === b.coefficient &&
    a.group === b.group &&
    a.source === b.source
  );
}

function zoneMetaEqual(a: CatalogZone, b: CatalogZone): boolean {
  return (
    a.subgroup === b.subgroup &&
    a.title === b.title &&
    (a.description ?? "") === (b.description ?? "") &&
    (a.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT) === (b.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT) &&
    (a.activePriceClassId ?? null) === (b.activePriceClassId ?? null)
  );
}

function rowCoefficient(value: number | undefined): number {
  return value ?? 1;
}

function rowsEqual(a: ZoneCompositionRow[], b: ZoneCompositionRow[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.atomicItemId !== right.atomicItemId ||
      left.quantity !== right.quantity ||
      rowCoefficient(left.coefficient) !== rowCoefficient(right.coefficient)
    ) {
      return false;
    }
  }
  return true;
}

function zoneItemsEqual(a: CatalogZone, b: CatalogZone): boolean {
  return rowsEqual(a.items, b.items);
}

function packagesEqual(
  a: ZonePriceClassVariant[] | undefined,
  b: ZonePriceClassVariant[] | undefined,
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftVariant = left[index];
    const rightVariant = right[index];
    if (
      leftVariant.id !== rightVariant.id ||
      leftVariant.label !== rightVariant.label ||
      !rowsEqual(leftVariant.items, rightVariant.items)
    ) {
      return false;
    }
  }
  return true;
}

function zonePackagesEqual(a: CatalogZone, b: CatalogZone): boolean {
  return packagesEqual(a.priceClassVariants, b.priceClassVariants);
}

export function planCatalogSync(prev: CatalogSnapshot, next: CatalogSnapshot): CatalogSyncPlan {
  const prevItems = byId(prev.items);
  const nextItems = byId(next.items);
  const prevZones = byId(prev.zones);
  const nextZones = byId(next.zones);

  const itemsToCreate: CatalogItem[] = [];
  const itemsToUpdate: CatalogItem[] = [];
  const itemSourceCodesToDelete: string[] = [];

  for (const item of next.items) {
    const previous = prevItems.get(item.id);
    if (!previous) {
      itemsToCreate.push(item);
    } else if (!itemsEqual(previous, item)) {
      itemsToUpdate.push(item);
    }
  }
  for (const item of prev.items) {
    if (!nextItems.has(item.id)) {
      itemSourceCodesToDelete.push(item.id);
    }
  }

  const zonesToCreate: CatalogZone[] = [];
  const zonesToUpdateMeta: CatalogZone[] = [];
  const zonesToReplaceItems: CatalogZone[] = [];
  const zonesToReplacePackages: CatalogZone[] = [];
  const zoneCodesToDelete: string[] = [];

  for (const zone of next.zones) {
    const previous = prevZones.get(zone.id);
    if (!previous) {
      zonesToCreate.push(zone);
      continue;
    }
    if (!zoneMetaEqual(previous, zone)) {
      zonesToUpdateMeta.push(zone);
    }
    if (!zoneItemsEqual(previous, zone)) {
      zonesToReplaceItems.push(zone);
    }
    if (!zonePackagesEqual(previous, zone)) {
      zonesToReplacePackages.push(zone);
    }
  }
  for (const zone of prev.zones) {
    if (!nextZones.has(zone.id)) {
      zoneCodesToDelete.push(zone.id);
    }
  }

  return {
    itemsToCreate,
    itemsToUpdate,
    itemSourceCodesToDelete,
    zonesToCreate,
    zonesToUpdateMeta,
    zonesToReplaceItems,
    zonesToReplacePackages,
    zoneCodesToDelete,
  };
}

export function isEmptyPlan(plan: CatalogSyncPlan): boolean {
  return (
    plan.itemsToCreate.length === 0 &&
    plan.itemsToUpdate.length === 0 &&
    plan.itemSourceCodesToDelete.length === 0 &&
    plan.zonesToCreate.length === 0 &&
    plan.zonesToUpdateMeta.length === 0 &&
    plan.zonesToReplaceItems.length === 0 &&
    plan.zonesToReplacePackages.length === 0 &&
    plan.zoneCodesToDelete.length === 0
  );
}

export function catalogSnapshotsEqual(a: CatalogSnapshot, b: CatalogSnapshot): boolean {
  return isEmptyPlan(planCatalogSync(a, b));
}

export function hasCatalogChanges(prev: CatalogSnapshot, next: CatalogSnapshot): boolean {
  return !catalogSnapshotsEqual(prev, next);
}
