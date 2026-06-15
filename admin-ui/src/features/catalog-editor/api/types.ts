// DTO/payload-контракты REST API каталога сантехники (/api/calculator/plumbing/*).
// Имена полей — как у backend (snake_case), маппинг на доменную модель редактора — в mappers.ts.

export type PlumbingEditorSnapshotDto = {
  items: PlumbingCatalogItemDto[];
  zones: PlumbingZoneDto[];
};

export type PlumbingCatalogItemDto = {
  id: number;
  source_code: string;
  public_title: string | null;
  technical_title: string | null;
  category: string;
  unit: string;
  work_price: number;
  material_price: number;
  equipment_price: number;
  consumables_price: number;
  coefficient: number;
  catalog_group: string | null;
  source: string | null;
  note: string | null;
  is_active: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PlumbingZoneCompositionDto = {
  id?: number;
  zone_id?: number;
  package_id?: number;
  atomic_item_id: number | null;
  atomic_source_code: string;
  quantity: number;
  coefficient: number;
  sort_order: number;
};

export type PlumbingZonePackageDto = {
  id: number;
  zone_id: number;
  package_code: string;
  label: string | null;
  sort_order: number;
  items: PlumbingZoneCompositionDto[];
};

export type PlumbingZoneDto = {
  id: number;
  zone_code: string;
  subgroup: string;
  title: string;
  description: string | null;
  disclaimer: string | null;
  risk_percent: number;
  active_package_code: string | null;
  is_active: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // Присутствуют только в detail-ответе (GET /zones/{id}, POST/PATCH /zones, PUT items/packages).
  base?: PlumbingZoneCompositionDto[];
  packages?: PlumbingZonePackageDto[];
};

// --- Payload-и для мутаций ---

export type PlumbingCatalogItemPayload = {
  source_code: string;
  public_title: string;
  category: string;
  unit: string;
  technical_title?: string | null;
  work_price: number;
  material_price: number;
  equipment_price: number;
  consumables_price: number;
  coefficient: number;
  catalog_group?: string | null;
  source?: string | null;
  note?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type PlumbingZonePayload = {
  zone_code: string;
  subgroup: string;
  title: string;
  description?: string | null;
  disclaimer?: string | null;
  risk_percent?: number | null;
  active_package_code?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type PlumbingZoneItemPayload = {
  atomic_source_code: string;
  atomic_item_id?: number | null;
  quantity: number;
  coefficient: number;
  sort_order?: number;
};

export type PlumbingZoneItemsReplacePayload = {
  items: PlumbingZoneItemPayload[];
};

export type PlumbingZonePackagePayload = {
  package_code: string;
  label?: string | null;
  sort_order?: number;
  items: PlumbingZoneItemPayload[];
};

export type PlumbingZonePackagesReplacePayload = {
  packages: PlumbingZonePackagePayload[];
};

// --- Снапшот preview (internal payload: видны итоги + резерв) ---

export type PlumbingSnapshotItem = {
  code: string;
  title: string;
  unit: string;
  category: string;
  unitPrice: number;
};

export type PlumbingSnapshotLine = {
  itemCode: string;
  title: string;
  unit: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PlumbingSnapshotPackage = {
  code: string;
  label: string | null;
  subtotal: number;
  riskAmount: number;
  total: number;
  items: PlumbingSnapshotLine[];
};

export type PlumbingSnapshotZone = {
  code: string;
  subgroup: string;
  title: string;
  disclaimer: string | null;
  riskPercent: number;
  activePackage: string | null;
  baseTotal: number;
  total: number;
  base: PlumbingSnapshotLine[];
  packages: PlumbingSnapshotPackage[];
};

export type PlumbingSnapshotPreview = {
  version: string;
  items: PlumbingSnapshotItem[];
  zones: PlumbingSnapshotZone[];
};

export type PublicWarmFloorConfigDto = {
  config_key: string;
  version: string;
  water_labor_rate_per_m2: number;
  pipe_meters_per_m2: number;
  max_circuit_area_m2: number;
  pump_room_threshold: number;
  pump_circuit_threshold: number;
  pipe_price_per_meter: number;
  chase_labor_per_meter: number;
  small_loop_fittings_material: number;
  small_loop_control_head_material: number;
  small_loop_connection_labor: number;
  manifold_labor: number;
  manifold_material: number;
  pump_labor: number;
  pump_material: number;
  electric_mat_price_per_m2: number;
  electric_breaker_material: number;
  thermostat_material: number;
  electric_wire_material: number;
  electric_installation_labor: number;
  created_at?: string;
  updated_at?: string;
};

export type PublicWarmFloorRateField = Exclude<
  keyof PublicWarmFloorConfigDto,
  "config_key" | "version" | "created_at" | "updated_at"
>;

export type WarmFloorSnapshotPreview = {
  version: string;
  water: Record<string, number>;
  electric: Record<string, number>;
};
