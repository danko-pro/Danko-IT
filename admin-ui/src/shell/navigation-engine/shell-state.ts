import type { NavigationMenuState, NavigationPlacement, NavigationScope } from "./types";

export type NavigationShellState = {
  menuState: NavigationMenuState;
  placement: NavigationPlacement;
  scope: NavigationScope;
  pinnedSize: number;
  collapsedSize: number;
};

export const DEFAULT_NAVIGATION_SHELL_STATE: NavigationShellState = {
  menuState: "pinned",
  placement: "left",
  scope: "global",
  pinnedSize: 5,
  collapsedSize: 2,
};

export function resolveNavigationShellState(
  overrides: Partial<NavigationShellState> = {},
): NavigationShellState {
  return {
    ...DEFAULT_NAVIGATION_SHELL_STATE,
    ...overrides,
  };
}
