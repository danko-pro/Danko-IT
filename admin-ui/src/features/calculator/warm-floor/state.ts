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
  pipe_material_title: "Труба PEX-a 16x2 для водяного тёплого пола",
  manifold_material_items: [
    { title: "Коллекторная группа с расходомерами", unit: "компл.", quantity: 1, amount: 12000 },
    { title: "Шкаф, крепёж и фитинги коллектора", unit: "компл.", quantity: 1, amount: 8000 },
  ],
  pump_material_items: [
    { title: "Насосно-смесительный узел", unit: "компл.", quantity: 1, amount: 18000 },
    { title: "Запорная арматура и фитинги насосного узла", unit: "компл.", quantity: 1, amount: 7500 },
  ],
  consumable_material_items: [
    { title: "Крепёж трубы тёплого пола", unit: "компл.", quantity: 1, amount: 2500 },
    { title: "Демпферная лента и расходные фитинги", unit: "компл.", quantity: 1, amount: 3500 },
  ],
  pump_rooms_threshold: "3",
  pump_contours_threshold: "4",
  rooms: [],
};
