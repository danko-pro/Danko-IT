import type { DragEvent as ReactDragEvent } from "react";

import { EDITOR_HEADER_CONTAINER_TYPE, EDITOR_TEMPLATE_DRAG_MIME } from "../model/editor-types";

export function EditorToolbarPanel() {
  function handleHeaderDragStart(event: ReactDragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(EDITOR_TEMPLATE_DRAG_MIME, EDITOR_HEADER_CONTAINER_TYPE);
    event.dataTransfer.setData("text/plain", EDITOR_HEADER_CONTAINER_TYPE);
  }

  return (
    <aside
      aria-label="Editor tools"
      className="min-h-[calc(100vh-1.5rem)] border border-[#d9dce1] bg-white p-3"
    >
      <details open className="rounded-none border border-[#d9dce1] bg-white">
        <summary className="cursor-pointer border-b border-[#d9dce1] px-3 py-2 text-sm font-medium text-slate-700">
          Header
        </summary>

        <div className="p-3">
          <div
            draggable
            aria-label="Calculator header container"
            className="cursor-grab active:cursor-grabbing"
            onDragStart={handleHeaderDragStart}
          >
            <section className="glass-panel stage-panel calculator-header min-h-[220px]" />
          </div>
        </div>
      </details>
    </aside>
  );
}
