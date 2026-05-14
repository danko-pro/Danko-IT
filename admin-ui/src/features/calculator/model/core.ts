// Базовые типы calculator-среза: проект, общая сводка и активный stage.

export type CalculatorProject = {
  id: number;
  name: string;
  residential_complex: string;
  address: string;
  entrance_section: string;
  apartment: string;
  floor: string;
  lift_type: string;
  site_access: string;
  intercom_code: string;
  loading_zone: string;
  responsible_person: string;
  note: string | null;
  group_chat_id: number | null;
  created_at: string;
  updated_at: string;
  rooms_count: number;
};

export type CalculatorSummary = {
  rooms_count: number;
  floor_area_m2: number;
  wall_area_gross_m2: number;
  openings_area_m2: number;
  door_area_m2: number;
  wall_area_net_m2: number;
  perimeter_m: number;
  doors_count: number;
  door_purchase_total?: number;
  door_sale_total?: number;
  door_install_total?: number;
  door_components_purchase_total?: number;
  door_components_sale_total?: number;
  is_perimeter_estimated?: number;
  perimeter_source?: string;
};

export type CalculatorStage = "project" | "rooms" | "doors" | "warmfloor" | "flooring" | "wallfinish" | "ceilings";
