// Маппинг REST DTO каталога полов ↔ draft catalog-editor и строки preview из flooring-v2 snapshot.
// Без сетевых вызовов и React — покрывается unit-тестами.

import type { CoveringAssemblyRow } from "../flooring-assembly";
import type { FlooringSnapshot } from "../../public/public-flooring-snapshot";
import type {
  FlooringAssemblyItemDraft,
  FlooringAssemblyItemDto,
  FlooringAssemblyItemPayload,
  FlooringAssemblyRowKind,
  FlooringAssemblySection,
  FlooringCatalogAssemblyDraft,
  FlooringCatalogAssemblyDto,
  FlooringCatalogAssemblyPayload,
  FlooringCatalogAssemblyRowDraft,
  FlooringCatalogAssemblyRowDto,
  FlooringCatalogAssemblyRowPayload,
  FlooringConsumableDraft,
  FlooringCoveringConsumableRates,
  FlooringCoveringCreatePayload,
  FlooringCoveringDraft,
  FlooringCoveringDto,
  FlooringCoveringUpdatePayload,
  FlooringLayoutCreatePayload,
  FlooringLayoutDraft,
  FlooringLayoutDto,
  FlooringLayoutUpdatePayload,
  FlooringPreparationCreatePayload,
  FlooringPreparationDraft,
  FlooringPreparationDto,
  FlooringPreparationUpdatePayload,
  FlooringSnapshotDisplayRow,
} from "./flooring-types";

const FLOORING_CATALOG_ASSEMBLY_VERSION = "flooring-assembly-v1";

const PUBLIC_CATEGORY_BY_KIND: Record<FlooringAssemblyRowKind, string> = {
  material: "materials",
  work: "works",
  consumable: "consumables",
  tool: "tools",
};

const SECTION_BY_KIND: Record<FlooringAssemblyRowKind, FlooringAssemblySection> = {
  material: "covering",
  work: "work",
  consumable: "consumable",
  tool: "tool",
};

export function normalizeNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export function consumablePricePerM2(consumption: unknown, pricePerUnit: unknown): number {
  return normalizeNum(consumption) * normalizeNum(pricePerUnit);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return normalizeNum(value) !== 0;
}

function parseCustomConsumablesJson(raw: unknown): FlooringConsumableDraft[] {
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (item === null || typeof item !== "object") {
          return null;
        }
        const row = item as Record<string, unknown>;
        const title = normalizeText(row.title);
        if (!title) {
          return null;
        }
        return {
          title,
          consumptionPerM2: normalizeNum(row.consumption_per_m2 ?? row.consumptionPerM2),
          unit: normalizeText(row.unit) || "pcs",
          pricePerUnit: normalizeNum(row.price_per_unit ?? row.pricePerUnit),
        };
      })
      .filter((item): item is FlooringConsumableDraft => item !== null);
  } catch {
    return [];
  }
}

export function coveringDtoToConsumableRates(
  dto: FlooringCoveringDto,
  options?: { underlayPricePerM2?: number },
): FlooringCoveringConsumableRates {
  const underlayMode = normalizeText(dto.underlay_mode) || "none";
  const underlayFromGlobal =
    underlayMode === "none" ? 0 : normalizeNum(options?.underlayPricePerM2 ?? 0) * normalizeNum(dto.underlay_consumption_per_m2);

  const customTotal = parseCustomConsumablesJson(dto.custom_consumables_json).reduce(
    (sum, item) => sum + consumablePricePerM2(item.consumptionPerM2, item.pricePerUnit),
    0,
  );

  return {
    materialPricePerM2: normalizeNum(dto.material_price_per_m2),
    laborPricePerM2: normalizeNum(dto.labor_price_per_m2),
    baseWastePercent: normalizeNum(dto.base_waste_percent),
    underlayPricePerM2: underlayFromGlobal,
    adhesivePricePerM2: consumablePricePerM2(dto.glue_consumption_per_m2, dto.glue_price_per_unit),
    primerPricePerM2: consumablePricePerM2(dto.primer_consumption_per_m2, dto.primer_price_per_unit),
    svpPricePerM2: consumablePricePerM2(dto.svp_consumption_per_m2, dto.svp_price_per_unit),
    groutPricePerM2: consumablePricePerM2(dto.grout_consumption_per_m2, dto.grout_price_per_unit),
    toolConsumablesPerM2: normalizeNum(dto.instrument_price_per_m2) + customTotal,
  };
}

