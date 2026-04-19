import type { RoomEditState } from "./calculator-types";

// Пустое draft-состояние формы комнаты калькулятора.

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
