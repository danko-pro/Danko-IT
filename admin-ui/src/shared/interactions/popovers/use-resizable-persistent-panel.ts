import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

export type ResizablePanelSize = {
  width: number;
  height: number;
};

export type ResizablePanelDirection =
  | "right"
  | "bottom"
  | "top"
  | "bottom-right"
  | "top-right";

type UseResizablePersistentPanelParams = {
  enabled?: boolean;
  storageKey: string;
  defaultSize: ResizablePanelSize;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
};

const STORAGE_VERSION = 1;

type StoredPanelSize = {
  version: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeBounds(params: UseResizablePersistentPanelParams) {
  const minWidth = Math.max(params.minWidth, 0);
  const minHeight = Math.max(params.minHeight, 0);
  const maxWidth = Math.max(params.maxWidth, minWidth);
  const maxHeight = Math.max(params.maxHeight, minHeight);

  return {
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  };
}

function clampSize(
  size: ResizablePanelSize,
  params: UseResizablePersistentPanelParams,
): ResizablePanelSize {
  const bounds = normalizeBounds(params);

  return {
    width: clamp(size.width, bounds.minWidth, bounds.maxWidth),
    height: clamp(size.height, bounds.minHeight, bounds.maxHeight),
  };
}

function readStoredSize(
  storageKey: string,
  fallback: ResizablePanelSize,
): ResizablePanelSize {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as StoredPanelSize;
    if (
      parsed.version !== STORAGE_VERSION ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return fallback;
    }

    return {
      width: parsed.width,
      height: parsed.height,
    };
  } catch {
    return fallback;
  }
}

export function useResizablePersistentPanel(
  params: UseResizablePersistentPanelParams,
) {
  const isEnabled = params.enabled ?? true;
  const [size, setSize] = useState<ResizablePanelSize>(() =>
    clampSize(
      isEnabled ? readStoredSize(params.storageKey, params.defaultSize) : params.defaultSize,
      params,
    ),
  );
  const [isResizing, setIsResizing] = useState(false);
  const sizeRef = useRef(size);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    setSize((current) => clampSize(current, params));
  }, [
    isEnabled,
    params.defaultSize.height,
    params.defaultSize.width,
    params.maxHeight,
    params.maxWidth,
    params.minHeight,
    params.minWidth,
  ]);

  useEffect(() => {
    if (!isEnabled || typeof window === "undefined") {
      return;
    }

    const payload: StoredPanelSize = {
      version: STORAGE_VERSION,
      width: size.width,
      height: size.height,
    };

    window.localStorage.setItem(params.storageKey, JSON.stringify(payload));
  }, [isEnabled, params.storageKey, size.height, size.width]);

  const startResize = (
    direction: ResizablePanelDirection,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!isEnabled) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = sizeRef.current;
    const bounds = normalizeBounds(params);

    setIsResizing(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const shouldResizeWidth = direction === "right" || direction === "bottom-right" || direction === "top-right";
      const shouldResizeHeightFromBottom = direction === "bottom" || direction === "bottom-right";
      const shouldResizeHeightFromTop = direction === "top" || direction === "top-right";
      const nextWidth = shouldResizeWidth ? startSize.width + deltaX : startSize.width;
      const nextHeight = shouldResizeHeightFromBottom
        ? startSize.height + deltaY
        : shouldResizeHeightFromTop
          ? startSize.height - deltaY
          : startSize.height;

      setSize({
        width: clamp(nextWidth, bounds.minWidth, bounds.maxWidth),
        height: clamp(nextHeight, bounds.minHeight, bounds.maxHeight),
      });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const createResizeHandlePointerDown =
    (direction: ResizablePanelDirection) => (event: ReactPointerEvent<HTMLElement>) => {
      startResize(direction, event);
    };

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      width: `${size.width}px`,
      height: `${size.height}px`,
      minWidth: `${params.minWidth}px`,
      minHeight: `${params.minHeight}px`,
      maxWidth: `${Math.max(params.maxWidth, params.minWidth)}px`,
      maxHeight: `${Math.max(params.maxHeight, params.minHeight)}px`,
    }),
    [
      params.maxHeight,
      params.maxWidth,
      params.minHeight,
      params.minWidth,
      size.height,
      size.width,
    ],
  );

  return {
    isResizing,
    panelStyle,
    size,
    createResizeHandlePointerDown,
  };
}
