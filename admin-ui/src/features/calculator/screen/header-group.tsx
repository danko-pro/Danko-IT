import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type AnimatedHeaderGroupProps = {
  title?: string;
  empty?: boolean;
  children: ReactNode;
};

export function AnimatedHeaderGroup(props: AnimatedHeaderGroupProps) {
  const { title, empty = false, children } = props;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      setContentHeight(node.getBoundingClientRect().height);
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
  }, []);

  return (
    <div className={empty ? "calculator-header-group calculator-header-group-empty" : "calculator-header-group"}>
      {title ? <div className="row-kicker">{title}</div> : null}
      <div className="calculator-header-group-body" style={contentHeight === null ? undefined : { height: `${contentHeight}px` }}>
        <div
          ref={contentRef}
          className={title ? "calculator-header-group-content" : "calculator-header-group-content calculator-header-group-content-titleless"}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
