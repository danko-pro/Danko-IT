// DTO/payload-контракты REST API каталога полов и публичного flooring-v1 snapshot.
// Имена полей API — snake_case (как у backend); draft-модель редактора — camelCase в flooring-mappers.ts.

import type { FlooringSnapshot } from "../../public/public-flooring-snapshot";

export type FlooringCoveringConsumableDto = {
  title: string;
  consumption_per_m2: number;
  unit: string;
  price_per_unit: number;
};

export type FlooringCoveringDto = {
  id: number;
  title: string;
  material_price_per_m2: number;
  labor_price_per_m2: number;
  base_waste_percent: number;
  underlay_mode: string;
  underlay_consumption_per_m2: number;
  glue_consumption_per_m2: number;
  glue_unit: string;
  glue_price_per_unit: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  svp_consumption_per_m2: number;
  svp_unit: string;
  svp_price_per_unit: number;
  grout_consumption_per_m2: number;
  grout_unit: string;
  grout_price_per_unit: number;
  custom_consumables_json?: string | null;
  needs_plinth: number | boolean;
  instrument_price_per_m2: number;
  note?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
};

export type FlooringPreparationDto = {
  id: number;
  title: string;
  labor_price_per_m2: number;
  material_price_per_m2: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  note?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
};

export type FlooringLayoutDto = {
  id: number;
  title: string;
  labor_multiplier: number;
  extra_waste_percent: number;
  note?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
};

export type FlooringAssemblySection = "covering" | "work" | "preparation" | "consumable" | "tool";

export type FlooringAssemblyRowKind = "work" | "material" | "consumable" | "tool";

export type FlooringAssemblyFormula =
  | "flat_per_m2"
  | "unit_consumption"
  | "package_consumption"
  | "layer_consumption"
  | "piece_consumption"
  | "kg_layer_consumption"
  | "liquid_layers"
  | "roll_meter_consumption"
  | "sheet_area_consumption"
  | "fixed_area_allocation";

export type FlooringAssemblyItemDto = {
  id: number;
  source_code: string;
  section: FlooringAssemblySection;
  title: string;
  kind: FlooringAssemblyRowKind;
  formula: FlooringAssemblyFormula;
  unit: string;
  price: number;
  consumption_per_m2: number;
  package_size?: number | null;
  layer_mm?: number | null;
  note?: string | null;
  is_active?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type FlooringCoveringConsumablePayload = {
  title: string;
  consumption_per_m2: number;
  unit: string;
  price_per_unit: number;
};

export type FlooringCoveringCreatePayload = {
  title: string;
  material_price_per_m2: number;
  labor_price_per_m2: number;
  base_waste_percent: number;
  underlay_mode: string;
  underlay_consumption_per_m2: number;
  glue_consumption_per_m2: number;
  glue_unit: string;
  glue_price_per_unit: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  svp_consumption_per_m2: number;
  svp_unit: string;
  svp_price_per_unit: number;
  grout_consumption_per_m2: number;
  grout_unit: string;
  grout_price_per_unit: number;
  custom_consumables: FlooringCoveringConsumablePayload[];
  needs_plinth: boolean;
  instrument_price_per_m2: number;
  note: string | null;
};

export type FlooringPreparationCreatePayload = {
  title: string;
  labor_price_per_m2: number;
  material_price_per_m2: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  note: string | null;
};

export type FlooringLayoutCreatePayload = {
  title: string;
  labor_multiplier: number;
  extra_waste_percent: number;
  note: string | null;
};

export type FlooringAssemblyItemPayload = {
  source_code?: string | null;
  section: FlooringAssemblySection;
  title: string;
  kind: FlooringAssemblyRowKind;
  formula: FlooringAssemblyFormula;
  unit: string;
  price: number;
  consumption_per_m2: number;
  package_size?: number | null;
  layer_mm?: number | null;
  note: string | null;
  sort_order?: number | null;
};

export type FlooringCoveringUpdatePayload = FlooringCoveringCreatePayload;
export type FlooringPreparationUpdatePayload = FlooringPreparationCreatePayload;
export type FlooringLayoutUpdatePayload = FlooringLayoutCreatePayload;
export type FlooringAssemblyItemUpdatePayload = FlooringAssemblyItemPayload;

/** Публичный ответ GET /api/public/catalog/flooring/snapshot (контракт flooring-v1). */
export type PublicFlooringSnapshotResponse = FlooringSnapshot;

// --- Draft-модель catalog-editor (будущая вкладка «Полы») ---

export type FlooringConsumableDraft = {
  title: string;
  consumptionPerM2: number;
  unit: string;
  pricePerUnit: number;
};

export type FlooringCoveringDraft = {
  id: number;
  title: string;
  materialPricePerM2: number;
  laborPricePerM2: number;
  baseWastePercent: number;
  underlayMode: string;
  underlayConsumptionPerM2: number;
  glueConsumptionPerM2: number;
  glueUnit: string;
  gluePricePerUnit: number;
  primerConsumptionPerM2: number;
  primerUnit: string;
  primerPricePerUnit: number;
  svpConsumptionPerM2: number;
  svpUnit: string;
  svpPricePerUnit: number;
  groutConsumptionPerM2: number;
  groutUnit: string;
  groutPricePerUnit: number;
  customConsumables: FlooringConsumableDraft[];
  needsPlinth: boolean;
  instrumentPricePerM2: number;
  note: string;
};

export type FlooringPreparationDraft = {
  id: number;
  title: string;
  laborPricePerM2: number;
  materialPricePerM2: number;
  primerConsumptionPerM2: number;
  primerUnit: string;
  primerPricePerUnit: number;
  note: string;
};

export type FlooringLayoutDraft = {
  id: number;
  title: string;
  laborFactor: number;
  additionalWastePercent: number;
  note: string;
};

export type FlooringAssemblyItemDraft = {
  id: number;
  sourceCode: string;
  section: FlooringAssemblySection;
  title: string;
  kind: FlooringAssemblyRowKind;
  formula: FlooringAssemblyFormula;
  unit: string;
  price: number;
  consumptionPerM2: number;
  packageSize: number | null;
  layerMm: number | null;
  note: string;
  sortOrder: number;
};

export type FlooringCoveringConsumableRates = {
  materialPricePerM2: number;
  laborPricePerM2: number;
  baseWastePercent: number;
  underlayPricePerM2: number;
  adhesivePricePerM2: number;
  primerPricePerM2: number;
  svpPricePerM2: number;
  groutPricePerM2: number;
  toolConsumablesPerM2: number;
};

export type FlooringSnapshotDisplayRow = {
  section: "coverings" | "preparations" | "layouts" | "plinthTypes" | "globalAddons";
  code: string;
  title: string;
  catalogId?: number;
  rates: Record<string, number>;
};
