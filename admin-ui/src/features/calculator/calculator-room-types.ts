import type { CalculatorSummary } from "./calculator-core-types";

// Типы для комнат, геометрии и редактирования room detail.

export type CalculatorRoomSummary = {
  id: number;
  project_id: number;
  name: string;
  ceiling_height_m: number;
  manual_floor_area_m2: number | null;
  auto_perimeter_calc: boolean;
  perimeter_factor: number;
  note: string | null;
  sort_order: number;
  perimeter_m: number;
  floor_area_m2: number;
  wall_area_gross_m2: number;
  openings_area_m2: number;
  door_area_m2: number;
  wall_area_net_m2: number;
};

export type CalculatorWall = {
  id: number;
  room_id: number;
  length_m: number;
  sort_order: number;
};

export type CalculatorFloorSection = {
  id: number;
  room_id: number;
  length_m: number;
  width_m: number;
  sort_order: number;
};

export type CalculatorOpening = {
  id: number;
  room_id: number;
  opening_type: string;
  width_m: number | null;
  height_m: number | null;
  quantity: number;
  area_m2: number | null;
  note: string | null;
  sort_order: number;
};

export type CalculatorRoomCore = {
  id: number;
  project_id: number;
  name: string;
  ceiling_height_m: number;
  manual_floor_area_m2: number | null;
  auto_perimeter_calc: boolean;
  perimeter_factor: number;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CalculatorRoomDetail = {
  room: CalculatorRoomCore;
  walls: CalculatorWall[];
  floor_sections: CalculatorFloorSection[];
  openings: CalculatorOpening[];
  stats: CalculatorSummary;
};

export type CalculatorRoomPayload = {
  name: string;
  ceiling_height_m: number;
  manual_floor_area_m2: number | null;
  auto_perimeter_calc: boolean;
  perimeter_factor: number;
  note: string | null;
  walls_m: number[];
  floor_sections: Array<{ length_m: number | null; width_m: number | null }>;
  openings: Array<{
    opening_type: string;
    width_m: number | null;
    height_m: number | null;
    quantity: number | null;
    area_m2: number | null;
    note: string | null;
  }>;
};

export type RoomEditState = {
  name: string;
  ceiling_height_m: string;
  manual_floor_area_m2: string;
  auto_perimeter_calc: boolean;
  perimeter_factor: string;
  note: string;
  walls_m: string[];
  floor_sections: Array<{ length_m: string; width_m: string }>;
  openings: Array<{
    opening_type: string;
    width_m: string;
    height_m: string;
    quantity: string;
    area_m2: string;
    note: string;
  }>;
};
