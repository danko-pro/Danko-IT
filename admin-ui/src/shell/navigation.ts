import type { ScreenKey } from "../shared/types";

export type NavigationScreenKey = Exclude<ScreenKey, "editor">;

export type NavigationItem = {
  key: NavigationScreenKey;
  label: string;
  note: string;
};

export const navigation: NavigationItem[] = [
  { key: "dashboard", label: "Дашборд", note: "Резервный стартовый экран среды" },
  { key: "requests", label: "Логистика", note: "Сводка, статусы и работа по заявкам" },
  { key: "materials", label: "Материалы", note: "Каталог, семейства, варианты и SKU" },
  { key: "calculator", label: "Калькулятор", note: "Обмеры помещений, стены, полы и проемы" },
  { key: "settings", label: "Настройки", note: "Окно доставки и базовые параметры" },
];

export const screenTitles: Record<NavigationScreenKey, string> = {
  dashboard: "Дашборд",
  requests: "Логистика",
  materials: "Каталог материалов",
  calculator: "Проектный калькулятор",
  settings: "Настройки",
};
