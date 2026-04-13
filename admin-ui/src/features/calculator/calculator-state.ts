import type {
  CalculatorStage,
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

const calculatorStageOptions: CalculatorStage[] = ["project", "rooms", "doors", "warmfloor", "flooring", "wallfinish"];

export const calculatorStageStorageKey = "calculator:stage";
export const calculatorHeaderCardWidthStorageKey = "calculator:header:card-width";
export const calculatorHeaderFontScaleStorageKey = "calculator:header:font-scale";

export const emptyRoomState: RoomEditState = {
  name: "",
  ceiling_height_m: "2.7",
  manual_floor_area_m2: "",
  auto_perimeter_calc: false,
  perimeter_factor: "1.15",
  note: "",
  walls_m: ["", "", "", ""],
  floor_sections: [{ length_m: "", width_m: "" }],
  openings: [{ opening_type: "window", width_m: "", height_m: "", quantity: "1", area_m2: "", note: "" }],
};

export const emptyDoorCatalogState: DoorCatalogCreateState = {
  title: "",
  width_mm: "",
  height_mm: "",
  thickness_mm: "40",
  purchase_price: "",
  sale_price: "",
  install_price: "",
  note: "",
};

export const emptyProjectDoorState: ProjectDoorCreateState = {
  door_catalog_id: "",
  opening_kind: "door",
  title: "",
  width_mm: "",
  height_mm: "",
  thickness_mm: "",
  purchase_price: "",
  sale_price: "",
  install_price: "",
  room_a_id: "",
  room_b_id: "",
  note: "",
};

export const emptyDoorComponentCatalogState: DoorComponentCatalogCreateState = {
  category_code: "leaf",
  title: "",
  unit: "шт",
  purchase_price: "",
  sale_price: "",
  note: "",
};

export const emptyProjectDoorComponentState: ProjectDoorComponentState = {
  component_catalog_id: "",
  category_code: "leaf",
  title: "",
  unit: "шт",
  quantity: "1",
  purchase_price: "",
  sale_price: "",
  note: "",
};

export const emptyWarmFloorState: WarmFloorEditState = {
  work_price_per_m2: "1600",
  pipe_m_per_m2: "6",
  max_contour_area_m2: "15",
  small_zone_area_m2: "5",
  manifold_work_price: "6000",
  manifold_material_price: "20000",
  pump_work_price: "8000",
  pump_material_price: "25000",
  pipe_price_per_m: "170",
  pump_rooms_threshold: "3",
  pump_contours_threshold: "4",
  rooms: [],
};

export const emptyFlooringState: FlooringEditState = {
  include_underlay: true,
  include_plinth: true,
  include_demolition: false,
  include_preparation: true,
  demolition_price_per_m2: "150",
  underlay_price_per_m2: "120",
  plinth_material_price_per_m: "180",
  plinth_install_price_per_m: "250",
  threshold_profile_count: "0",
  threshold_profile_price: "900",
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

export function readSessionValue<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSessionValue(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors and keep working with in-memory state.
  }
}

export function readLocalNumber(key: string, fallback: number) {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalNumber(key: string, value: number) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors and continue with in-memory state.
  }
}

export function readStoredStage(): CalculatorStage | null {
  const value = readSessionValue<string>(calculatorStageStorageKey);
  return value && calculatorStageOptions.includes(value as CalculatorStage) ? (value as CalculatorStage) : null;
}

export function warmFloorDraftStorageKey(projectId: number) {
  return `calculator:warmfloor:draft:${projectId}`;
}

export function flooringDraftStorageKey(projectId: number) {
  return `calculator:flooring:draft:${projectId}`;
}

export function flooringExpandedStorageKey(projectId: number) {
  return `calculator:flooring:expanded:${projectId}`;
}

export function wallFinishDraftStorageKey(projectId: number) {
  return `calculator:wallfinish:draft:${projectId}`;
}

export function wallFinishExpandedStorageKey(projectId: number) {
  return `calculator:wallfinish:expanded:${projectId}`;
}
