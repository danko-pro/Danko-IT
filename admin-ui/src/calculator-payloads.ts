import { toInteger, toNumber } from "./calculator-shared";
import type {
  CalculatorFlooringCoveringPayload,
  CalculatorFlooringLayoutPayload,
  CalculatorFlooringPayload,
  CalculatorFlooringPreparationPayload,
  CalculatorRoomPayload,
  CalculatorWallFinishCoveringPayload,
  CalculatorWallFinishLayoutPayload,
  CalculatorWallFinishPayload,
  CalculatorWallFinishPreparationPayload,
  CalculatorWarmFloorPayload,
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  FlooringCoveringCreateState,
  FlooringEditState,
  FlooringLayoutCreateState,
  FlooringPreparationCreateState,
  ProjectDoorComponentState,
  ProjectDoorCreateState,
  RoomEditState,
  WallFinishCoveringCreateState,
  WallFinishEditState,
  WallFinishLayoutCreateState,
  WallFinishPreparationCreateState,
  WarmFloorEditState,
} from "./calculator";

type DoorCatalogPayload = {
  title: string;
  width_mm: number;
  height_mm: number;
  thickness_mm: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  install_price: number | null;
  note: string;
};

type DoorComponentCatalogPayload = {
  category_code: string;
  title: string;
  unit: string;
  purchase_price: number | null;
  sale_price: number | null;
  note: string;
};

type ProjectDoorPayload = {
  door_catalog_id: number | null;
  opening_kind: string;
  title: string | null;
  width_mm: number | null;
  height_mm: number | null;
  thickness_mm: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  install_price: number | null;
  room_a_id: number | null;
  room_b_id: number | null;
  note: string | null;
};

type ProjectDoorComponentPayload = {
  component_catalog_id: number | null;
  category_code: string | null;
  title: string | null;
  unit: string | null;
  quantity: number;
  purchase_price: number | null;
  sale_price: number | null;
  note: string | null;
};

export function buildRoomPayload(state: RoomEditState): CalculatorRoomPayload {
  return {
    name: state.name.trim(),
    ceiling_height_m: toNumber(state.ceiling_height_m) ?? 2.7,
    manual_floor_area_m2: toNumber(state.manual_floor_area_m2),
    auto_perimeter_calc: state.auto_perimeter_calc,
    perimeter_factor: toNumber(state.perimeter_factor) ?? 1.15,
    note: state.note.trim() || null,
    walls_m: state.walls_m.map(toNumber).filter((value): value is number => value !== null),
    floor_sections: state.floor_sections.map((section) => ({
      length_m: toNumber(section.length_m),
      width_m: toNumber(section.width_m),
    })),
    openings: state.openings.map((opening) => ({
      opening_type: opening.opening_type,
      width_m: toNumber(opening.width_m),
      height_m: toNumber(opening.height_m),
      quantity: toNumber(opening.quantity),
      area_m2: toNumber(opening.area_m2),
      note: opening.note.trim() || null,
    })),
  };
}

export function buildWarmFloorPayload(state: WarmFloorEditState): CalculatorWarmFloorPayload {
  return {
    work_price_per_m2: toNumber(state.work_price_per_m2) ?? 1600,
    pipe_m_per_m2: toNumber(state.pipe_m_per_m2) ?? 6,
    max_contour_area_m2: toNumber(state.max_contour_area_m2) ?? 15,
    small_zone_area_m2: toNumber(state.small_zone_area_m2) ?? 5,
    manifold_work_price: toNumber(state.manifold_work_price) ?? 6000,
    manifold_material_price: toNumber(state.manifold_material_price) ?? 20000,
    pump_work_price: toNumber(state.pump_work_price) ?? 8000,
    pump_material_price: toNumber(state.pump_material_price) ?? 25000,
    pipe_price_per_m: toNumber(state.pipe_price_per_m) ?? 170,
    pump_rooms_threshold: toInteger(state.pump_rooms_threshold) ?? 3,
    pump_contours_threshold: toInteger(state.pump_contours_threshold) ?? 4,
    rooms: state.rooms.map((room) => ({
      room_id: room.room_id,
      selected: room.selected,
      area_m2_override: toNumber(room.area_m2_override),
      note: room.note.trim() || null,
    })),
  };
}

