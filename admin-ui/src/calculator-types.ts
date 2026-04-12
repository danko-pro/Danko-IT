// ????, payload-?????? ? edit-state ????????????.

export type CalculatorProject = {
  id: number;
  name: string;
  note: string | null;
  group_chat_id: number | null;
  created_at: string;
  updated_at: string;
  rooms_count: number;
};

export type CalculatorSummary = {
  rooms_count: number;
  floor_area_m2: number;
  wall_area_gross_m2: number;
  openings_area_m2: number;
  door_area_m2: number;
  wall_area_net_m2: number;
  perimeter_m: number;
  doors_count: number;
  door_purchase_total?: number;
  door_sale_total?: number;
  door_install_total?: number;
  door_components_purchase_total?: number;
  door_components_sale_total?: number;
  is_perimeter_estimated?: number;
  perimeter_source?: string;
};

export type CalculatorWarmFloorConfig = {
  project_id: number;
  work_price_per_m2: number;
  pipe_m_per_m2: number;
  max_contour_area_m2: number;
  small_zone_area_m2: number;
  manifold_work_price: number;
  manifold_material_price: number;
  pump_work_price: number;
  pump_material_price: number;
  pipe_price_per_m: number;
  pump_rooms_threshold: number;
  pump_contours_threshold: number;
};

export type CalculatorWarmFloorRoom = {
  room_id: number;
  room_name: string;
  selected: boolean;
  base_floor_area_m2: number;
  area_m2_override: number | null;
  effective_area_m2: number;
  pipe_m: number;
  contours: number;
  zone_label: string;
  work_total: number;
  note: string | null;
};

export type CalculatorWarmFloorSummary = {
  rooms_count: number;
  total_area_m2: number;
  total_pipe_m: number;
  total_contours: number;
  floor_work_total: number;
  pipe_material_total: number;
  manifold_needed: boolean;
  manifold_work_total: number;
  manifold_material_total: number;
  pump_needed: boolean;
  pump_work_total: number;
  pump_material_total: number;
  work_total: number;
  material_total: number;
  grand_total: number;
  price_per_m2: number | null;
};

export type CalculatorWarmFloorSpecItem = {
  code: string;
  kind: "work" | "material";
  title: string;
  unit: string;
  quantity: number;
  amount: number;
};

export type CalculatorWarmFloorDetail = {
  config: CalculatorWarmFloorConfig;
  rooms: CalculatorWarmFloorRoom[];
  summary: CalculatorWarmFloorSummary;
  specification: CalculatorWarmFloorSpecItem[];
};

export type CalculatorFlooringConfig = {
  project_id: number;
  include_underlay: number | boolean;
  include_plinth: number | boolean;
  include_demolition: number | boolean;
  include_preparation: number | boolean;
  demolition_price_per_m2: number;
  underlay_price_per_m2: number;
  plinth_material_price_per_m: number;
  plinth_install_price_per_m: number;
  threshold_profile_count: number;
  threshold_profile_price: number;
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
  needs_plinth: number | boolean;
  instrument_price_per_m2: number;
  note: string | null;
  is_active: number;
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
  plinth_material_cost: number;
  plinth_install_cost: number;
  demolition_cost: number;
  instrument_cost: number;
  total_cost: number;
  note: string | null;
};

