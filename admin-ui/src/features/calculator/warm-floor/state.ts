import type { WarmFloorEditState } from "./";

// Пустое draft-состояние тёплого пола.

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
