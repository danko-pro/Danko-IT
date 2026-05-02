export type CalculatorFlooringConfig = {
  project_id: number;
  include_underlay: number | boolean;
  include_plinth: number | boolean;
  include_demolition: number | boolean;
  include_preparation: number | boolean;
  default_preparation_id: number | null;
  demolition_price_per_m2: number;
  underlay_price_per_m2: number;
  plinth_material_price_per_m: number;
  plinth_install_price_per_m: number;
  threshold_profile_count: number;
  threshold_profile_price: number;
  global_items_json: string;
};

export type CalculatorFlooringCovering = {
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
  custom_consumables_json: string;
  needs_plinth: number | boolean;
  instrument_price_per_m2: number;
  note: string | null;
  is_active: number;
};

export type CalculatorFlooringCoveringConsumable = {
  title: string;
  consumption_per_m2: number;
  unit: string;
  price_per_unit: number;
};

export type CalculatorFlooringPreparation = {
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

export type CalculatorFlooringLayout = {
  id: number;
  title: string;
  labor_multiplier: number;
  extra_waste_percent: number;
  note: string | null;
  is_active: number;
};

export type CalculatorFlooringRoom = {
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
  base_perimeter_m: number;
  effective_perimeter_m: number;
  plinth_m: number;
  area_m2_override: number | null;
  perimeter_m_override: number | null;
  plinth_m_override: number | null;
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
  underlay_qty: number;
  underlay_cost: number;
  glue_qty: number;
  glue_unit: string;
  glue_cost: number;
  primer_qty: number;
  primer_unit: string;
  primer_cost: number;
  svp_qty: number;
  svp_unit: string;
  svp_cost: number;
  grout_qty: number;
  grout_unit: string;
  grout_cost: number;
  custom_consumables_cost: number;
  plinth_material_cost: number;
  plinth_install_cost: number;
  demolition_cost: number;
  instrument_cost: number;
  total_cost: number;
  note: string | null;
  zones?: CalculatorFlooringRoomZone[];
};

export type CalculatorFlooringRoomZone = {
  id: number;
  covering_id: number | null;
  covering_title: string | null;
  preparation_id: number | null;
  preparation_title: string | null;
  layout_id: number | null;
  layout_title: string | null;
  area_m2: number | null;
  effective_area_m2: number;
  purchase_area_m2: number;
  total_cost: number;
  note: string | null;
};

export type CalculatorFlooringSummary = {
  rooms_count: number;
  total_area_m2: number;
  total_perimeter_m: number;
  total_purchase_area_m2: number;
  total_material_cost: number;
  total_installation_cost: number;
  total_preparation_work_cost: number;
  total_preparation_material_cost: number;
  total_preparation_cost: number;
  total_underlay_qty: number;
  underlay_unit: string;
  total_underlay_cost: number;
  total_glue_qty: number;
  glue_unit: string;
  total_glue_cost: number;
  total_primer_qty: number;
  primer_unit: string;
  total_primer_cost: number;
  total_svp_qty: number;
  svp_unit: string;
  total_svp_cost: number;
  total_grout_qty: number;
  grout_unit: string;
  total_grout_cost: number;
  total_custom_consumables_cost: number;
  total_plinth_m: number;
  total_plinth_material_cost: number;
  total_plinth_install_cost: number;
  total_demolition_cost: number;
  threshold_profile_count: number;
  threshold_profile_cost: number;
  total_instrument_cost: number;
  global_work_cost: number;
  global_material_cost: number;
  work_total: number;
  material_total: number;
  grand_total: number;
  price_per_m2: number | null;
};

export type CalculatorFlooringSpecItem = {
  kind: "work" | "material";
  title: string;
  unit: string;
  quantity: number;
  amount: number;
};

export type CalculatorFlooringGlobalItem = {
  kind: "work" | "material" | "consumable";
  title: string;
  mode: "fixed" | "area" | "perimeter" | "quantity";
  rate: number;
  quantity: number;
  enabled: boolean;
};

export type CalculatorFlooringDetail = {
  config: CalculatorFlooringConfig;
  coverings: CalculatorFlooringCovering[];
  preparations: CalculatorFlooringPreparation[];
  layouts: CalculatorFlooringLayout[];
  rooms: CalculatorFlooringRoom[];
  summary: CalculatorFlooringSummary;
  specification: CalculatorFlooringSpecItem[];
};