export type CalculatorFlooringSummary = {
  rooms_count: number;
  total_area_m2: number;
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
  total_plinth_m: number;
  total_plinth_material_cost: number;
  total_plinth_install_cost: number;
  total_demolition_cost: number;
  threshold_profile_count: number;
  threshold_profile_cost: number;
  total_instrument_cost: number;
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

export type CalculatorFlooringDetail = {
  config: CalculatorFlooringConfig;
  coverings: CalculatorFlooringCovering[];
  preparations: CalculatorFlooringPreparation[];
  layouts: CalculatorFlooringLayout[];
  rooms: CalculatorFlooringRoom[];
  summary: CalculatorFlooringSummary;
  specification: CalculatorFlooringSpecItem[];
};

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

export type CalculatorRoomSummary = {
  id: number;
  project_id: number;
  name: string;
  ceiling_height_m: number;
  manual_floor_area_m2: number | null;
  auto_perimeter_calc: boolean;
  perimeter_factor: number;
  note: string | null;
  sort_order: number;
  perimeter_m: number;
  floor_area_m2: number;
  wall_area_gross_m2: number;
  openings_area_m2: number;
  door_area_m2: number;
  wall_area_net_m2: number;
};

export type CalculatorProjectDetail = {
  project: CalculatorProject;
  summary: CalculatorSummary;
  rooms: CalculatorRoomSummary[];
  warm_floor: CalculatorWarmFloorDetail;
  flooring: CalculatorFlooringDetail;
  wall_finishes: CalculatorWallFinishDetail;
  doors: CalculatorProjectDoor[];
  door_catalog: CalculatorDoorCatalogItem[];
  door_component_catalog: CalculatorDoorComponentCatalogItem[];
};

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

export type CalculatorWall = {
  id: number;
  room_id: number;
  length_m: number;
  sort_order: number;
};

export type CalculatorFloorSection = {
  id: number;
  room_id: number;
  length_m: number;
  width_m: number;
  sort_order: number;
};

export type CalculatorOpening = {
  id: number;
  room_id: number;
  opening_type: string;
  width_m: number | null;
  height_m: number | null;
  quantity: number;
  area_m2: number | null;
  note: string | null;
  sort_order: number;
};

export type CalculatorRoomCore = {
  id: number;
  project_id: number;
  name: string;
  ceiling_height_m: number;
  manual_floor_area_m2: number | null;
  auto_perimeter_calc: boolean;
  perimeter_factor: number;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CalculatorRoomDetail = {
  room: CalculatorRoomCore;
  walls: CalculatorWall[];
  floor_sections: CalculatorFloorSection[];
  openings: CalculatorOpening[];
  stats: CalculatorSummary;
};

export type CalculatorRoomPayload = {
  name: string;
  ceiling_height_m: number;
  manual_floor_area_m2: number | null;
  auto_perimeter_calc: boolean;
  perimeter_factor: number;
  note: string | null;
  walls_m: number[];
  floor_sections: Array<{ length_m: number | null; width_m: number | null }>;
  openings: Array<{
    opening_type: string;
    width_m: number | null;
    height_m: number | null;
    quantity: number | null;
    area_m2: number | null;
    note: string | null;
  }>;
};

export type CalculatorWarmFloorPayload = {
  work_price_per_m2: number;
  pipe_m_per_m2: number;
  max_contour_area_m2: number;
  small_zone_area_m2: number;
  manifold_work_price: number;
  manifold_material_price: number;
  pump_work_price: number;
  pump_material_price: number;
  pipe_price_per_m: number;
  pump_rooms_threshold: number;
  pump_contours_threshold: number;
  rooms: Array<{
    room_id: number;
    selected: boolean;
    area_m2_override: number | null;
    note: string | null;
  }>;
};

export type CalculatorFlooringPayload = {
  include_underlay: boolean;
  include_plinth: boolean;
  include_demolition: boolean;
  include_preparation: boolean;
  demolition_price_per_m2: number;
  underlay_price_per_m2: number;
  plinth_material_price_per_m: number;
  plinth_install_price_per_m: number;
  threshold_profile_count: number;
  threshold_profile_price: number;
  rooms: Array<{
    room_id: number;
    selected: boolean;
    covering_id: number | null;
    preparation_id: number | null;
    layout_id: number | null;
    area_m2_override: number | null;
    perimeter_m_override: number | null;
    plinth_m_override: number | null;
    note: string | null;
  }>;
};

export type CalculatorFlooringCoveringPayload = {
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
  needs_plinth: boolean;
  instrument_price_per_m2: number;
  note: string | null;
};

export type CalculatorFlooringPreparationPayload = {
  title: string;
  labor_price_per_m2: number;
  material_price_per_m2: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  note: string | null;
};

export type CalculatorFlooringLayoutPayload = {
  title: string;
  labor_multiplier: number;
  extra_waste_percent: number;
  note: string | null;
};

export type CalculatorWallFinishPayload = {
  include_preparation: boolean;
  include_demolition: boolean;
  demolition_price_per_m2: number;
  rooms: Array<{
    room_id: number;
    selected: boolean;
    covering_id: number | null;
    preparation_id: number | null;
    layout_id: number | null;
    area_m2_override: number | null;
    note: string | null;
  }>;
};

export type CalculatorWallFinishCoveringPayload = {
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
};

export type CalculatorWallFinishPreparationPayload = {
  title: string;
  labor_price_per_m2: number;
  material_price_per_m2: number;
  primer_consumption_per_m2: number;
  primer_unit: string;
  primer_price_per_unit: number;
  note: string | null;
};

export type CalculatorWallFinishLayoutPayload = {
  title: string;
  labor_multiplier: number;
  extra_waste_percent: number;
  note: string | null;
};

export type RoomEditState = {
  name: string;
  ceiling_height_m: string;
  manual_floor_area_m2: string;
  auto_perimeter_calc: boolean;
  perimeter_factor: string;
  note: string;
  walls_m: string[];
  floor_sections: Array<{ length_m: string; width_m: string }>;
  openings: Array<{
    opening_type: string;
    width_m: string;
    height_m: string;
    quantity: string;
    area_m2: string;
    note: string;
  }>;
};

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

type WarmFloorRoomEditState = {
  room_id: number;
  selected: boolean;
  area_m2_override: string;
  note: string;
};

export type WarmFloorEditState = {
  work_price_per_m2: string;
  pipe_m_per_m2: string;
  max_contour_area_m2: string;
  small_zone_area_m2: string;
  manifold_work_price: string;
  manifold_material_price: string;
  pump_work_price: string;
  pump_material_price: string;
  pipe_price_per_m: string;
  pump_rooms_threshold: string;
  pump_contours_threshold: string;
  rooms: WarmFloorRoomEditState[];
};

type FlooringRoomEditState = {
  room_id: number;
  selected: boolean;
  covering_id: string;
  preparation_id: string;
  layout_id: string;
  area_m2_override: string;
  perimeter_m_override: string;
  plinth_m_override: string;
  note: string;
};

export type FlooringEditState = {
  include_underlay: boolean;
  include_plinth: boolean;
  include_demolition: boolean;
  include_preparation: boolean;
  demolition_price_per_m2: string;
  underlay_price_per_m2: string;
  plinth_material_price_per_m: string;
  plinth_install_price_per_m: string;
  threshold_profile_count: string;
  threshold_profile_price: string;
  rooms: FlooringRoomEditState[];
};

export type FlooringCoveringCreateState = {
  title: string;
  material_price_per_m2: string;
  labor_price_per_m2: string;
  base_waste_percent: string;
  underlay_mode: string;
  underlay_consumption_per_m2: string;
  glue_consumption_per_m2: string;
  glue_unit: string;
  glue_price_per_unit: string;
  primer_consumption_per_m2: string;
  primer_unit: string;
  primer_price_per_unit: string;
  svp_consumption_per_m2: string;
  svp_unit: string;
  svp_price_per_unit: string;
  grout_consumption_per_m2: string;
  grout_unit: string;
  grout_price_per_unit: string;
  needs_plinth: boolean;
  instrument_price_per_m2: string;
  note: string;
};

export type FlooringPreparationCreateState = {
  title: string;
  labor_price_per_m2: string;
  material_price_per_m2: string;
  primer_consumption_per_m2: string;
  primer_unit: string;
  primer_price_per_unit: string;
  note: string;
};

export type FlooringLayoutCreateState = {
  title: string;
  labor_multiplier: string;
  extra_waste_percent: string;
  note: string;
};

type WallFinishRoomEditState = {
  room_id: number;
  selected: boolean;
  covering_id: string;
  preparation_id: string;
  layout_id: string;
  area_m2_override: string;
  note: string;
};

export type WallFinishEditState = {
  include_preparation: boolean;
  include_demolition: boolean;
  demolition_price_per_m2: string;
  rooms: WallFinishRoomEditState[];
};

export type WallFinishCoveringCreateState = {
  title: string;
  material_price_per_m2: string;
  labor_price_per_m2: string;
  base_waste_percent: string;
  glue_consumption_per_m2: string;
  glue_unit: string;
  glue_price_per_unit: string;
  primer_consumption_per_m2: string;
  primer_unit: string;
  primer_price_per_unit: string;
  putty_consumption_per_m2: string;
  putty_unit: string;
  putty_price_per_unit: string;
  mesh_consumption_per_m2: string;
  mesh_unit: string;
  mesh_price_per_unit: string;
  instrument_price_per_m2: string;
  note: string;
};

export type WallFinishPreparationCreateState = {
  title: string;
  labor_price_per_m2: string;
  material_price_per_m2: string;
  primer_consumption_per_m2: string;
  primer_unit: string;
  primer_price_per_unit: string;
  note: string;
};

export type WallFinishLayoutCreateState = {
  title: string;
  labor_multiplier: string;
  extra_waste_percent: string;
  note: string;
};

export type CalculatorStage = "project" | "rooms" | "doors" | "warmfloor" | "flooring" | "wallfinish";
