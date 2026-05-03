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
  custom_consumables: Array<{
    title: string;
    consumption_per_m2: number;
    unit: string;
    price_per_unit: number;
  }>;
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