export function buildFlooringPayload(state: FlooringEditState): CalculatorFlooringPayload {
  return {
    include_underlay: state.include_underlay,
    include_plinth: state.include_plinth,
    include_demolition: state.include_demolition,
    include_preparation: state.include_preparation,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? 0),
    underlay_price_per_m2: Math.max(0, toNumber(state.underlay_price_per_m2) ?? 0),
    plinth_material_price_per_m: Math.max(0, toNumber(state.plinth_material_price_per_m) ?? 0),
    plinth_install_price_per_m: Math.max(0, toNumber(state.plinth_install_price_per_m) ?? 0),
    threshold_profile_count: Math.max(0, toInteger(state.threshold_profile_count) ?? 0),
    threshold_profile_price: Math.max(0, toNumber(state.threshold_profile_price) ?? 0),
    rooms: state.rooms.map((room) => ({
      room_id: room.room_id,
      selected: room.selected,
      covering_id: toInteger(room.covering_id),
      preparation_id: toInteger(room.preparation_id),
      layout_id: toInteger(room.layout_id),
      area_m2_override: toNumber(room.area_m2_override),
      perimeter_m_override: toNumber(room.perimeter_m_override),
      plinth_m_override: toNumber(room.plinth_m_override),
      note: room.note.trim() || null,
    })),
  };
}

