export type CalculatorWallFinishConfig = {
  project_id: number;
  include_preparation: number | boolean;
  include_demolition: number | boolean;
  demolition_price_per_m2: number;
};

export type CalculatorWallFinishCovering = {
  id: number;
  title: string;
  material_price_per_m2: number;
  labor_price_per_m2: number;
  base_waste_percent: number;
  glue_consumption_per_m2: number;
  glue_unit: string;
  glue_price_per_unit: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  putty_consumption_per_m2: number;
  putty_unit: string;
  putty_price_per_unit: number;
  mesh_consumption_per_m2: number;
  mesh_unit: string;
  mesh_price_per_unit: number;
  instrument_price_per_m2: number;
  note: string | null;
  is_active: number;
};

export type CalculatorWallFinishPreparation = {
  id: number;
  title: string;
  labor_price_per_m2: number;
  material_price_per_m2: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  note: string | null;
  is_active: number;
};

export type CalculatorWallFinishLayout = {
  id: number;
  title: string;
  labor_multiplier: number;
  extra_waste_percent: number;
  note: string | null;
  is_active: number;
};

export type CalculatorWallFinishRoom = {
  room_id: number;
  room_name: string;
  selected: boolean;
  covering_id: number | null;
  covering_title: string | null;
  preparation_id: number | null;
  preparation_title: string | null;
  layout_id: number | null;
  layout_title: string | null;
  base_area_m2: number;
  effective_area_m2: number;
  area_m2_override: number | null;
  base_waste_percent: number;
  extra_waste_percent: number;
  total_waste_percent: number;
  purchase_area_m2: number;
  material_price_per_m2: number;
  base_labor_price_per_m2: number;
  layout_multiplier: number;
  labor_price_per_m2: number;
  material_cost: number;
  installation_cost: number;
  preparation_work_cost: number;
  preparation_material_cost: number;
  preparation_total_cost: number;
  glue_qty: number;
  glue_unit: string;
  glue_cost: number;
  primer_qty: number;
  primer_unit: string;
  primer_cost: number;
  putty_qty: number;
  putty_unit: string;
  putty_cost: number;
  mesh_qty: number;
  mesh_unit: string;
  mesh_cost: number;
  demolition_cost: number;
  instrument_cost: number;
  total_cost: number;
  note: string | null;
};

export type CalculatorWallFinishSummary = {
  rooms_count: number;
  total_area_m2: number;
  total_purchase_area_m2: number;
  total_material_cost: number;
  total_installation_cost: number;
  total_preparation_work_cost: number;
  total_preparation_material_cost: number;
  total_preparation_cost: number;
  total_glue_qty: number;
  glue_unit: string;
  total_glue_cost: number;
  total_primer_qty: number;
  primer_unit: string;
  total_primer_cost: number;
  total_putty_qty: number;
  putty_unit: string;
  total_putty_cost: number;
  total_mesh_qty: number;
  mesh_unit: string;
  total_mesh_cost: number;
  total_demolition_cost: number;
  total_instrument_cost: number;
  work_total: number;
  material_total: number;
  grand_total: number;
  price_per_m2: number | null;
};

export type CalculatorWallFinishSpecItem = {
  kind: "work" | "material";
  title: string;
  unit: string;
  quantity: number;
  amount: number;
};

export type CalculatorWallFinishDetail = {
  config: CalculatorWallFinishConfig;
  coverings: CalculatorWallFinishCovering[];
  preparations: CalculatorWallFinishPreparation[];
  layouts: CalculatorWallFinishLayout[];
  rooms: CalculatorWallFinishRoom[];
  summary: CalculatorWallFinishSummary;
  specification: CalculatorWallFinishSpecItem[];
};
