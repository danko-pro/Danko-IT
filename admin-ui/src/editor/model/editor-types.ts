export const EDITOR_WORKSPACE_ID = "editor-workspace";
export const EDITOR_WORKSPACE_TITLE = "Editor Workspace";
export const EDITOR_CELL_SIZE = 30 as const;
export const EDITOR_COLUMN_COUNT = 30;
export const EDITOR_ROW_COUNT = 30;
export const EDITOR_HEADER_CONTAINER_ID = "calculator-header-container";
export const EDITOR_HEADER_CONTAINER_TYPE = "calculator-header";
export const EDITOR_TEMPLATE_DRAG_MIME = "application/x-editor-template";

export type EditorCell = {
  column: number;
  row: number;
};

export type EditorCellAddress = string;

export type EditorGridColumn = {
  index: number;
  label: string;
};

export type EditorGridRow = {
  index: number;
};

export type EditorGrid = {
  cellSize: typeof EDITOR_CELL_SIZE;
  columnCount: number;
  rowCount: number;
  widthPx: number;
  heightPx: number;
  columns: EditorGridColumn[];
  rows: EditorGridRow[];
};

export type EditorViewportSnapshot = {
  width: number;
  height: number;
  scrollLeft: number;
  scrollTop: number;
};

export type EditorViewport = EditorViewportSnapshot & {
  visibleColumnCount: number;
  visibleRowCount: number;
};

export type EditorSelection = {
  kind: "cell";
  cell: EditorCell;
  address: EditorCellAddress;
};

export type EditorCanvasPlacement = {
  startColumn: number;
  startRow: number;
  columnSpan: number;
  rowSpan: number;
};

export type EditorCanvasItem = {
  id: typeof EDITOR_HEADER_CONTAINER_ID;
  type: typeof EDITOR_HEADER_CONTAINER_TYPE;
  placement: EditorCanvasPlacement;
};

export type EditorResizeHandle =
  | "north"
  | "south"
  | "east"
  | "west"
  | "north-east"
  | "north-west"
  | "south-east"
  | "south-west";

export type EditorWorkspace = {
  id: typeof EDITOR_WORKSPACE_ID;
  title: typeof EDITOR_WORKSPACE_TITLE;
  grid: EditorGrid;
  viewport: EditorViewport;
  selection: EditorSelection;
  headerContainer: EditorCanvasItem | null;
};

export type EditorWorkspaceActions = {
  selectCell: (cell: EditorCell) => void;
  setViewport: (viewport: EditorViewportSnapshot) => void;
  placeHeaderContainer: (cell: EditorCell) => void;
  updateHeaderContainerPlacement: (placement: EditorCanvasPlacement) => void;
};

export type EditorControllerState = {
  workspace: EditorWorkspace;
  actions: EditorWorkspaceActions;
};
