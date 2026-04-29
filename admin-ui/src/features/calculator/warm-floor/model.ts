// Типы warm floor-среза: конфиг, preview/detail, payload и edit state.

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
  pipe_material_title: string;
  manifold_material_items: WarmFloorMaterialItem[];
  pump_material_items: WarmFloorMaterialItem[];
  consumable_material_items: WarmFloorMaterialItem[];
  pump_rooms_threshold: number;
  pump_contours_threshold: number;
};

export type WarmFloorMaterialItem = {
  title: string;
  unit: string;
  quantity: number;
  amount: number;
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
  consumable_material_total: number;
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
  children?: WarmFloorMaterialItem[];
};

export type CalculatorWarmFloorDetail = {
  config: CalculatorWarmFloorConfig;
  rooms: CalculatorWarmFloorRoom[];
  summary: CalculatorWarmFloorSummary;
  specification: CalculatorWarmFloorSpecItem[];
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
  pipe_material_title: string;
  manifold_material_items: WarmFloorMaterialItem[];
  pump_material_items: WarmFloorMaterialItem[];
  consumable_material_items: WarmFloorMaterialItem[];
  pump_rooms_threshold: number;
  pump_contours_threshold: number;
  rooms: Array<{
    room_id: number;
    selected: boolean;
    area_m2_override: number | null;
    note: string | null;
  }>;
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
  pipe_material_title: string;
  manifold_material_items: WarmFloorMaterialItem[];
  pump_material_items: WarmFloorMaterialItem[];
  consumable_material_items: WarmFloorMaterialItem[];
  pump_rooms_threshold: string;
  pump_contours_threshold: string;
  rooms: WarmFloorRoomEditState[];
};
