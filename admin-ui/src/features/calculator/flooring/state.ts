import type {
  FlooringCoveringCreateState,
  FlooringEditState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
} from "./";

// Пустые draft-состояния для напольных покрытий и их каталогов.

export const emptyFlooringState: FlooringEditState = {
  include_underlay: true,
  include_plinth: true,
  include_demolition: false,
  include_preparation: true,
  default_preparation_id: "",
  demolition_price_per_m2: "150",
  underlay_price_per_m2: "120",
  plinth_material_price_per_m: "180",
  plinth_install_price_per_m: "250",
  threshold_profile_count: "0",
  threshold_profile_price: "900",
  global_items: [],
  rooms: [],
};

export const emptyFlooringCoveringState: FlooringCoveringCreateState = {
  title: "",
  material_price_per_m2: "",
  labor_price_per_m2: "",
  base_waste_percent: "",
  underlay_mode: "none",
  underlay_consumption_per_m2: "",
  glue_consumption_per_m2: "",
  glue_unit: "кг",
  glue_price_per_unit: "",
  primer_consumption_per_m2: "",
  primer_unit: "л",
  primer_price_per_unit: "",
  svp_consumption_per_m2: "",
  svp_unit: "шт",
  svp_price_per_unit: "",
  grout_consumption_per_m2: "",
  grout_unit: "кг",
  grout_price_per_unit: "",
  custom_consumables: [],
  needs_plinth: true,
  instrument_price_per_m2: "",
  note: "",
};

export const emptyFlooringPreparationState: FlooringPreparationCreateState = {
  title: "",
  labor_price_per_m2: "",
  material_price_per_m2: "",
  primer_consumption_per_m2: "",
  primer_unit: "л",
  primer_price_per_unit: "",
  note: "",
};

export const emptyFlooringLayoutState: FlooringLayoutCreateState = {
  title: "",
  labor_multiplier: "",
  extra_waste_percent: "",
  note: "",
};