export function dtoToFlooringCoveringDraft(dto: FlooringCoveringDto): FlooringCoveringDraft {
  return {
    id: normalizeNum(dto.id),
    title: normalizeText(dto.title),
    materialPricePerM2: normalizeNum(dto.material_price_per_m2),
    laborPricePerM2: normalizeNum(dto.labor_price_per_m2),
    baseWastePercent: normalizeNum(dto.base_waste_percent),
    underlayMode: normalizeText(dto.underlay_mode) || "none",
    underlayConsumptionPerM2: normalizeNum(dto.underlay_consumption_per_m2),
    glueConsumptionPerM2: normalizeNum(dto.glue_consumption_per_m2),
    glueUnit: normalizeText(dto.glue_unit) || "kg",
    gluePricePerUnit: normalizeNum(dto.glue_price_per_unit),
    primerConsumptionPerM2: normalizeNum(dto.primer_consumption_per_m2),
    primerUnit: normalizeText(dto.primer_unit) || "l",
    primerPricePerUnit: normalizeNum(dto.primer_price_per_unit),
    svpConsumptionPerM2: normalizeNum(dto.svp_consumption_per_m2),
    svpUnit: normalizeText(dto.svp_unit) || "pcs",
    svpPricePerUnit: normalizeNum(dto.svp_price_per_unit),
    groutConsumptionPerM2: normalizeNum(dto.grout_consumption_per_m2),
    groutUnit: normalizeText(dto.grout_unit) || "kg",
    groutPricePerUnit: normalizeNum(dto.grout_price_per_unit),
    customConsumables: parseCustomConsumablesJson(dto.custom_consumables_json),
    needsPlinth: normalizeBool(dto.needs_plinth),
    instrumentPricePerM2: normalizeNum(dto.instrument_price_per_m2),
    note: normalizeText(dto.note),
  };
}

export function dtoToFlooringPreparationDraft(dto: FlooringPreparationDto): FlooringPreparationDraft {
  return {
    id: normalizeNum(dto.id),
    title: normalizeText(dto.title),
    laborPricePerM2: normalizeNum(dto.labor_price_per_m2),
    materialPricePerM2: normalizeNum(dto.material_price_per_m2),
    primerConsumptionPerM2: normalizeNum(dto.primer_consumption_per_m2),
    primerUnit: normalizeText(dto.primer_unit) || "l",
    primerPricePerUnit: normalizeNum(dto.primer_price_per_unit),
    note: normalizeText(dto.note),
  };
}

export function dtoToFlooringLayoutDraft(dto: FlooringLayoutDto): FlooringLayoutDraft {
  return {
    id: normalizeNum(dto.id),
    title: normalizeText(dto.title),
    laborPricePerM2: normalizeNum(dto.labor_price_per_m2),
    laborFactor: normalizeNum(dto.labor_multiplier) > 0 ? normalizeNum(dto.labor_multiplier) : 1,
    additionalWastePercent: normalizeNum(dto.extra_waste_percent),
    note: normalizeText(dto.note),
  };
}

export function dtoToFlooringAssemblyItemDraft(dto: FlooringAssemblyItemDto): FlooringAssemblyItemDraft {
  return {
    id: normalizeNum(dto.id),
    sourceCode: normalizeText(dto.source_code),
    section: dto.section,
    title: normalizeText(dto.title),
    kind: dto.kind,
    formula: dto.formula,
    unit: normalizeText(dto.unit) || "pcs",
    price: normalizeNum(dto.price),
    consumptionPerM2: normalizeNum(dto.consumption_per_m2),
    packageSize: dto.package_size === null || dto.package_size === undefined ? null : normalizeNum(dto.package_size),
    layerMm: dto.layer_mm === null || dto.layer_mm === undefined ? null : normalizeNum(dto.layer_mm),
    note: normalizeText(dto.note),
    sortOrder: normalizeNum(dto.sort_order) || 100,
  };
}

