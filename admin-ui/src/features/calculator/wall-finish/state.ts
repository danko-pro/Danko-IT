import type {
  WallFinishCoveringCreateState,
  WallFinishEditState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
} from "./";

// Пустые draft-состояния для отделки стен и её каталогов.

export const emptyWallFinishState: WallFinishEditState = {
  include_preparation: true,
  include_demolition: false,
  demolition_price_per_m2: "140",
  rooms: [],
};

export const emptyWallFinishCoveringState: WallFinishCoveringCreateState = {
  title: "",
  material_price_per_m2: "",
  labor_price_per_m2: "",
  base_waste_percent: "",
  glue_consumption_per_m2: "",
  glue_unit: "кг",
  glue_price_per_unit: "",
  primer_consumption_per_m2: "",
  primer_unit: "л",
  primer_price_per_unit: "",
  putty_consumption_per_m2: "",
  putty_unit: "кг",
  putty_price_per_unit: "",
  mesh_consumption_per_m2: "",
  mesh_unit: "м²",
  mesh_price_per_unit: "",
  instrument_price_per_m2: "",
  note: "",
};

export const emptyWallFinishPreparationState: WallFinishPreparationCreateState = {
  title: "",
  labor_price_per_m2: "",
  material_price_per_m2: "",
  primer_consumption_per_m2: "",
  primer_unit: "л",
  primer_price_per_unit: "",
  note: "",
};

export const emptyWallFinishLayoutState: WallFinishLayoutCreateState = {
  title: "",
  labor_multiplier: "",
  extra_waste_percent: "",
  note: "",
};
