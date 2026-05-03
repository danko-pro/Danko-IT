import { useLayoutEffect, useRef, useState, type RefObject } from "react";

const SCENE_HEIGHT_RESET_MS = 380;

export function useCalculatorSceneHeight(
  activeKey: string,
  activeSceneRef: RefObject<HTMLElement | null>,
  refreshKey: string | number = "",
): number | null {
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const previousHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const target = activeSceneRef.current;
    if (!target) return;

    const nextHeight = measureHeight(target);
    const previousHeight = previousHeightRef.current;
    previousHeightRef.current = nextHeight;
    if (!previousHeight || previousHeight === nextHeight) {
      setStageHeight(null);
      return;
    }

    setStageHeight(previousHeight);
    const frameId = window.requestAnimationFrame(() => setStageHeight(nextHeight));
    const timeoutId = window.setTimeout(() => setStageHeight(null), SCENE_HEIGHT_RESET_MS);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [activeKey, activeSceneRef, refreshKey]);

  useLayoutEffect(() => {
    const target = activeSceneRef.current;
    if (!target) return;

    let frameId: number | null = null;
    const scheduleMeasure = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        previousHeightRef.current = measureHeight(target);
      });
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(target);
    scheduleMeasure();
    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [activeKey, activeSceneRef, refreshKey]);

  return stageHeight;
}

function measureHeight(target: HTMLElement): number {
  return Math.ceil(target.getBoundingClientRect().height);
}
