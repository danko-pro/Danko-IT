import {
  CATALOG_CATEGORIES,
  CATALOG_GROUPS,
  CATALOG_SOURCES,
  CATALOG_UNITS,
  DEFAULT_ZONE_RISK_PERCENT,
  PIPE_CLAMP_PER_METER,
  SINK_ZONE_GROOVE_METERS,
  WATER_POINT_FITTINGS_QTY,
  ZONE_SUBGROUPS,
  type CatalogCategory,
  type CatalogItem,
  type CatalogUnit,
  type CatalogZone,
  type ZoneCompositionRow,
  type ZonePriceClassVariant,
} from "./plumbing-seed";

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  works: "Работа",
  materials: "Материал",
  equipment: "Оборудование",
  consumables: "Расходники",
};

export const SINK_ZONE_GROOVE_ITEM_ID = "work-groove-pipe";

export function zoneRiskPercent(zone: CatalogZone): number {
  return zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT;
}

export function activePriceClassVariant(zone: CatalogZone): ZonePriceClassVariant | undefined {
  if (!zone.priceClassVariants?.length) return undefined;
  const activeId = zone.activePriceClassId ?? zone.priceClassVariants[0].id;
  return zone.priceClassVariants.find((variant) => variant.id === activeId) ?? zone.priceClassVariants[0];
}

export function zoneCompositionRows(zone: CatalogZone): ZoneCompositionRow[] {
  const variant = activePriceClassVariant(zone);
  return variant ? [...zone.items, ...variant.items] : zone.items;
}

export function isCatalogItem(value: unknown): value is CatalogItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.publicTitle === "string" &&
    typeof candidate.works === "number" &&
    typeof candidate.materials === "number" &&
    typeof candidate.equipment === "number" &&
    typeof candidate.consumables === "number"
  );
}

export function normalizeItem(raw: CatalogItem): CatalogItem {
  return {
    id: raw.id,
    publicTitle: raw.publicTitle ?? "",
    technicalTitle: raw.technicalTitle ?? "",
    category: CATALOG_CATEGORIES.includes(raw.category) ? raw.category : "materials",
    unit: CATALOG_UNITS.includes(raw.unit) ? raw.unit : "шт",
    works: Number.isFinite(raw.works) ? raw.works : 0,
    materials: Number.isFinite(raw.materials) ? raw.materials : 0,
    equipment: Number.isFinite(raw.equipment) ? raw.equipment : 0,
    consumables: Number.isFinite(raw.consumables) ? raw.consumables : 0,
    coefficient: Number.isFinite(raw.coefficient) && raw.coefficient > 0 ? raw.coefficient : 1,
    group: CATALOG_GROUPS.includes(raw.group) ? raw.group : "Доп.",
    source: CATALOG_SOURCES.includes(raw.source) ? raw.source : "вручную",
  };
}

export function isCatalogZone(value: unknown): value is CatalogZone {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && typeof candidate.title === "string" && Array.isArray(candidate.items);
}

