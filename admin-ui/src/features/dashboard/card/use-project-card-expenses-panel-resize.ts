import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useResizablePersistentPanel } from "../../../shared/interactions/popovers";

const DEFAULT_WIDTH = 496;
const MIN_WIDTH = 360;
const STORAGE_KEY = "dashboard-project-card:expenses-panel";

export function useProjectCardExpensesPanelResize() {
  const panelRef = useRef<HTMLElement | null>(null);
  const [maxWidth, setMaxWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const parent = panelRef.current?.parentElement;
    if (!parent) {
      return;
    }

    const updateMaxWidth = (nextWidth: number) => {
      setMaxWidth(Math.max(Math.floor(nextWidth), MIN_WIDTH));
    };

    updateMaxWidth(parent.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      const handleWindowResize = () => updateMaxWidth(parent.getBoundingClientRect().width);
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      updateMaxWidth(entry.contentRect.width);
    });

    observer.observe(parent);

    return () => observer.disconnect();
  }, []);

  const resizablePanel = useResizablePersistentPanel({
    storageKey: STORAGE_KEY,
    defaultSize: {
      width: DEFAULT_WIDTH,
      height: 0,
    },
    minWidth: MIN_WIDTH,
    minHeight: 0,
    maxWidth,
    maxHeight: 0,
  });

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      ["--dashboard-project-expenses-panel-width" as string]: `${resizablePanel.size.width}px`,
    }),
    [resizablePanel.size.width],
  );

  return {
    panelRef,
    panelStyle,
    isResizing: resizablePanel.isResizing,
    createResizeHandlePointerDown: resizablePanel.createResizeHandlePointerDown,
  };
}
