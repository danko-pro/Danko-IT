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
  rates: Record<string, number>;
};
