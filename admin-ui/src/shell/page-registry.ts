import type { ScreenKey } from "../shared/types";

export type AppPageStatus = "active" | "hidden" | "archived";
export type AppPageVisibility = "authenticated" | "local" | "always";
export type AppPageSource = "system" | "user";
export type AppPagePlacement = "sidebar" | "edit-tabs" | "command-palette" | "mobile-tabbar";

export type AppPageRegistryItem = {
  id: string;
  title: string;
  navigationLabel: string;
  note: string;
  screen: ScreenKey;
  slug: string;
  routeId: string;
  routeElementId: string;
  navigationElementId: string;
  workspaceId: string;
  routeDataKey: string;
  defaultComponentId?: string;
  icon?: string;
  order: number;
  status: AppPageStatus;
  visibility: AppPageVisibility;
  source: AppPageSource;
  placements: readonly AppPagePlacement[];
};

export const appPageRegistry = [
  {
    id: "page.dashboard",
    title: "Дашборд",
    navigationLabel: "Дашборд",
    note: "Резервный стартовый экран среды",
    screen: "dashboard",
    slug: "dashboard",
    routeId: "route.dashboard",
    routeElementId: "shell.route.dashboard",
    navigationElementId: "shell.sidebar.nav.dashboard",
    workspaceId: "dashboard.workspace",
    routeDataKey: "workspaceCatalog.dashboard",
    order: 10,
    status: "active",
    visibility: "authenticated",
    source: "system",
    placements: ["sidebar", "edit-tabs", "command-palette"],
  },
  {
    id: "page.requests",
    title: "Логистика",
    navigationLabel: "Логистика",
    note: "Сводка, статусы и работа по заявкам",
    screen: "requests",
    slug: "requests",
    routeId: "route.requests",
    routeElementId: "shell.route.requests",
    navigationElementId: "shell.sidebar.nav.requests",
    workspaceId: "requests-workspace",
    routeDataKey: "requests-workspace",
    defaultComponentId: "requests.workspace",
    order: 20,
    status: "active",
    visibility: "authenticated",
    source: "system",
    placements: ["sidebar", "edit-tabs", "command-palette"],
  },
  {
    id: "page.materials",
    title: "Каталог материалов",
    navigationLabel: "Материалы",
    note: "Каталог, семейства, варианты и SKU",
    screen: "materials",
    slug: "materials",
    routeId: "route.materials",
    routeElementId: "shell.route.materials",
    navigationElementId: "shell.sidebar.nav.materials",
    workspaceId: "materials-workspace",
    routeDataKey: "materials-workspace",
    defaultComponentId: "materials.workspace",
    order: 30,
    status: "active",
    visibility: "authenticated",
    source: "system",
    placements: ["sidebar", "edit-tabs", "command-palette"],
  },
  {
    id: "page.calculator",
    title: "Проектный калькулятор",
    navigationLabel: "Калькулятор",
    note: "Обмеры помещений, стены, полы и проемы",
    screen: "calculator",
    slug: "calculator",
    routeId: "route.calculator",
    routeElementId: "shell.route.calculator",
    navigationElementId: "shell.sidebar.nav.calculator",
    workspaceId: "calculator.workspace",
    routeDataKey: "calculator.workspace",
    defaultComponentId: "calculator.stage.main",
    order: 40,
    status: "active",
    visibility: "authenticated",
    source: "system",
    placements: ["sidebar", "edit-tabs", "command-palette"],
  },
  {
    id: "page.settings",
    title: "Настройки",
    navigationLabel: "Настройки",
    note: "Окно доставки и базовые параметры",
    screen: "settings",
    slug: "settings",
    routeId: "route.settings",
    routeElementId: "shell.route.settings",
    navigationElementId: "shell.sidebar.nav.settings",
    workspaceId: "settings.workspace",
    routeDataKey: "settings",
    order: 50,
    status: "active",
    visibility: "authenticated",
    source: "system",
    placements: ["sidebar", "edit-tabs", "command-palette"],
  },
  {
    id: "page.editor",
    title: "Редактор",
    navigationLabel: "Редактор",
    note: "Внутренний редактор UI",
    screen: "editor",
    slug: "editor",
    routeId: "route.editor",
    routeElementId: "shell.route.editor",
    navigationElementId: "shell.sidebar.nav.editor",
    workspaceId: "editor.workspace",
    routeDataKey: "editor",
    order: 90,
    status: "hidden",
    visibility: "authenticated",
    source: "system",
    placements: ["command-palette"],
  },
] as const satisfies readonly AppPageRegistryItem[];

export function getAppPageByScreen(screen: ScreenKey): AppPageRegistryItem | null {
  return appPageRegistry.find((page) => page.screen === screen) ?? null;
}

export function getAppPagesByPlacement(placement: AppPagePlacement): AppPageRegistryItem[] {
  return appPageRegistry
    .filter((page) => page.status === "active" && (page.placements as readonly AppPagePlacement[]).includes(placement))
    .slice()
    .sort((left, right) => left.order - right.order);
}

export function getSidebarAppPages(): AppPageRegistryItem[] {
  return getAppPagesByPlacement("sidebar");
}
