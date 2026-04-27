import { useLayoutEffect, useRef, useState } from "react";

export function useBodyHeight(key: number | null) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = bodyRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      const nextHeight = Math.round(node.getBoundingClientRect().height);
      setBodyHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [key]);

  return { bodyRef, bodyHeight };
}
