// Типы для каталога дверей, проектных дверей и комплектующих.

export type CalculatorDoorCatalogItem = {
  id: number;
  title: string;
  width_mm: number;
  height_mm: number;
  thickness_mm: number | null;
  area_m2: number;
  purchase_price: number | null;
  sale_price: number | null;
  install_price: number | null;
  note: string | null;
  is_active: number;
};

export type CalculatorProjectDoor = {
  id: number;
  project_id: number;
  door_catalog_id: number | null;
  title: string | null;
  opening_kind: string;
  width_mm: number | null;
  height_mm: number | null;
  thickness_mm: number | null;
  area_m2: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  install_price: number | null;
  catalog_purchase_price: number | null;
  catalog_sale_price: number | null;
  catalog_install_price: number | null;
  room_a_id: number | null;
  room_b_id: number | null;
  note: string | null;
  catalog_title: string | null;
  room_a_name: string | null;
  room_b_name: string | null;
  components_purchase_total?: number;
  components_sale_total?: number;
  effective_purchase_price?: number;
  effective_sale_price?: number;
  effective_install_price?: number;
  components?: CalculatorProjectDoorComponent[];
};

export type CalculatorDoorComponentCatalogItem = {
  id: number;
  category_code: string;
  title: string;
  unit: string;
  purchase_price: number | null;
  sale_price: number | null;
  note: string | null;
  is_active: number;
};

export type CalculatorProjectDoorComponent = {
  id: number;
  project_door_id: number;
  component_catalog_id: number | null;
  category_code: string;
  title: string;
  unit: string;
  quantity: number;
  purchase_price: number | null;
  sale_price: number | null;
  purchase_total?: number;
  sale_total?: number;
  note: string | null;
  catalog_title: string | null;
  catalog_purchase_price: number | null;
  catalog_sale_price: number | null;
};

export type CalculatorDoorsSummary = {
  total_items: number;
  door_units: number;
  opening_units: number;
  trim_only_units: number;
  purchase_total: number;
  sale_total: number;
  install_total: number;
  grand_total: number;
  margin_total: number;
  components_purchase_total: number;
  components_sale_total: number;
};

export type CalculatorDoorSpecItem = {
  kind: "work" | "material";
  title: string;
  unit: string;
  quantity: number;
  amount: number;
};

export type ProjectDoorAutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

export type DoorCatalogCreateState = {
  title: string;
  width_mm: string;
  height_mm: string;
  thickness_mm: string;
  purchase_price: string;
  sale_price: string;
  install_price: string;
  note: string;
};

export type ProjectDoorCreateState = {
  door_catalog_id: string;
  opening_kind: string;
  title: string;
  width_mm: string;
  height_mm: string;
  thickness_mm: string;
  purchase_price: string;
  sale_price: string;
  install_price: string;
  room_a_id: string;
  room_b_id: string;
  note: string;
};

export type DoorComponentCatalogCreateState = {
  category_code: string;
  title: string;
  unit: string;
  purchase_price: string;
  sale_price: string;
  note: string;
};

export type ProjectDoorComponentState = {
  component_catalog_id: string;
  category_code: string;
  title: string;
  unit: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  note: string;
};
