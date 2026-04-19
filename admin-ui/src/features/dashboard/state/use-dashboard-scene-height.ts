import { useLayoutEffect, useRef, useState } from "react";
import type { DashboardSceneView } from "../dashboard-scene-types";

export function useDashboardSceneHeight(activeScene: DashboardSceneView, watchValue: unknown) {
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const overviewSceneRef = useRef<HTMLDivElement | null>(null);
  const passportSceneRef = useRef<HTMLDivElement | null>(null);
  const financeSceneRef = useRef<HTMLDivElement | null>(null);
  const accountingSceneRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const updateStageHeight = () => {
      const refsByScene = {
        overview: overviewSceneRef,
        passport: passportSceneRef,
        finance: financeSceneRef,
        accounting: accountingSceneRef,
      } as const;

      const target = refsByScene[activeScene].current;
      if (!target) {
        return;
      }

      const nextHeight = Math.ceil(target.getBoundingClientRect().height);
      setStageHeight(nextHeight > 0 ? nextHeight : null);
    };

    updateStageHeight();

    const observer = new ResizeObserver(() => {
      updateStageHeight();
    });

    for (const sceneRef of [overviewSceneRef, passportSceneRef, financeSceneRef, accountingSceneRef]) {
      if (sceneRef.current) {
        observer.observe(sceneRef.current);
      }
    }

    window.addEventListener("resize", updateStageHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateStageHeight);
    };
  }, [activeScene, watchValue]);

  return {
    stageHeight,
    overviewSceneRef,
    passportSceneRef,
    financeSceneRef,
    accountingSceneRef,
  };
}