export function coveringDraftToUpdatePayload(draft: FlooringCoveringDraft): FlooringCoveringUpdatePayload {
  return coveringDraftToPayload(draft);
}

export function preparationDraftToUpdatePayload(draft: FlooringPreparationDraft): FlooringPreparationUpdatePayload {
  return preparationDraftToPayload(draft);
}

export function layoutDraftToUpdatePayload(draft: FlooringLayoutDraft): FlooringLayoutUpdatePayload {
  return layoutDraftToPayload(draft);
}

export function assemblyItemDraftToPayload(draft: FlooringAssemblyItemDraft): FlooringAssemblyItemPayload {
  return {
    source_code: draft.sourceCode.trim() || null,
    section: draft.section,
    title: draft.title,
    kind: draft.kind,
    formula: draft.formula,
    unit: draft.unit || "pcs",
    price: normalizeNum(draft.price),
    consumption_per_m2: normalizeNum(draft.consumptionPerM2),
    package_size: draft.packageSize === null ? null : normalizeNum(draft.packageSize),
    layer_mm: draft.layerMm === null ? null : normalizeNum(draft.layerMm),
    note: draft.note.trim() || null,
    sort_order: normalizeNum(draft.sortOrder) || 100,
  };
}

export function coveringDraftToPayload(draft: FlooringCoveringDraft): FlooringCoveringCreatePayload {
  return {
    title: draft.title,
    material_price_per_m2: normalizeNum(draft.materialPricePerM2),
    labor_price_per_m2: 0,
    base_waste_percent: normalizeNum(draft.baseWastePercent),
    underlay_mode: draft.underlayMode || "none",
    underlay_consumption_per_m2: normalizeNum(draft.underlayConsumptionPerM2),
    glue_consumption_per_m2: normalizeNum(draft.glueConsumptionPerM2),
    glue_unit: draft.glueUnit || "kg",
    glue_price_per_unit: normalizeNum(draft.gluePricePerUnit),
    primer_consumption_per_m2: normalizeNum(draft.primerConsumptionPerM2),
    primer_unit: draft.primerUnit || "l",
    primer_price_per_unit: normalizeNum(draft.primerPricePerUnit),
    svp_consumption_per_m2: normalizeNum(draft.svpConsumptionPerM2),
    svp_unit: draft.svpUnit || "pcs",
    svp_price_per_unit: normalizeNum(draft.svpPricePerUnit),
    grout_consumption_per_m2: normalizeNum(draft.groutConsumptionPerM2),
    grout_unit: draft.groutUnit || "kg",
    grout_price_per_unit: normalizeNum(draft.groutPricePerUnit),
    custom_consumables: draft.customConsumables.map((item) => ({
      title: item.title,
      consumption_per_m2: normalizeNum(item.consumptionPerM2),
      unit: item.unit || "pcs",
      price_per_unit: normalizeNum(item.pricePerUnit),
    })),
    needs_plinth: draft.needsPlinth,
    instrument_price_per_m2: normalizeNum(draft.instrumentPricePerM2),
    note: draft.note.trim() || null,
  };
}

export function preparationDraftToPayload(draft: FlooringPreparationDraft): FlooringPreparationCreatePayload {
  return {
    title: draft.title,
    labor_price_per_m2: normalizeNum(draft.laborPricePerM2),
    material_price_per_m2: normalizeNum(draft.materialPricePerM2),
    primer_consumption_per_m2: normalizeNum(draft.primerConsumptionPerM2),
    primer_unit: draft.primerUnit || "l",
    primer_price_per_unit: normalizeNum(draft.primerPricePerUnit),
    note: draft.note.trim() || null,
  };
}

export function layoutDraftToPayload(draft: FlooringLayoutDraft): FlooringLayoutCreatePayload {
  return {
    title: draft.title,
    labor_price_per_m2: normalizeNum(draft.laborPricePerM2),
    labor_multiplier: draft.laborFactor > 0 ? draft.laborFactor : 1,
    extra_waste_percent: normalizeNum(draft.additionalWastePercent),
    note: draft.note.trim() || null,
  };
}

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeNum(value);
}

