import { useLayoutEffect, useRef, useState } from "react";

export function useDashboardSceneHeight(activeScene: "card" | "accounting", watchValue: unknown) {
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const cardSceneRef = useRef<HTMLDivElement | null>(null);
  const accountingSceneRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const updateStageHeight = () => {
      const target = activeScene === "card" ? cardSceneRef.current : accountingSceneRef.current;
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

    if (cardSceneRef.current) {
      observer.observe(cardSceneRef.current);
    }

    if (accountingSceneRef.current) {
      observer.observe(accountingSceneRef.current);
    }

    window.addEventListener("resize", updateStageHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateStageHeight);
    };
  }, [activeScene, watchValue]);

  return {
    stageHeight,
    cardSceneRef,
    accountingSceneRef,
  };
}
