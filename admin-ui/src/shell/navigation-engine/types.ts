export type NavigationMenuState = "pinned" | "collapsed" | "overlay" | "hidden";
export type NavigationPlacement = "left" | "right" | "top" | "bottom";
export type NavigationScope = "global" | "workspace";

export type NavigationEngineMetrics = {
  columns: number;
  rows: number;
};

export type NavigationReservedArea = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type NavigationUsableWorkspace = {
  x: number;
  y: number;
  columns: number;
  rows: number;
};

export type NavigationEnginePage = {
  id: string;
  title: string;
  routeId: string;
  workspaceId: string;
};

export type NavigationEngineRoute = {
  id: string;
  path: string;
  pageId: string;
  workspaceId: string;
};

export type NavigationEngineWorkspace = {
  id: string;
  defaultComponentId?: string;
};

export type NavigationEngineMenuItem = {
  id: string;
  label: string;
  pageId: string;
  routeId: string;
};

export type NavigationEngineNavigation = {
  id: string;
  state: NavigationMenuState;
  placement: NavigationPlacement;
  scope: NavigationScope;
  items: NavigationEngineMenuItem[];
};

export type NavigationEngineShell = {
  reservedArea: NavigationReservedArea;
};

export type NavigationEngineInput = {
  metrics: NavigationEngineMetrics;
  activePageId: string;
  activeRouteId: string;
  activeWorkspaceId: string;
  pages: NavigationEnginePage[];
  routes: NavigationEngineRoute[];
  workspaces: NavigationEngineWorkspace[];
  navigation: NavigationEngineNavigation;
  shell: NavigationEngineShell;
  usableWorkspace: NavigationUsableWorkspace;
};

export type NavigationEngineInputSummary = {
  pages: number;
  routes: number;
  workspaces: number;
  navigationItems: number;
  reservedArea: NavigationReservedArea;
  usableWorkspace: NavigationUsableWorkspace;
};