function catalogAssemblyRowDtoToDraft(dto: FlooringCatalogAssemblyRowDto): FlooringCatalogAssemblyRowDraft {
  return {
    id: dto.id === undefined ? undefined : normalizeNum(dto.id),
    assemblyItemId: optionalNum(dto.assembly_item_id),
    section: dto.section,
    kind: dto.kind,
    formula: dto.formula,
    title: normalizeText(dto.title),
    unit: normalizeText(dto.unit) || "pcs",
    price: normalizeNum(dto.price),
    consumptionPerM2: normalizeNum(dto.consumption_per_m2),
    packageSize: optionalNum(dto.package_size),
    layerMm: optionalNum(dto.layer_mm),
    sortOrder: normalizeNum(dto.sort_order) || 10,
    isEnabled: normalizeBool(dto.is_enabled),
    publicCategory: normalizeText(dto.public_category),
    publicTitle:
      dto.public_title === null || dto.public_title === undefined
        ? null
        : normalizeText(dto.public_title) || null,
  };
}

export function catalogAssemblyDtoToDraft(dto: FlooringCatalogAssemblyDto): FlooringCatalogAssemblyDraft {
  return {
    id: dto.id === undefined ? undefined : normalizeNum(dto.id),
    targetKind: dto.target_kind,
    targetId: normalizeNum(dto.target_id),
    title: normalizeText(dto.title),
    version: normalizeText(dto.version) || FLOORING_CATALOG_ASSEMBLY_VERSION,
    rows: (dto.rows ?? []).map(catalogAssemblyRowDtoToDraft),
  };
}

export function catalogAssemblyRowDraftToPayload(
  draft: FlooringCatalogAssemblyRowDraft,
): FlooringCatalogAssemblyRowPayload {
  return {
    assembly_item_id: draft.assemblyItemId,
    section: draft.section,
    kind: draft.kind,
    formula: draft.formula,
    title: draft.title,
    unit: draft.unit || "pcs",
    price: normalizeNum(draft.price),
    consumption_per_m2: normalizeNum(draft.consumptionPerM2),
    package_size: draft.packageSize === null ? null : normalizeNum(draft.packageSize),
    layer_mm: draft.layerMm === null ? null : normalizeNum(draft.layerMm),
    sort_order: normalizeNum(draft.sortOrder) || 10,
    is_enabled: draft.isEnabled,
    public_category: draft.publicCategory,
    public_title: draft.publicTitle === null ? null : draft.publicTitle.trim() || null,
  };
}

export function catalogAssemblyDraftToPayload(draft: FlooringCatalogAssemblyDraft): FlooringCatalogAssemblyPayload {
  return {
    title: draft.title,
    version: draft.version.trim() || null,
    rows: draft.rows.map(catalogAssemblyRowDraftToPayload),
  };
}

export function assemblyRowsToCatalogAssemblyDraftRows(
  rows: CoveringAssemblyRow[],
  options?: { sortOrderStart?: number },
): FlooringCatalogAssemblyRowDraft[] {
  const sortOrderStart = options?.sortOrderStart ?? 10;
  return rows.map((row, index) => ({
    assemblyItemId: null,
    section: SECTION_BY_KIND[row.kind] ?? "consumable",
    kind: row.kind,
    formula: row.formula,
    title: row.title,
    unit: row.unit || "pcs",
    price: normalizeNum(row.price),
    consumptionPerM2: normalizeNum(row.consumptionPerM2),
    packageSize: row.packageSize === undefined ? null : normalizeNum(row.packageSize),
    layerMm: row.layerMm === undefined ? null : normalizeNum(row.layerMm),
    sortOrder: sortOrderStart + index * 10,
    isEnabled: row.enabled,
    publicCategory: PUBLIC_CATEGORY_BY_KIND[row.kind],
    publicTitle: null,
  }));
}

export function catalogAssemblyDraftRowsToAssemblyRows(
  rows: FlooringCatalogAssemblyRowDraft[],
): CoveringAssemblyRow[] {
  return rows.map((row, index) => ({
    id: row.id !== undefined ? String(row.id) : `catalog-row-${row.sortOrder || index + 1}`,
    title: row.title,
    kind: row.kind,
    formula: row.formula,
    unit: row.unit || "pcs",
    price: normalizeNum(row.price),
    consumptionPerM2: normalizeNum(row.consumptionPerM2),
    packageSize: row.packageSize === null ? undefined : normalizeNum(row.packageSize),
    layerMm: row.layerMm === null ? undefined : normalizeNum(row.layerMm),
    enabled: row.isEnabled,
  }));
}

