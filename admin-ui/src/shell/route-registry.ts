import type { ScreenKey } from "../shared/types";
import { appPageRegistry, type AppPageRegistryItem } from "./page-registry";

export type AppRouteRegistryItem = {
  id: string;
  path: string;
  pageId: string;
  screen: ScreenKey;
  workspaceId: string;
  routeElementId: string;
  defaultComponentId?: string;
  title: string;
  order: number;
  status: AppPageRegistryItem["status"];
};

function routeFromPage(page: AppPageRegistryItem): AppRouteRegistryItem {
  return {
  id: page.routeId,
  path: `/${page.slug}`,
  pageId: page.id,
  screen: page.screen,
  workspaceId: page.workspaceId,
  routeElementId: page.routeElementId,
  defaultComponentId: page.defaultComponentId,
  title: page.title,
  order: page.order,
  status: page.status,
  };
}

export const appRouteRegistry = (appPageRegistry as readonly AppPageRegistryItem[]).map(routeFromPage);

export function getAppRouteByScreen(screen: ScreenKey): AppRouteRegistryItem | null {
  return appRouteRegistry.find((route) => route.screen === screen) ?? null;
}

export function getAppRouteById(routeId: string): AppRouteRegistryItem | null {
  return appRouteRegistry.find((route) => route.id === routeId) ?? null;
}
