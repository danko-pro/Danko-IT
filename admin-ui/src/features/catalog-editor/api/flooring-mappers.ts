// Маппинг REST DTO каталога полов ↔ draft catalog-editor и строки preview из flooring-v1 snapshot.
// Без сетевых вызовов и React — покрывается unit-тестами.

import type { FlooringSnapshot } from "../../public/public-flooring-snapshot";
import type {
  FlooringAssemblyItemDraft,
  FlooringAssemblyItemDto,
  FlooringAssemblyItemPayload,
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
    labor_price_per_m2: normalizeNum(draft.laborPricePerM2),
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
    labor_multiplier: draft.laborFactor > 0 ? draft.laborFactor : 1,
    extra_waste_percent: normalizeNum(draft.additionalWastePercent),
    note: draft.note.trim() || null,
  };
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

export function snapshotToDisplayRows(snapshot: FlooringSnapshot): FlooringSnapshotDisplayRow[] {
  const rows: FlooringSnapshotDisplayRow[] = [];

  for (const item of snapshot.coverings) {
    rows.push(
      snapshotItemToRow("coverings", item, [
        "materialPricePerM2",
        "laborPricePerM2",
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
    rows.push(snapshotItemToRow("layouts", item, ["laborFactor", "additionalWastePercent"]));
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
