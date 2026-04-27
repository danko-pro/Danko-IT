import { type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

import { createHeaderContainerPlacement, movePlacementByDelta, resizePlacementByHandle } from "../model/editor-logic";
import { useEditorController } from "../state/editor-controller";
import { EditorToolbarPanel } from "./editor-toolbar-panel";
import { EditorWorkspaceCanvas } from "./editor-workspace-canvas";
import {
  EDITOR_HEADER_CONTAINER_TYPE,
  EDITOR_TEMPLATE_DRAG_MIME,
  type EditorCanvasPlacement,
  type EditorCell,
  type EditorResizeHandle,
} from "../model/editor-types";

type EditorInteraction =
  | {
      kind: "drag";
      pointerStartCell: EditorCell;
      initialPlacement: EditorCanvasPlacement;
    }
  | {
      kind: "resize";
      pointerStartCell: EditorCell;
      initialPlacement: EditorCanvasPlacement;
      handle: EditorResizeHandle;
    };

export function EditorScreen() {
  const editor = useEditorController();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dropPreviewCell, setDropPreviewCell] = useState<EditorCell | null>(null);
  const [interaction, setInteraction] = useState<EditorInteraction | null>(null);

  useEffect(() => {
    const viewportNode = viewportRef.current;
    if (!viewportNode) {
      return;
    }
    const viewportElement = viewportNode;

    function syncViewport() {
      editor.actions.setViewport({
        width: viewportElement.clientWidth,
        height: viewportElement.clientHeight,
        scrollLeft: viewportElement.scrollLeft,
        scrollTop: viewportElement.scrollTop,
      });
    }

    syncViewport();
    viewportElement.addEventListener("scroll", syncViewport);

    const observer = new ResizeObserver(() => syncViewport());
    observer.observe(viewportElement);

    return () => {
      viewportElement.removeEventListener("scroll", syncViewport);
      observer.disconnect();
    };
  }, [editor.actions]);

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const activeInteraction = interaction;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    function handlePointerMove(event: PointerEvent) {
      const cell = resolveClientCell(event.clientX, event.clientY);
      if (!cell) {
        return;
      }

      const deltaColumns = cell.column - activeInteraction.pointerStartCell.column;
      const deltaRows = cell.row - activeInteraction.pointerStartCell.row;
      const nextPlacement =
        activeInteraction.kind === "drag"
          ? movePlacementByDelta(activeInteraction.initialPlacement, deltaColumns, deltaRows, editor.workspace.grid)
          : resizePlacementByHandle(activeInteraction.initialPlacement, activeInteraction.handle, deltaColumns, deltaRows, editor.workspace.grid);

      editor.actions.updateHeaderContainerPlacement(nextPlacement);
    }

    function stopInteraction() {
      setInteraction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopInteraction);
    window.addEventListener("pointercancel", stopInteraction);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopInteraction);
      window.removeEventListener("pointercancel", stopInteraction);
    };
  }, [interaction, editor.actions, editor.workspace.grid]);

  function resolveClientCell(clientX: number, clientY: number): EditorCell | null {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return null;
    }

    const rect = viewportElement.getBoundingClientRect();
    const contentX = clientX - rect.left + viewportElement.scrollLeft;
    const contentY = clientY - rect.top + viewportElement.scrollTop;
    const gridOffset = editor.workspace.grid.cellSize;
    const gridX = Math.max(contentX - gridOffset, 0);
    const gridY = Math.max(contentY - gridOffset, 0);

    return {
      column: Math.floor(gridX / editor.workspace.grid.cellSize) + 1,
      row: Math.floor(gridY / editor.workspace.grid.cellSize) + 1,
    };
  }

  function resolvePointerCell(event: ReactDragEvent<HTMLDivElement>) {
    return resolveClientCell(event.clientX, event.clientY);
  }

  function hasHeaderTemplate(event: ReactDragEvent<HTMLDivElement>) {
    return event.dataTransfer.types.includes(EDITOR_TEMPLATE_DRAG_MIME);
  }

  function handleWorkspaceDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasHeaderTemplate(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    const cell = resolvePointerCell(event);
    if (cell) {
      setDropPreviewCell(cell);
    }
  }

  function handleWorkspaceDrop(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasHeaderTemplate(event)) {
      return;
    }

    event.preventDefault();
    const templateType = event.dataTransfer.getData(EDITOR_TEMPLATE_DRAG_MIME);
    const cell = resolvePointerCell(event);

    if (templateType === EDITOR_HEADER_CONTAINER_TYPE && cell) {
      editor.actions.placeHeaderContainer(cell);
    }

    setDropPreviewCell(null);
  }

  function handleWorkspaceDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropPreviewCell(null);
    }
  }

  function handleHeaderDragStart(event: ReactPointerEvent<HTMLDivElement>, placement: EditorCanvasPlacement) {
    event.preventDefault();
    event.stopPropagation();

    const cell = resolveClientCell(event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    setInteraction({
      kind: "drag",
      pointerStartCell: cell,
      initialPlacement: placement,
    });
  }

  function handleHeaderResizeStart(handle: EditorResizeHandle, placement: EditorCanvasPlacement) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const cell = resolveClientCell(event.clientX, event.clientY);
      if (!cell) {
        return;
      }

      setInteraction({
        kind: "resize",
        handle,
        pointerStartCell: cell,
        initialPlacement: placement,
      });
    };
  }

  const headerPlacement = editor.workspace.headerContainer?.placement ?? null;
  const previewPlacement = dropPreviewCell ? createHeaderContainerPlacement(dropPreviewCell, editor.workspace.grid) : null;
  const canvasWidth = editor.workspace.grid.widthPx + editor.workspace.grid.cellSize;
  const canvasHeight = editor.workspace.grid.heightPx + editor.workspace.grid.cellSize;

  return (
    <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <EditorWorkspaceCanvas
        workspace={editor.workspace}
        actions={editor.actions}
        viewportRef={viewportRef}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        previewPlacement={previewPlacement}
        headerPlacement={headerPlacement}
        onWorkspaceDragLeave={handleWorkspaceDragLeave}
        onWorkspaceDragOver={handleWorkspaceDragOver}
        onWorkspaceDrop={handleWorkspaceDrop}
        onHeaderDragStart={handleHeaderDragStart}
        onHeaderResizeStart={handleHeaderResizeStart}
      />
      <EditorToolbarPanel />
    </div>
  );
}