export function normalizePriceClassVariants(raw: unknown): ZonePriceClassVariant[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const variants = raw
    .filter((entry) => entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string")
    .map((entry) => {
      const variant = entry as ZonePriceClassVariant;
      const items = Array.isArray(variant.items)
        ? variant.items
            .filter((row) => row && typeof row.atomicItemId === "string")
            .map((row) => ({
              atomicItemId: row.atomicItemId,
              quantity: Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1,
              coefficient:
                row.coefficient != null && Number.isFinite(row.coefficient) && row.coefficient > 0
                  ? row.coefficient
                  : undefined,
            }))
        : [];
      return {
        id: variant.id,
        label: typeof variant.label === "string" ? variant.label : variant.id,
        items,
      };
    });
  return variants.length > 0 ? variants : undefined;
}

export function normalizeZone(raw: CatalogZone): CatalogZone {
  const subgroup = ZONE_SUBGROUPS.includes(raw.subgroup) ? raw.subgroup : "Доп.";
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((row) => row && typeof row.atomicItemId === "string")
        .map((row) => ({
          atomicItemId: row.atomicItemId,
          quantity: Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1,
          coefficient:
            row.coefficient != null && Number.isFinite(row.coefficient) && row.coefficient > 0
              ? row.coefficient
              : undefined,
        }))
    : [];
  const priceClassVariants = normalizePriceClassVariants(raw.priceClassVariants);
  const riskPercent =
    raw.riskPercent != null && Number.isFinite(raw.riskPercent) && raw.riskPercent >= 0
      ? raw.riskPercent
      : undefined;
  return {
    id: raw.id,
    subgroup,
    title: raw.title ?? "Новая зона",
    description: typeof raw.description === "string" ? raw.description : undefined,
    items,
    riskPercent,
    priceClassVariants,
    activePriceClassId:
      typeof raw.activePriceClassId === "string" &&
      priceClassVariants?.some((variant) => variant.id === raw.activePriceClassId)
        ? raw.activePriceClassId
        : priceClassVariants?.[0]?.id,
  };
}

export function baseSum(item: CatalogItem): number {
  return item.works + item.materials + item.equipment + item.consumables;
}

export function itemUnitPrice(item: CatalogItem): number {
  return Math.round(baseSum(item) * item.coefficient);
}

export function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function compositionQtyHint(atomicItemId: string, quantity: number, unit?: CatalogUnit): string | null {
  const twoPointFittingsQty = WATER_POINT_FITTINGS_QTY * 2;

  if (atomicItemId === "pipe-sewer-50" && quantity === 3.5) {
    return "3,5 м — ориентир на канализацию к мойке";
  }
  if (atomicItemId === "pipe-ppr-d20" && quantity === 20) {
    return "20 м = 10 м × 2 точки (ХВС+ГВС)";
  }
  if (atomicItemId === "pipe-ppr-d20" && unit === "м.п." && quantity > 1) {
    return `${quantity} м — правило: 10 м на водяную точку`;
  }
  if (atomicItemId === "ppr-d20-outlet" && quantity === twoPointFittingsQty) {
    return `12 = ${WATER_POINT_FITTINGS_QTY}×2 точки (ХВС+ГВС)`;
  }
  if (atomicItemId === "ppr-d20-fitting" && quantity === twoPointFittingsQty) {
    return `12 = ${WATER_POINT_FITTINGS_QTY}×2 точки (ХВС+ГВС)`;
  }
  if (
    (atomicItemId === "ppr-d20-outlet" || atomicItemId === "ppr-d20-fitting") &&
    unit === "шт" &&
    quantity > 1
  ) {
    return `${quantity} шт — правило: ${WATER_POINT_FITTINGS_QTY} на водяную точку`;
  }
  if (atomicItemId === "pipe-clamp-ppr-d20" && quantity === 20 * PIPE_CLAMP_PER_METER) {
    return `30 = 20 м × ${PIPE_CLAMP_PER_METER}`;
  }
  if (atomicItemId === "pipe-clamp-sewer" && quantity === 3.5 * PIPE_CLAMP_PER_METER) {
    return `5,25 = 3,5 м × ${PIPE_CLAMP_PER_METER}`;
  }
  if (atomicItemId === SINK_ZONE_GROOVE_ITEM_ID && quantity === SINK_ZONE_GROOVE_METERS) {
    return `${SINK_ZONE_GROOVE_METERS} м — ориентир для зоны мойки без проекта`;
  }
  if (atomicItemId === SINK_ZONE_GROOVE_ITEM_ID && unit === "м.п." && quantity > 0) {
    return `${quantity} м — ориентир штробления без проекта (не 1:1 с трубами)`;
  }
  if (
    (atomicItemId === "pipe-clamp-ppr-d20" || atomicItemId === "pipe-clamp-sewer") &&
    unit === "шт" &&
    quantity > 0
  ) {
    return `${quantity} шт — правило: ${PIPE_CLAMP_PER_METER} на м.п. трубы`;
  }
  return null;
}

export function makeNewItemId(existing: CatalogItem[]): string {
  const ids = new Set(existing.map((item) => item.id));
  let counter = existing.length + 1;
  let candidate = `new-item-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `new-item-${counter}`;
  }
  return candidate;
}

export function makeNewZoneId(existing: CatalogZone[]): string {
  const ids = new Set(existing.map((zone) => zone.id));
  let counter = existing.length + 1;
  let candidate = `zone-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `zone-${counter}`;
  }
  return candidate;
}
