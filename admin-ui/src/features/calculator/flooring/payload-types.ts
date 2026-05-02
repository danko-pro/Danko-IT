export type CalculatorFlooringPayload = {
  include_underlay: boolean;
  include_plinth: boolean;
  include_demolition: boolean;
  include_preparation: boolean;
  default_preparation_id: number | null;
  demolition_price_per_m2: number;
  underlay_price_per_m2: number;
  plinth_material_price_per_m: number;
  plinth_install_price_per_m: number;
  threshold_profile_count: number;
  threshold_profile_price: number;
  global_items: Array<{
    kind: "work" | "material" | "consumable";
    title: string;
    mode: "fixed" | "area" | "perimeter" | "quantity";
    rate: number;
    quantity: number;
    enabled: boolean;
  }>;
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
    zones: Array<{
      covering_id: number | null;
      preparation_id: number | null;
      layout_id: number | null;
      area_m2: number | null;
      note: string | null;
    }>;
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
  custom_consumables: Array<{
    title: string;
    consumption_per_m2: number;
    unit: string;
    price_per_unit: number;
  }>;
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
