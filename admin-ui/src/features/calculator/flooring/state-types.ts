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