function snapshotItemToRow(
  section: FlooringSnapshotDisplayRow["section"],
  item: { code: string; title: string } & Record<string, unknown>,
  rateKeys: readonly string[],
): FlooringSnapshotDisplayRow {
  const rates: Record<string, number> = {};
  for (const key of rateKeys) {
    rates[key] = normalizeNum(item[key]);
  }
  return { section, code: item.code, title: item.title, rates };
}

function normalizeCatalogTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function attachCatalogIdsToDisplayRows(
  rows: FlooringSnapshotDisplayRow[],
  catalogs: {
    coverings: FlooringCoveringDto[];
    preparations: FlooringPreparationDto[];
    layouts: FlooringLayoutDto[];
  },
): FlooringSnapshotDisplayRow[] {
  const coveringByTitle = new Map(
    catalogs.coverings.map((item) => [normalizeCatalogTitle(item.title), item.id] as const),
  );
  const preparationByTitle = new Map(
    catalogs.preparations.map((item) => [normalizeCatalogTitle(item.title), item.id] as const),
  );
  const layoutByTitle = new Map(
    catalogs.layouts.map((item) => [normalizeCatalogTitle(item.title), item.id] as const),
  );

  return rows.map((row) => {
    if (row.section === "coverings") {
      const catalogId = coveringByTitle.get(normalizeCatalogTitle(row.title));
      return catalogId ? { ...row, catalogId } : row;
    }
    if (row.section === "preparations") {
      const catalogId = preparationByTitle.get(normalizeCatalogTitle(row.title));
      return catalogId ? { ...row, catalogId } : row;
    }
    if (row.section === "layouts") {
      const catalogId = layoutByTitle.get(normalizeCatalogTitle(row.title));
      return catalogId ? { ...row, catalogId } : row;
    }
    return row;
  });
}

/** Note for catalog rows created from a public flooring-v2 snapshot preview row. */
export const SNAPSHOT_ROW_CREATE_NOTE = "Создано из public snapshot";

/**
 * Underlay in snapshot is aggregated ₽/m² (global underlay price × consumption in catalog).
 * Reversible with {@link coveringDtoToConsumableRates} when `underlayPricePerM2` option is 1:
 * store the snapshot rate as consumption at mode `required` (1 × rate = rate).
 */
export function snapshotUnderlayFieldsFromRate(underlayPricePerM2: number): {
  underlayMode: string;
  underlayConsumptionPerM2: number;
} {
  const rate = normalizeNum(underlayPricePerM2);
  if (rate <= 0) {
    return { underlayMode: "none", underlayConsumptionPerM2: 0 };
  }
  return { underlayMode: "required", underlayConsumptionPerM2: rate };
}

function flatConsumableFromPricePerM2(
  pricePerM2: unknown,
  zeroDefaults: { consumptionPerM2: number; pricePerUnit: number },
): { consumptionPerM2: number; pricePerUnit: number } {
  const rate = normalizeNum(pricePerM2);
  if (rate <= 0) {
    return zeroDefaults;
  }
  return { consumptionPerM2: 1, pricePerUnit: rate };
}

function assertSnapshotRowSection(
  row: FlooringSnapshotDisplayRow,
  expected: FlooringSnapshotDisplayRow["section"],
): void {
  if (row.section !== expected) {
    throw new Error(`snapshot row section must be "${expected}", got "${row.section}"`);
  }
}

