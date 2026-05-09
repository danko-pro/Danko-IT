import type { NavigationShellState } from "./shell-state";
import type { NavigationEngineMetrics, NavigationReservedArea, NavigationUsableWorkspace } from "./types";

const EMPTY_RESERVED_AREA: NavigationReservedArea = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

function clampSize(value: number, limit: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(Math.floor(value), Math.max(0, Math.floor(limit))));
}

export function resolveReservedWorkspaceArea(
  metrics: NavigationEngineMetrics,
  shellState: NavigationShellState,
): NavigationReservedArea {
  if (shellState.menuState === "overlay" || shellState.menuState === "hidden") {
    return { ...EMPTY_RESERVED_AREA };
  }

  const size = shellState.menuState === "collapsed" ? shellState.collapsedSize : shellState.pinnedSize;
  const horizontalSize = clampSize(size, metrics.columns);
  const verticalSize = clampSize(size, metrics.rows);

  switch (shellState.placement) {
    case "right":
      return { ...EMPTY_RESERVED_AREA, right: horizontalSize };
    case "top":
      return { ...EMPTY_RESERVED_AREA, top: verticalSize };
    case "bottom":
      return { ...EMPTY_RESERVED_AREA, bottom: verticalSize };
    case "left":
    default:
      return { ...EMPTY_RESERVED_AREA, left: horizontalSize };
  }
}

export function resolveUsableWorkspace(
  metrics: NavigationEngineMetrics,
  reservedArea: NavigationReservedArea,
): NavigationUsableWorkspace {
  const columns = Math.max(0, metrics.columns - reservedArea.left - reservedArea.right);
  const rows = Math.max(0, metrics.rows - reservedArea.top - reservedArea.bottom);

  return {
    x: reservedArea.left + 1,
    y: reservedArea.top + 1,
    columns,
    rows,
  };
}
