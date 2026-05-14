export type CeilingConfigUpdatePayload = {
  default_package_code?: string | null;
  price_factor?: number;
  note?: string | null;
};

export type CeilingCatalogItemPayload = {
  source_code: string;
  title: string;
  category: string;
  unit: string;
  quantity_source?: string | null;
  quantity_formula?: string | null;
  include_section?: string | null;
  package_code?: string | null;
  work_price: number;
  material_price: number;
  equipment_price: number;
  consumables_price: number;
  price_factor: number;
  note?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type CeilingRoomsReplacePayload = {
  rooms: Array<{
    room_id: number;
    default_catalog_item_id?: number | null;
    is_enabled?: boolean;
    ceiling_area_m2?: number | null;
    area_source?: string | null;
    perimeter_m?: number | null;
    perimeter_source?: string | null;
    package_code_snapshot?: string | null;
    note?: string | null;
    sort_order?: number;
  }>;
};

export type ProjectCeilingItemPayload = {
  project_id?: number;
  room_id?: number | null;
  source_catalog_item_id?: number | null;
  source_code_snapshot?: string | null;
  title_snapshot: string;
  category_snapshot?: string | null;
  unit_snapshot: string;
  quantity: number;
  quantity_source?: string | null;
  quantity_formula_snapshot?: string | null;
  work_price_snapshot: number;
  material_price_snapshot: number;
  equipment_price_snapshot: number;
  consumables_price_snapshot: number;
  price_factor_snapshot: number;
  work_total: number;
  material_total: number;
  equipment_total: number;
  consumables_total: number;
  total: number;
  note_snapshot?: string | null;
  is_enabled?: boolean;
  sort_order?: number;
};
