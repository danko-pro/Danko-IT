import type { EstimateNavigationItem } from "./types";

export const estimateNavigationItems: EstimateNavigationItem[] = [
  { id: "estimate-object", label: "Объект", icon: "object" },
  { id: "estimate-geometry", label: "Геометрия", icon: "geometry" },
  { id: "estimate-warm-floor", label: "Тёплый пол", icon: "warmFloor" },
  { id: "estimate-flooring", label: "Полы", icon: "flooring" },
  { id: "estimate-walls", label: "Стены", icon: "walls" },
  { id: "estimate-ceiling", label: "Потолки", icon: "ceiling" },
  { id: "estimate-electric", label: "Электрика", icon: "electric" },
  { id: "estimate-plumbing", label: "Сантехника", icon: "plumbing" },
  { id: "estimate-doors", label: "Двери", icon: "doors" },
  { id: "estimate-completion", label: "Комплектация", icon: "completion" },
  { id: "estimate-appliances", label: "Техника", icon: "appliances" },
  { id: "estimate-loose-furniture", label: "Мебель", icon: "furniture" },
  { id: "estimate-home-goods", label: "Уборка и товары для дома", icon: "cleaning" },
  { id: "estimate-costs", label: "Итог", icon: "total" },
];

export const ESTIMATE_INITIAL_SECTION_ID = estimateNavigationItems[0]?.id ?? "estimate-object";
export const ESTIMATE_SCROLL_SPY_SECTION_IDS = estimateNavigationItems.map((item) => item.id);
