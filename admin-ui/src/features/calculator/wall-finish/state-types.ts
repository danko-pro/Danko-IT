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
