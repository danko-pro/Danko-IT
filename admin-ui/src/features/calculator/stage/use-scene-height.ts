import { useLayoutEffect, useRef, useState, type RefObject } from "react";

const SCENE_GROW_RESET_MS = 380;
const SCENE_SHRINK_HOLD_MS = 90;
const SCENE_SHRINK_RESET_MS = 660;

export type CalculatorSceneHeightMotion = "grow" | "shrink" | "steady";

export type CalculatorSceneHeightState = {
  height: number | null;
  motion: CalculatorSceneHeightMotion;
};

export function useCalculatorSceneHeight(
  activeKey: string,
  activeSceneRef: RefObject<HTMLElement | null>,
  refreshKey: string | number = "",
): CalculatorSceneHeightState {
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const [motion, setMotion] = useState<CalculatorSceneHeightMotion>("steady");
  const previousHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const target = activeSceneRef.current;
    if (!target) return;

    const nextHeight = measureHeight(target);
    const previousHeight = previousHeightRef.current;
    previousHeightRef.current = nextHeight;
    if (!previousHeight || previousHeight === nextHeight) {
      setStageHeight(null);
      setMotion("steady");
      return;
    }

    const isShrink = nextHeight < previousHeight;
    setStageHeight(previousHeight);
    setMotion(isShrink ? "shrink" : "grow");

    let frameId: number | null = null;
    const delayId = window.setTimeout(
      () => {
        frameId = window.requestAnimationFrame(() => setStageHeight(nextHeight));
      },
      isShrink ? SCENE_SHRINK_HOLD_MS : 0,
    );
    const timeoutId = window.setTimeout(
      () => {
        setStageHeight(null);
        setMotion("steady");
      },
      isShrink ? SCENE_SHRINK_RESET_MS : SCENE_GROW_RESET_MS,
    );
    return () => {
      window.clearTimeout(delayId);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
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

  return { height: stageHeight, motion };
}

function measureHeight(target: HTMLElement): number {
  return Math.ceil(target.getBoundingClientRect().height);
}