export function snapshotCoveringRowToCreatePayload(
  row: FlooringSnapshotDisplayRow,
): FlooringCoveringCreatePayload {
  assertSnapshotRowSection(row, "coverings");
  const rates = row.rates;
  const underlay = snapshotUnderlayFieldsFromRate(rates.underlayPricePerM2);
  const glue = flatConsumableFromPricePerM2(rates.adhesivePricePerM2, { consumptionPerM2: 0, pricePerUnit: 0 });
  const primer = flatConsumableFromPricePerM2(rates.primerPricePerM2, { consumptionPerM2: 0, pricePerUnit: 0 });
  const svp = flatConsumableFromPricePerM2(rates.svpPricePerM2, { consumptionPerM2: 0, pricePerUnit: 0 });
  const grout = flatConsumableFromPricePerM2(rates.groutPricePerM2, { consumptionPerM2: 0, pricePerUnit: 0 });

  return coveringDraftToPayload({
    id: 0,
    title: row.title,
    materialPricePerM2: normalizeNum(rates.materialPricePerM2),
    laborPricePerM2: 0,
    baseWastePercent: normalizeNum(rates.baseWastePercent),
    underlayMode: underlay.underlayMode,
    underlayConsumptionPerM2: underlay.underlayConsumptionPerM2,
    glueConsumptionPerM2: glue.consumptionPerM2,
    glueUnit: "kg",
    gluePricePerUnit: glue.pricePerUnit,
    primerConsumptionPerM2: primer.consumptionPerM2,
    primerUnit: "l",
    primerPricePerUnit: primer.pricePerUnit,
    svpConsumptionPerM2: svp.consumptionPerM2,
    svpUnit: "pcs",
    svpPricePerUnit: svp.pricePerUnit,
    groutConsumptionPerM2: grout.consumptionPerM2,
    groutUnit: "kg",
    groutPricePerUnit: grout.pricePerUnit,
    customConsumables: [],
    needsPlinth: true,
    instrumentPricePerM2: normalizeNum(rates.toolConsumablesPerM2),
    note: SNAPSHOT_ROW_CREATE_NOTE,
  });
}

export function snapshotPreparationRowToCreatePayload(
  row: FlooringSnapshotDisplayRow,
): FlooringPreparationCreatePayload {
  assertSnapshotRowSection(row, "preparations");
  const rates = row.rates;
  return preparationDraftToPayload({
    id: 0,
    title: row.title,
    laborPricePerM2: normalizeNum(rates.laborPricePerM2),
    materialPricePerM2: normalizeNum(rates.materialPricePerM2),
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    note: SNAPSHOT_ROW_CREATE_NOTE,
  });
}

export function snapshotLayoutRowToCreatePayload(row: FlooringSnapshotDisplayRow): FlooringLayoutCreatePayload {
  assertSnapshotRowSection(row, "layouts");
  const rates = row.rates;
  const laborFactor = normalizeNum(rates.laborFactor);
  return layoutDraftToPayload({
    id: 0,
    title: row.title,
    laborPricePerM2: normalizeNum(rates.laborPricePerM2),
    laborFactor: laborFactor > 0 ? laborFactor : 1,
    additionalWastePercent: normalizeNum(rates.additionalWastePercent),
    note: SNAPSHOT_ROW_CREATE_NOTE,
  });
}

export function snapshotToDisplayRows(snapshot: FlooringSnapshot): FlooringSnapshotDisplayRow[] {
  const rows: FlooringSnapshotDisplayRow[] = [];

  for (const item of snapshot.coverings) {
    rows.push(
      snapshotItemToRow("coverings", item, [
        "materialPricePerM2",
        "baseWastePercent",
        "underlayPricePerM2",
        "adhesivePricePerM2",
        "primerPricePerM2",
        "svpPricePerM2",
        "groutPricePerM2",
        "toolConsumablesPerM2",
      ]),
    );
  }
  for (const item of snapshot.preparations) {
    rows.push(snapshotItemToRow("preparations", item, ["laborPricePerM2", "materialPricePerM2"]));
  }
  for (const item of snapshot.layouts) {
    rows.push(snapshotItemToRow("layouts", item, ["laborPricePerM2", "laborFactor", "additionalWastePercent"]));
  }
  for (const item of snapshot.plinthTypes) {
    rows.push(
      snapshotItemToRow("plinthTypes", item, ["materialPricePerMeter", "laborPricePerMeter", "factor"]),
    );
  }
  rows.push({
    section: "globalAddons",
    code: "global",
    title: "Глобальные дополнения",
    rates: {
      thresholdPrice: normalizeNum(snapshot.globalAddons.thresholdPrice),
      demolitionPricePerM2: normalizeNum(snapshot.globalAddons.demolitionPricePerM2),
    },
  });

  return rows;
}
