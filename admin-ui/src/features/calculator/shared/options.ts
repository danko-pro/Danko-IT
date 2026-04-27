export type SelectOption = {
  value: string;
  label: string;
};

export const openingTypeOptions: SelectOption[] = [
  { value: "window", label: "Окно" },
  { value: "balcony", label: "Балконный проем" },
  { value: "niche", label: "Ниша" },
  { value: "opening", label: "Проем" },
  { value: "manual_area", label: "Площадь вручную" },
];

export const doorComponentCategoryOptions: SelectOption[] = [
  { value: "leaf", label: "Полотно" },
  { value: "frame", label: "Короб" },
  { value: "architrave", label: "Наличник" },
  { value: "extension", label: "Добор" },
  { value: "handle", label: "Ручка" },
  { value: "hinge", label: "Петли" },
  { value: "lock", label: "Замок" },
  { value: "latch", label: "Защелка" },
  { value: "plate", label: "Накладка" },
  { value: "misc", label: "Прочее" },
];

export const underlayModeOptions: SelectOption[] = [
  { value: "none", label: "Без подложки" },
  { value: "required", label: "Нужна" },
  { value: "optional", label: "Опционально" },
];

export function getUnderlayModeLabel(value: string) {
  if (value === "required") {
    return "обязательна";
  }
  if (value === "optional") {
    return "опционально";
  }
  return "не нужна";
}
