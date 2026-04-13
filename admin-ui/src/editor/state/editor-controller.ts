import { useMemo, useState } from "react";

import { clampCellToGrid, clampPlacementToGrid, createEditorGrid, createHeaderContainer, createInitialViewport, createWorkspace } from "../model/editor-logic";
import type { EditorCanvasItem, EditorCanvasPlacement, EditorCell, EditorControllerState, EditorViewportSnapshot } from "../model/editor-types";

export function useEditorController(): EditorControllerState {
  const grid = useMemo(() => createEditorGrid(), []);
  const [selectedCell, setSelectedCell] = useState<EditorCell>({ column: 1, row: 1 });
  const [viewportSnapshot, setViewportSnapshot] = useState<EditorViewportSnapshot>(() => createInitialViewport());
  const [headerContainer, setHeaderContainer] = useState<EditorCanvasItem | null>(null);

  const workspace = useMemo(
    () => createWorkspace(grid, viewportSnapshot, clampCellToGrid(selectedCell, grid), headerContainer),
    [grid, headerContainer, selectedCell, viewportSnapshot],
  );

  const actions = useMemo(
    () => ({
      selectCell: (cell: EditorCell) => {
        setSelectedCell(clampCellToGrid(cell, grid));
      },
      setViewport: (viewport: EditorViewportSnapshot) => {
        setViewportSnapshot(viewport);
      },
      placeHeaderContainer: (cell: EditorCell) => {
        const safeCell = clampCellToGrid(cell, grid);

        setSelectedCell(safeCell);
        setHeaderContainer(createHeaderContainer(safeCell, grid));
      },
      updateHeaderContainerPlacement: (placement: EditorCanvasPlacement) => {
        setHeaderContainer((currentItem) => {
          if (!currentItem) {
            return currentItem;
          }

          const nextPlacement = clampPlacementToGrid(placement, grid);
          setSelectedCell({
            column: nextPlacement.startColumn,
            row: nextPlacement.startRow,
          });

          return {
            ...currentItem,
            placement: nextPlacement,
          };
        });
      },
    }),
    [grid],
  );

  return {
    workspace,
    actions,
  };
}
