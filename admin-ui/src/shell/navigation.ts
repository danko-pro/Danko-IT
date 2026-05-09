import type { ScreenKey } from "../shared/types";
import { getSidebarAppPages, type AppPageRegistryItem } from "./page-registry";

export type NavigationScreenKey = Exclude<ScreenKey, "editor">;
type NavigationPage = AppPageRegistryItem & { screen: NavigationScreenKey };

export type NavigationItem = {
  key: NavigationScreenKey;
  label: string;
  note: string;
  pageId: string;
  routeId: string;
  routeElementId: string;
  navigationElementId: string;
  workspaceId: string;
  defaultComponentId?: string;
  order: number;
};

function isNavigationScreen(screen: ScreenKey): screen is NavigationScreenKey {
  return screen !== "editor";
}

function isNavigationPage(page: AppPageRegistryItem): page is NavigationPage {
  return isNavigationScreen(page.screen);
}

const sidebarNavigationPages = getSidebarAppPages().filter(isNavigationPage);

export const navigation: NavigationItem[] = sidebarNavigationPages.map((page) => ({
  key: page.screen,
  label: page.navigationLabel,
  note: page.note,
  pageId: page.id,
  routeId: page.routeId,
  routeElementId: page.routeElementId,
  navigationElementId: page.navigationElementId,
  workspaceId: page.workspaceId,
  defaultComponentId: page.defaultComponentId,
  order: page.order,
}));

export const screenTitles: Record<NavigationScreenKey, string> = navigation.reduce(
  (titles, item) => ({
    ...titles,
    [item.key]: sidebarNavigationPages.find((page) => page.screen === item.key)?.title ?? item.label,
  }),
  {} as Record<NavigationScreenKey, string>,
);
