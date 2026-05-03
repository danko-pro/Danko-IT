import type {
  CalculatorWallFinishCovering,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  WallFinishCoveringCreateState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
} from "./";

export function wallFinishCoveringToState(item: CalculatorWallFinishCovering): WallFinishCoveringCreateState {
  return {
    title: item.title,
    material_price_per_m2: String(item.material_price_per_m2),
    labor_price_per_m2: String(item.labor_price_per_m2),
    base_waste_percent: String(item.base_waste_percent),
    glue_consumption_per_m2: String(item.glue_consumption_per_m2),
    glue_unit: item.glue_unit,
    glue_price_per_unit: String(item.glue_price_per_unit),
    primer_consumption_per_m2: String(item.primer_consumption_per_m2),
    primer_unit: item.primer_unit,
    primer_price_per_unit: String(item.primer_price_per_unit),
    putty_consumption_per_m2: String(item.putty_consumption_per_m2),
    putty_unit: item.putty_unit,
    putty_price_per_unit: String(item.putty_price_per_unit),
    mesh_consumption_per_m2: String(item.mesh_consumption_per_m2),
    mesh_unit: item.mesh_unit,
    mesh_price_per_unit: String(item.mesh_price_per_unit),
    instrument_price_per_m2: String(item.instrument_price_per_m2),
    note: item.note ?? "",
  };
}

export function wallFinishPreparationToState(item: CalculatorWallFinishPreparation): WallFinishPreparationCreateState {
  return {
    title: item.title,
    labor_price_per_m2: String(item.labor_price_per_m2),
    material_price_per_m2: String(item.material_price_per_m2),
    primer_consumption_per_m2: String(item.primer_consumption_per_m2),
    primer_unit: item.primer_unit,
    primer_price_per_unit: String(item.primer_price_per_unit),
    note: item.note ?? "",
  };
}

export function wallFinishLayoutToState(item: CalculatorWallFinishLayout): WallFinishLayoutCreateState {
  return {
    title: item.title,
    labor_multiplier: String(item.labor_multiplier),
    extra_waste_percent: String(item.extra_waste_percent),
    note: item.note ?? "",
  };
}
