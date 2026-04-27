import { useLayoutEffect, useRef } from "react";

type UseRoomAnchorParams = {
  projectId: number | null;
  selectedRoomId: number | null;
  confirmingRoomId: number | null;
  removingCount: number;
  onChange: (anchorTop: number | null) => void;
};

export function useRoomAnchor(params: UseRoomAnchorParams) {
  const { projectId, selectedRoomId, confirmingRoomId, removingCount, onChange } = params;
  const panelRef = useRef<HTMLElement | null>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const panelNode = panelRef.current;
    const rowNode = activeRowRef.current;

    if (!panelNode || !rowNode) {
      onChange(null);
      return;
    }

    const measure = () => {
      const panelRect = panelNode.getBoundingClientRect();
      const rowRect = rowNode.getBoundingClientRect();
      const anchorTop = Math.round(rowRect.top - panelRect.top + rowRect.height / 2);
      onChange(anchorTop);
    };

    measure();

    const resizeHandler = () => {
      measure();
    };

    window.addEventListener("resize", resizeHandler);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", resizeHandler);
      };
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(panelNode);
    observer.observe(rowNode);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeHandler);
    };
  }, [projectId, selectedRoomId, confirmingRoomId, removingCount, onChange]);

  return { panelRef, activeRowRef };
}