export function buildFlooringCoveringPayload(
  state: FlooringCoveringCreateState,
): CalculatorFlooringCoveringPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    base_waste_percent: Math.max(0, toNumber(state.base_waste_percent) ?? 7),
    underlay_mode: state.underlay_mode,
    underlay_consumption_per_m2: Math.max(
      0,
      toNumber(state.underlay_consumption_per_m2) ?? (state.underlay_mode === "none" ? 0 : 1),
    ),
    glue_consumption_per_m2: Math.max(0, toNumber(state.glue_consumption_per_m2) ?? 0),
    glue_unit: state.glue_unit.trim() || "РєРі",
    glue_price_per_unit: Math.max(0, toNumber(state.glue_price_per_unit) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "Р»",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    svp_consumption_per_m2: Math.max(0, toNumber(state.svp_consumption_per_m2) ?? 0),
    svp_unit: state.svp_unit.trim() || "С€С‚",
    svp_price_per_unit: Math.max(0, toNumber(state.svp_price_per_unit) ?? 0),
    grout_consumption_per_m2: Math.max(0, toNumber(state.grout_consumption_per_m2) ?? 0),
    grout_unit: state.grout_unit.trim() || "РєРі",
    grout_price_per_unit: Math.max(0, toNumber(state.grout_price_per_unit) ?? 0),
    needs_plinth: state.needs_plinth,
    instrument_price_per_m2: Math.max(0, toNumber(state.instrument_price_per_m2) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildFlooringPreparationPayload(
  state: FlooringPreparationCreateState,
): CalculatorFlooringPreparationPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "Р»",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildFlooringLayoutPayload(state: FlooringLayoutCreateState): CalculatorFlooringLayoutPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    labor_multiplier: Math.max(0.1, toNumber(state.labor_multiplier) ?? 1),
    extra_waste_percent: Math.max(0, toNumber(state.extra_waste_percent) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildWallFinishPayload(state: WallFinishEditState): CalculatorWallFinishPayload {
  return {
    include_preparation: state.include_preparation,
    include_demolition: state.include_demolition,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? 0),
    rooms: state.rooms.map((room) => ({
      room_id: room.room_id,
      selected: room.selected,
      covering_id: toInteger(room.covering_id),
      preparation_id: toInteger(room.preparation_id),
      layout_id: toInteger(room.layout_id),
      area_m2_override: toNumber(room.area_m2_override),
      note: room.note.trim() || null,
    })),
  };
}

export function buildWallFinishCoveringPayload(
  state: WallFinishCoveringCreateState,
): CalculatorWallFinishCoveringPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    base_waste_percent: Math.max(0, toNumber(state.base_waste_percent) ?? 5),
    glue_consumption_per_m2: Math.max(0, toNumber(state.glue_consumption_per_m2) ?? 0),
    glue_unit: state.glue_unit.trim() || "РєРі",
    glue_price_per_unit: Math.max(0, toNumber(state.glue_price_per_unit) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "Р»",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    putty_consumption_per_m2: Math.max(0, toNumber(state.putty_consumption_per_m2) ?? 0),
    putty_unit: state.putty_unit.trim() || "РєРі",
    putty_price_per_unit: Math.max(0, toNumber(state.putty_price_per_unit) ?? 0),
    mesh_consumption_per_m2: Math.max(0, toNumber(state.mesh_consumption_per_m2) ?? 0),
    mesh_unit: state.mesh_unit.trim() || "РјВІ",
    mesh_price_per_unit: Math.max(0, toNumber(state.mesh_price_per_unit) ?? 0),
    instrument_price_per_m2: Math.max(0, toNumber(state.instrument_price_per_m2) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildWallFinishPreparationPayload(
  state: WallFinishPreparationCreateState,
): CalculatorWallFinishPreparationPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    labor_price_per_m2: Math.max(0, toNumber(state.labor_price_per_m2) ?? 0),
    material_price_per_m2: Math.max(0, toNumber(state.material_price_per_m2) ?? 0),
    primer_consumption_per_m2: Math.max(0, toNumber(state.primer_consumption_per_m2) ?? 0),
    primer_unit: state.primer_unit.trim() || "Р»",
    primer_price_per_unit: Math.max(0, toNumber(state.primer_price_per_unit) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildWallFinishLayoutPayload(
  state: WallFinishLayoutCreateState,
): CalculatorWallFinishLayoutPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    title,
    labor_multiplier: Math.max(0.1, toNumber(state.labor_multiplier) ?? 1),
    extra_waste_percent: Math.max(0, toNumber(state.extra_waste_percent) ?? 0),
    note: state.note.trim() || null,
  };
}

export function buildDoorCatalogPayload(state: DoorCatalogCreateState): DoorCatalogPayload | null {
  const title = state.title.trim();
  const width = toNumber(state.width_mm);
  const height = toNumber(state.height_mm);
  if (!title || width === null || height === null) {
    return null;
  }
  return {
    title,
    width_mm: width,
    height_mm: height,
    thickness_mm: toNumber(state.thickness_mm),
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    install_price: toNumber(state.install_price),
    note: state.note,
  };
}

export function buildDoorComponentCatalogPayload(
  state: DoorComponentCatalogCreateState,
): DoorComponentCatalogPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    category_code: state.category_code.trim() || "misc",
    title,
    unit: state.unit.trim() || "С€С‚",
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    note: state.note,
  };
}

export function buildProjectDoorPayload(state: ProjectDoorCreateState): ProjectDoorPayload {
  return {
    door_catalog_id: toInteger(state.door_catalog_id),
    opening_kind: state.opening_kind,
    title: state.title.trim() || null,
    width_mm: toNumber(state.width_mm),
    height_mm: toNumber(state.height_mm),
    thickness_mm: toNumber(state.thickness_mm),
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    install_price: toNumber(state.install_price),
    room_a_id: toInteger(state.room_a_id),
    room_b_id: toInteger(state.room_b_id),
    note: state.note.trim() || null,
  };
}

export function buildProjectDoorComponentPayload(state: ProjectDoorComponentState): ProjectDoorComponentPayload {
  return {
    component_catalog_id: toInteger(state.component_catalog_id),
    category_code: state.category_code.trim() || null,
    title: state.title.trim() || null,
    unit: state.unit.trim() || null,
    quantity: toNumber(state.quantity) ?? 1,
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    note: state.note.trim() || null,
  };
}
