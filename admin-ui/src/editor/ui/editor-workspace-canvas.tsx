import { Fragment, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

import { getCellAddress } from "../model/editor-logic";
import type {
  EditorCanvasPlacement,
  EditorCell,
  EditorResizeHandle,
  EditorWorkspace,
  EditorWorkspaceActions,
} from "../model/editor-types";

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

type EditorWorkspaceCanvasProps = {
  workspace: EditorWorkspace;
  actions: EditorWorkspaceActions;
  viewportRef: RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  previewPlacement: EditorCanvasPlacement | null;
  headerPlacement: EditorCanvasPlacement | null;
  onWorkspaceDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onWorkspaceDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onWorkspaceDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onHeaderDragStart: (event: ReactPointerEvent<HTMLDivElement>, placement: EditorCanvasPlacement) => void;
  onHeaderResizeStart: (
    handle: EditorResizeHandle,
    placement: EditorCanvasPlacement,
  ) => (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export function EditorWorkspaceCanvas(props: EditorWorkspaceCanvasProps) {
  const headerPlacement = props.headerPlacement;

  return (
    <section
      aria-label={props.workspace.title}
      className="min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-none border border-[#4b5058] bg-[#34383d]"
    >
      <div
        ref={props.viewportRef}
        className="h-full overflow-auto"
        onDragLeave={props.onWorkspaceDragLeave}
        onDragOver={props.onWorkspaceDragOver}
        onDrop={props.onWorkspaceDrop}
      >
        <div className="min-h-full min-w-max">
          <div className="relative" style={{ width: props.canvasWidth, height: props.canvasHeight }}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${props.workspace.grid.cellSize}px repeat(${props.workspace.grid.columnCount}, ${props.workspace.grid.cellSize}px)`,
                gridAutoRows: `${props.workspace.grid.cellSize}px`,
              }}
            >
              <div className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-[#4f5560] bg-[#2d3136] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                {props.workspace.selection.address}
              </div>

              {props.workspace.grid.columns.map((column) => (
                <div
                  key={column.label}
                  className="sticky top-0 z-20 flex items-center justify-center border-b border-r border-[#4f5560] bg-[#2f3338] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"
                >
                  {column.label}
                </div>
              ))}

              {props.workspace.grid.rows.map((row) => (
                <Fragment key={row.index}>
                  <div className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-[#4f5560] bg-[#2f3338] text-[10px] font-semibold text-slate-300">
                    {row.index}
                  </div>

                  {props.workspace.grid.columns.map((column) => {
                    const address = getCellAddress(column.index, row.index);
                    const active =
                      props.workspace.selection.cell.column === column.index &&
                      props.workspace.selection.cell.row === row.index;

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
                        onClick={() => props.actions.selectCell({ column: column.index, row: row.index })}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>

            {props.previewPlacement ? (
              <div
                className="pointer-events-none absolute z-30 border border-dashed border-cyan-300/80 bg-cyan-200/12"
                style={{
                  left: props.workspace.grid.cellSize + (props.previewPlacement.startColumn - 1) * props.workspace.grid.cellSize,
                  top: props.workspace.grid.cellSize + (props.previewPlacement.startRow - 1) * props.workspace.grid.cellSize,
                  width: props.previewPlacement.columnSpan * props.workspace.grid.cellSize,
                  height: props.previewPlacement.rowSpan * props.workspace.grid.cellSize,
                }}
              />
            ) : null}

            {headerPlacement ? (
              <div
                className="absolute z-20 p-1"
                style={{
                  left: props.workspace.grid.cellSize + (headerPlacement.startColumn - 1) * props.workspace.grid.cellSize,
                  top: props.workspace.grid.cellSize + (headerPlacement.startRow - 1) * props.workspace.grid.cellSize,
                  width: headerPlacement.columnSpan * props.workspace.grid.cellSize,
                  height: headerPlacement.rowSpan * props.workspace.grid.cellSize,
                }}
              >
                <div
                  className="relative h-full w-full cursor-move select-none touch-none"
                  onPointerDown={(event) => props.onHeaderDragStart(event, headerPlacement)}
                >
                  <section className="pointer-events-none h-full rounded-none border border-[#7a8696] bg-slate-900/82 shadow-[0_10px_22px_rgba(0,0,0,0.26)]" />

                  {resizeHandleConfigs.map((config) => (
                    <button
                      key={config.handle}
                      type="button"
                      aria-label={`Resize header ${config.handle}`}
                      className={config.className}
                      onPointerDown={props.onHeaderResizeStart(config.handle, headerPlacement)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
