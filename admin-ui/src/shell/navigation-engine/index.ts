export {
  createNavigationEngineInput,
  summarizeNavigationEngineInput,
  type CreateNavigationEngineInputOptions,
} from "./input";
export { resolveReservedWorkspaceArea, resolveUsableWorkspace } from "./reserved-area";
export {
  DEFAULT_NAVIGATION_SHELL_STATE,
  resolveNavigationShellState,
  type NavigationShellState,
} from "./shell-state";
export type {
  NavigationEngineInput,
  NavigationEngineInputSummary,
  NavigationEngineMenuItem,
  NavigationEngineMetrics,
  NavigationEngineNavigation,
  NavigationEnginePage,
  NavigationEngineRoute,
  NavigationEngineShell,
  NavigationEngineWorkspace,
  NavigationMenuState,
  NavigationPlacement,
  NavigationReservedArea,
  NavigationScope,
  NavigationUsableWorkspace,
} from "./types";
