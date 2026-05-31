import type { EstimateNavigationItem, EstimateSectionDescriptor } from "./types";

export const estimateSectionDescriptors: EstimateSectionDescriptor[] = [
  { id: "estimate-object", label: "Объект", icon: "object", className: "public-estimate-object" },
  {
    id: "estimate-geometry",
    label: "Геометрия",
    icon: "geometry",
    className: "public-estimate-geometry",
    estimateSectionId: "geometry",
  },
  {
    id: "estimate-warm-floor",
    label: "Тёплый пол",
    icon: "warmFloor",
    className: "public-estimate-warm-floor",
    estimateSectionId: "warm_floor",
  },
  {
    id: "estimate-flooring",
    label: "Полы",
    icon: "flooring",
    className: "public-estimate-flooring",
    estimateSectionId: "flooring",
  },
  {
    id: "estimate-walls",
    label: "Стены",
    icon: "walls",
    className: "public-estimate-walls",
    estimateSectionId: "walls",
  },
  {
    id: "estimate-ceiling",
    label: "Потолки",
    icon: "ceiling",
    className: "public-estimate-ceiling",
    estimateSectionId: "ceiling",
  },
  {
    id: "estimate-electric",
    label: "Электрика",
    icon: "electric",
    className: "public-estimate-electric",
    estimateSectionId: "electric",
  },
  {
    id: "estimate-plumbing",
    label: "Сантехника",
    icon: "plumbing",
    className: "public-estimate-plumbing",
    estimateSectionId: "plumbing",
  },
  {
    id: "estimate-doors",
    label: "Двери",
    icon: "doors",
    className: "public-estimate-doors",
    estimateSectionId: "doors",
  },
  {
    id: "estimate-completion",
    label: "Комплектация",
    icon: "completion",
    className: "public-estimate-completion",
    estimateSectionId: "completion",
  },
  {
    id: "estimate-appliances",
    label: "Техника",
    icon: "appliances",
    className: "public-estimate-appliances",
    estimateSectionId: "appliances",
  },
  {
    id: "estimate-loose-furniture",
    label: "Мебель",
    icon: "furniture",
    className: "public-estimate-loose-furniture",
    estimateSectionId: "loose_furniture",
  },
  {
    id: "estimate-home-goods",
    label: "Уборка и товары для дома",
    icon: "cleaning",
    className: "public-estimate-home-goods",
    estimateSectionId: "home_goods",
  },
  { id: "estimate-costs", label: "Итог", icon: "total", className: "public-estimate-costs" },
];

export const estimateNavigationItems: EstimateNavigationItem[] = estimateSectionDescriptors.map(
  ({ id, label, icon }) => ({ id, label, icon }),
);

export const ESTIMATE_INITIAL_SECTION_ID = estimateSectionDescriptors[0]?.id ?? "estimate-object";
export const ESTIMATE_SCROLL_SPY_SECTION_IDS = estimateSectionDescriptors.map((item) => item.id);

export function getEstimateStepIndex(sectionId: string): number {
  return estimateSectionDescriptors.findIndex((item) => item.id === sectionId);
}

export function formatEstimateStep(sectionId: string): string {
  const index = getEstimateStepIndex(sectionId);

  if (index < 0) {
    return "";
  }

  return `Шаг ${String(index + 1).padStart(2, "0")}`;
}

export function getEstimateSectionClassName(sectionId: string, activeSectionId: string): string {
  const descriptor = estimateSectionDescriptors.find((item) => item.id === sectionId);
  const className = descriptor?.className ?? "";

  return activeSectionId === sectionId ? `${className} is-active` : className;
}
