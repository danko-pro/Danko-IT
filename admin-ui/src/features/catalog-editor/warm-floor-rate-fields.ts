import type { PublicWarmFloorRateField } from "./api/types";

export type WarmFloorRateField = {
  key: PublicWarmFloorRateField;
  label: string;
  unit: string;
};

export const WATER_WARM_FLOOR_RATE_FIELDS: WarmFloorRateField[] = [
  { key: "water_labor_rate_per_m2", label: "Монтаж водяного теплого пола", unit: "₽/м²" },
  { key: "pipe_meters_per_m2", label: "Труба на 1 м²", unit: "м/м²" },
  { key: "max_circuit_area_m2", label: "Максимальная площадь контура", unit: "м²" },
  { key: "pump_room_threshold", label: "Насос от количества помещений", unit: "шт" },
  { key: "pump_circuit_threshold", label: "Насос от количества контуров", unit: "шт" },
  { key: "pipe_price_per_meter", label: "Труба PE-RT за метр", unit: "₽/м" },
  { key: "chase_labor_per_meter", label: "Штробление трассы", unit: "₽/м" },
  { key: "small_loop_fittings_material", label: "Материалы малого контура", unit: "₽" },
  { key: "small_loop_control_head_material", label: "Термоголовка малого контура", unit: "₽" },
  { key: "small_loop_connection_labor", label: "Подключение малого контура", unit: "₽" },
  { key: "manifold_labor", label: "Монтаж распределительной гребенки", unit: "₽" },
  { key: "manifold_material", label: "Комплект распределительной гребенки", unit: "₽" },
  { key: "pump_labor", label: "Монтаж насосного узла", unit: "₽" },
  { key: "pump_material", label: "Материалы насосного узла", unit: "₽" },
];

export const ELECTRIC_WARM_FLOOR_RATE_FIELDS: WarmFloorRateField[] = [
  { key: "electric_mat_price_per_m2", label: "Мат электрического теплого пола", unit: "₽/м²" },
  { key: "electric_breaker_material", label: "Автоматический выключатель", unit: "₽" },
  { key: "thermostat_material", label: "Терморегулятор", unit: "₽" },
  { key: "electric_wire_material", label: "Провод 3х2,5", unit: "₽" },
  { key: "electric_installation_labor", label: "Монтаж электрического теплого пола", unit: "₽" },
];
