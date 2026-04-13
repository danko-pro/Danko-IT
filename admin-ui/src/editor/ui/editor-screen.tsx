import { type DragEvent as ReactDragEvent, Fragment, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

import { createHeaderContainerPlacement, getCellAddress, movePlacementByDelta, resizePlacementByHandle } from "../model/editor-logic";
import { useEditorController } from "../state/editor-controller";
import { EditorToolbarPanel } from "./editor-toolbar-panel";
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

const resizeHandleConfigs: Array<{
  handle: EditorResizeHandle;
  className: string;
}> = [
  { handle: "north", className: "absolute -top-1 left-2 right-2 z-30 h-2 cursor-n-resize rounded-none bg-cyan-200/10 hover:bg-cyan-200/20" },
  { handle: "south", className: "absolute -bottom-1 left-2 right-2 z-30 h-2 cursor-s-resize rounded-none bg-cyan-200/10 hover:bg-cyan-200/20" },
  { handle: "east", className: "absolute -right-1 top-2 bottom-2 z-30 w-2 cursor-e-resize rounded-none bg-cyan-200/10 hover:bg-cyan-200/20" },
  { handle: "west", className: "absolute -left-1 top-2 bottom-2 z-30 w-2 cursor-w-resize rounded-none bg-cyan-200/10 hover:bg-cyan-200/20" },
  { handle: "north-east", className: "absolute -top-1 -right-1 z-40 h-3 w-3 cursor-ne-resize rounded-none border border-cyan-100/60 bg-cyan-200/50" },
  { handle: "north-west", className: "absolute -top-1 -left-1 z-40 h-3 w-3 cursor-nw-resize rounded-none border border-cyan-100/60 bg-cyan-200/50" },
  { handle: "south-east", className: "absolute -right-1 -bottom-1 z-40 h-3 w-3 cursor-se-resize rounded-none border border-cyan-100/60 bg-cyan-200/50" },
  { handle: "south-west", className: "absolute -bottom-1 -left-1 z-40 h-3 w-3 cursor-sw-resize rounded-none border border-cyan-100/60 bg-cyan-200/50" },
];

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

  function resolvePointerCell(event: ReactDragEvent<HTMLDivElement>): EditorCell | null {
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
    if (!cell) {
      return;
    }

    setDropPreviewCell(cell);
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
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDropPreviewCell(null);
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

  const headerContainer = editor.workspace.headerContainer;
  const headerPlacement = headerContainer ? headerContainer.placement : null;
  const previewPlacement = dropPreviewCell ? createHeaderContainerPlacement(dropPreviewCell, editor.workspace.grid) : null;
  const canvasWidth = editor.workspace.grid.widthPx + editor.workspace.grid.cellSize;
  const canvasHeight = editor.workspace.grid.heightPx + editor.workspace.grid.cellSize;

  return (
    <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section
        aria-label={editor.workspace.title}
        className="min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-none border border-[#4b5058] bg-[#34383d]"
      >
        <div
          ref={viewportRef}
          className="h-full overflow-auto"
          onDragLeave={handleWorkspaceDragLeave}
          onDragOver={handleWorkspaceDragOver}
          onDrop={handleWorkspaceDrop}
        >
          <div className="min-h-full min-w-max">
            <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `${editor.workspace.grid.cellSize}px repeat(${editor.workspace.grid.columnCount}, ${editor.workspace.grid.cellSize}px)`,
                  gridAutoRows: `${editor.workspace.grid.cellSize}px`,
                }}
              >
                <div className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-[#4f5560] bg-[#2d3136] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  {editor.workspace.selection.address}
                </div>

                {editor.workspace.grid.columns.map((column) => (
                  <div
                    key={column.label}
                    className="sticky top-0 z-20 flex items-center justify-center border-b border-r border-[#4f5560] bg-[#2f3338] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"
                  >
                    {column.label}
                  </div>
                ))}

                {editor.workspace.grid.rows.map((row) => (
                  <Fragment key={row.index}>
                    <div className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-[#4f5560] bg-[#2f3338] text-[10px] font-semibold text-slate-300">
                      {row.index}
                    </div>

                    {editor.workspace.grid.columns.map((column) => {
                      const address = getCellAddress(column.index, row.index);
                      const active =
                        editor.workspace.selection.cell.column === column.index &&
                        editor.workspace.selection.cell.row === row.index;

                      return (
                        <button
                          key={address}
                          type="button"
                          aria-label={`Cell ${address}`}
                          title={address}
                          className={
                            active
                              ? "border-r border-b border-[#5f6773] bg-[#414852] outline-none"
                              : "border-r border-b border-[#4f5560] bg-[#34383d] outline-none hover:bg-[#3a3f45]"
                          }
                          onClick={() => editor.actions.selectCell({ column: column.index, row: row.index })}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>

              {previewPlacement ? (
                <div
                  className="pointer-events-none absolute z-30 border border-dashed border-cyan-300/80 bg-cyan-200/12"
                  style={{
                    left: editor.workspace.grid.cellSize + (previewPlacement.startColumn - 1) * editor.workspace.grid.cellSize,
                    top: editor.workspace.grid.cellSize + (previewPlacement.startRow - 1) * editor.workspace.grid.cellSize,
                    width: previewPlacement.columnSpan * editor.workspace.grid.cellSize,
                    height: previewPlacement.rowSpan * editor.workspace.grid.cellSize,
                  }}
                />
              ) : null}

              {headerPlacement ? (
                <div
                  className="absolute z-20 p-1"
                  style={{
                    left: editor.workspace.grid.cellSize + (headerPlacement.startColumn - 1) * editor.workspace.grid.cellSize,
                    top: editor.workspace.grid.cellSize + (headerPlacement.startRow - 1) * editor.workspace.grid.cellSize,
                    width: headerPlacement.columnSpan * editor.workspace.grid.cellSize,
                    height: headerPlacement.rowSpan * editor.workspace.grid.cellSize,
                  }}
                >
                  <div
                    className="relative h-full w-full cursor-move select-none touch-none"
                    onPointerDown={(event) => handleHeaderDragStart(event, headerPlacement)}
                  >
                    <section className="pointer-events-none h-full rounded-none border border-[#7a8696] bg-slate-900/82 shadow-[0_10px_22px_rgba(0,0,0,0.26)]" />

                    {resizeHandleConfigs.map((config) => (
                      <button
                        key={config.handle}
                        type="button"
                        aria-label={`Resize header ${config.handle}`}
                        className={config.className}
                        onPointerDown={handleHeaderResizeStart(config.handle, headerPlacement)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <EditorToolbarPanel />
    </div>
  );
}
