import type { HTMLAttributes } from "react";

type PanelResizeHandleVariant =
  | "edge-right"
  | "edge-bottom"
  | "edge-top"
  | "corner-bottom-right"
  | "corner-top-right";

type PanelResizeHandleProps = HTMLAttributes<HTMLDivElement> & {
  variant: PanelResizeHandleVariant;
};

export function PanelResizeHandle(props: PanelResizeHandleProps) {
  const { className, variant, ...rest } = props;
  const variantClass = `ui-resizable-panel-handle-${variant}`;
  const showLines = variant === "corner-bottom-right" || variant === "corner-top-right";

  return (
    <div
      {...rest}
      className={
        className
          ? `ui-resizable-panel-handle ${variantClass} ${className}`
          : `ui-resizable-panel-handle ${variantClass}`
      }
      role="presentation"
    >
      {showLines ? <span className="ui-resizable-panel-handle-lines" aria-hidden="true" /> : null}
    </div>
  );
}
