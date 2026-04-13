import {
  EDITOR_CELL_SIZE,
  EDITOR_COLUMN_COUNT,
  EDITOR_HEADER_CONTAINER_ID,
  EDITOR_HEADER_CONTAINER_TYPE,
  EDITOR_ROW_COUNT,
  EDITOR_WORKSPACE_ID,
  EDITOR_WORKSPACE_TITLE,
  type EditorCanvasItem,
  type EditorCanvasPlacement,
  type EditorCell,
  type EditorGrid,
  type EditorGridColumn,
  type EditorGridRow,
  type EditorSelection,
  type EditorViewport,
  type EditorViewportSnapshot,
  type EditorWorkspace,
  type EditorResizeHandle,
} from "./editor-types";

const HEADER_CONTAINER_COLUMN_SPAN = 16;
const HEADER_CONTAINER_ROW_SPAN = 8;

export function getColumnLabel(index: number) {
  let value = index;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

export function getCellAddress(column: number, row: number) {
  return `${getColumnLabel(column)}${row}`;
}

export function buildEditorColumns(count = EDITOR_COLUMN_COUNT): EditorGridColumn[] {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    label: getColumnLabel(index + 1),
  }));
}

export function buildEditorRows(count = EDITOR_ROW_COUNT): EditorGridRow[] {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
  }));
}

export function createEditorGrid(
  cellSize: typeof EDITOR_CELL_SIZE = EDITOR_CELL_SIZE,
  columnCount = EDITOR_COLUMN_COUNT,
  rowCount = EDITOR_ROW_COUNT,
): EditorGrid {
  const columns = buildEditorColumns(columnCount);
  const rows = buildEditorRows(rowCount);

  return {
    cellSize,
    columnCount,
    rowCount,
    widthPx: columnCount * cellSize,
    heightPx: rowCount * cellSize,
    columns,
    rows,
  };
}

export function clampCellToGrid(cell: EditorCell, grid: EditorGrid): EditorCell {
  return {
    column: Math.min(Math.max(cell.column, 1), grid.columnCount),
    row: Math.min(Math.max(cell.row, 1), grid.rowCount),
  };
}

export function createSelection(cell: EditorCell, grid: EditorGrid): EditorSelection {
  const safeCell = clampCellToGrid(cell, grid);

  return {
    kind: "cell",
    cell: safeCell,
    address: getCellAddress(safeCell.column, safeCell.row),
  };
}

export function clampPlacementToGrid(placement: EditorCanvasPlacement, grid: EditorGrid): EditorCanvasPlacement {
  const columnSpan = Math.min(Math.max(placement.columnSpan, 1), grid.columnCount);
  const rowSpan = Math.min(Math.max(placement.rowSpan, 1), grid.rowCount);
  const maxStartColumn = Math.max(grid.columnCount - columnSpan + 1, 1);
  const maxStartRow = Math.max(grid.rowCount - rowSpan + 1, 1);

  return {
    startColumn: Math.min(Math.max(placement.startColumn, 1), maxStartColumn),
    startRow: Math.min(Math.max(placement.startRow, 1), maxStartRow),
    columnSpan,
    rowSpan,
  };
}

export function createHeaderContainerPlacement(cell: EditorCell, grid: EditorGrid): EditorCanvasPlacement {
  const safeCell = clampCellToGrid(cell, grid);

  return clampPlacementToGrid(
    {
      startColumn: safeCell.column,
      startRow: safeCell.row,
      columnSpan: HEADER_CONTAINER_COLUMN_SPAN,
      rowSpan: HEADER_CONTAINER_ROW_SPAN,
    },
    grid,
  );
}

export function createHeaderContainer(cell: EditorCell, grid: EditorGrid): EditorCanvasItem {
  return {
    id: EDITOR_HEADER_CONTAINER_ID,
    type: EDITOR_HEADER_CONTAINER_TYPE,
    placement: createHeaderContainerPlacement(cell, grid),
  };
}

export function movePlacementByDelta(
  placement: EditorCanvasPlacement,
  deltaColumns: number,
  deltaRows: number,
  grid: EditorGrid,
): EditorCanvasPlacement {
  return clampPlacementToGrid(
    {
      ...placement,
      startColumn: placement.startColumn + deltaColumns,
      startRow: placement.startRow + deltaRows,
    },
    grid,
  );
}

export function resizePlacementByHandle(
  placement: EditorCanvasPlacement,
  handle: EditorResizeHandle,
  deltaColumns: number,
  deltaRows: number,
  grid: EditorGrid,
): EditorCanvasPlacement {
  let startColumn = placement.startColumn;
  let startRow = placement.startRow;
  let endColumn = placement.startColumn + placement.columnSpan - 1;
  let endRow = placement.startRow + placement.rowSpan - 1;

  if (handle === "east" || handle === "north-east" || handle === "south-east") {
    endColumn += deltaColumns;
  }

  if (handle === "west" || handle === "north-west" || handle === "south-west") {
    startColumn += deltaColumns;
  }

  if (handle === "south" || handle === "south-east" || handle === "south-west") {
    endRow += deltaRows;
  }

  if (handle === "north" || handle === "north-east" || handle === "north-west") {
    startRow += deltaRows;
  }

  startColumn = Math.max(1, startColumn);
  startRow = Math.max(1, startRow);
  endColumn = Math.min(grid.columnCount, endColumn);
  endRow = Math.min(grid.rowCount, endRow);

  if (startColumn > endColumn) {
    if (handle === "west" || handle === "north-west" || handle === "south-west") {
      startColumn = endColumn;
    } else {
      endColumn = startColumn;
    }
  }

  if (startRow > endRow) {
    if (handle === "north" || handle === "north-east" || handle === "north-west") {
      startRow = endRow;
    } else {
      endRow = startRow;
    }
  }

  return {
    startColumn,
    startRow,
    columnSpan: endColumn - startColumn + 1,
    rowSpan: endRow - startRow + 1,
  };
}

export function createViewport(
  snapshot: EditorViewportSnapshot,
  cellSize: typeof EDITOR_CELL_SIZE,
): EditorViewport {
  return {
    ...snapshot,
    visibleColumnCount: snapshot.width > 0 ? Math.ceil(snapshot.width / cellSize) : 0,
    visibleRowCount: snapshot.height > 0 ? Math.ceil(snapshot.height / cellSize) : 0,
  };
}

export function createInitialViewport(): EditorViewportSnapshot {
  return {
    width: 0,
    height: 0,
    scrollLeft: 0,
    scrollTop: 0,
  };
}

export function createWorkspace(
  grid: EditorGrid,
  viewportSnapshot: EditorViewportSnapshot,
  selectedCell: EditorCell,
  headerContainer: EditorCanvasItem | null,
): EditorWorkspace {
  return {
    id: EDITOR_WORKSPACE_ID,
    title: EDITOR_WORKSPACE_TITLE,
    grid,
    viewport: createViewport(viewportSnapshot, grid.cellSize),
    selection: createSelection(selectedCell, grid),
    headerContainer,
  };
}
