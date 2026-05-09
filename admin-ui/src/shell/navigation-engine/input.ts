import type { ScreenKey } from "../../shared/types";
import { appPageRegistry, getAppPageByScreen, getSidebarAppPages, type AppPageRegistryItem } from "../page-registry";
import { appRouteRegistry, getAppRouteByScreen } from "../route-registry";
import { resolveReservedWorkspaceArea, resolveUsableWorkspace } from "./reserved-area";
import { resolveNavigationShellState, type NavigationShellState } from "./shell-state";
import type {
  NavigationEngineInput,
  NavigationEngineInputSummary,
  NavigationEngineMetrics,
  NavigationEngineNavigation,
  NavigationEnginePage,
  NavigationEngineRoute,
  NavigationEngineWorkspace,
} from "./types";

const DEFAULT_NAVIGATION_METRICS: NavigationEngineMetrics = {
  columns: 32,
  rows: 30,
};

export type CreateNavigationEngineInputOptions = {
  activeScreen?: ScreenKey;
  metrics?: Partial<NavigationEngineMetrics>;
  shellState?: Partial<NavigationShellState>;
};

function resolveMetrics(metrics: Partial<NavigationEngineMetrics> = {}): NavigationEngineMetrics {
  return {
    columns: Math.max(1, Math.floor(metrics.columns ?? DEFAULT_NAVIGATION_METRICS.columns)),
    rows: Math.max(1, Math.floor(metrics.rows ?? DEFAULT_NAVIGATION_METRICS.rows)),
  };
}

function createPages(): NavigationEnginePage[] {
  return (appPageRegistry as readonly AppPageRegistryItem[])
    .filter((page) => page.status !== "archived")
    .map((page) => ({
      id: page.id,
      title: page.title,
      routeId: page.routeId,
      workspaceId: page.workspaceId,
    }));
}

function createRoutes(): NavigationEngineRoute[] {
  return appRouteRegistry
    .filter((route) => route.status !== "archived")
    .map((route) => ({
      id: route.id,
      path: route.path,
      pageId: route.pageId,
      workspaceId: route.workspaceId,
    }));
}

function createWorkspaces(): NavigationEngineWorkspace[] {
  const workspacesById = new Map<string, NavigationEngineWorkspace>();

  for (const page of appPageRegistry as readonly AppPageRegistryItem[]) {
    if (page.status === "archived") {
      continue;
    }
    workspacesById.set(page.workspaceId, {
      id: page.workspaceId,
      defaultComponentId: page.defaultComponentId,
    });
  }

  return [...workspacesById.values()];
}

function createNavigation(shellState: NavigationShellState): NavigationEngineNavigation {
  return {
    id: "shell.global-navigation",
    state: shellState.menuState,
    placement: shellState.placement,
    scope: shellState.scope,
    items: getSidebarAppPages().map((page) => ({
      id: page.navigationElementId,
      label: page.navigationLabel,
      pageId: page.id,
      routeId: page.routeId,
    })),
  };
}

export function createNavigationEngineInput(
  options: CreateNavigationEngineInputOptions = {},
): NavigationEngineInput {
  const activeScreen = options.activeScreen ?? "calculator";
  const activePage = getAppPageByScreen(activeScreen) ?? (appPageRegistry[0] as AppPageRegistryItem);
  const activeRoute = getAppRouteByScreen(activePage.screen) ?? appRouteRegistry[0];
  const metrics = resolveMetrics(options.metrics);
  const shellState = resolveNavigationShellState(options.shellState);
  const reservedArea = resolveReservedWorkspaceArea(metrics, shellState);
  const usableWorkspace = resolveUsableWorkspace(metrics, reservedArea);

  return {
    metrics,
    activePageId: activePage.id,
    activeRouteId: activeRoute.id,
    activeWorkspaceId: activePage.workspaceId,
    pages: createPages(),
    routes: createRoutes(),
    workspaces: createWorkspaces(),
    navigation: createNavigation(shellState),
    shell: {
      reservedArea,
    },
    usableWorkspace,
  };
}

export function summarizeNavigationEngineInput(input: NavigationEngineInput): NavigationEngineInputSummary {
  return {
    pages: input.pages.length,
    routes: input.routes.length,
    workspaces: input.workspaces.length,
    navigationItems: input.navigation.items.length,
    reservedArea: input.shell.reservedArea,
    usableWorkspace: input.usableWorkspace,
  };
}
