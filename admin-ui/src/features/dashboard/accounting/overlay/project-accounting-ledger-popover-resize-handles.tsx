import type { PointerEvent as ReactPointerEvent } from "react";
import type { ResizablePanelDirection } from "../../../../shared/interactions/popovers";
import { PanelResizeHandle } from "../../../../shared/ui/popovers";

type ProjectAccountingLedgerPopoverResizeHandlesProps = {
  placement: "up" | "down";
  onResizeHandlePointerDown: (
    direction: ResizablePanelDirection,
  ) => (event: ReactPointerEvent<HTMLElement>) => void;
};

export function ProjectAccountingLedgerPopoverResizeHandles(
  props: ProjectAccountingLedgerPopoverResizeHandlesProps,
) {
  return (
    <>
      <PanelResizeHandle
        variant="edge-right"
        className="dashboard-ledger-resizable-cloud-resize dashboard-ledger-resizable-cloud-resize-right"
        onPointerDown={props.onResizeHandlePointerDown("right")}
      />
      <PanelResizeHandle
        variant={props.placement === "up" ? "edge-top" : "edge-bottom"}
        className="dashboard-ledger-resizable-cloud-resize dashboard-ledger-resizable-cloud-resize-edge"
        onPointerDown={props.onResizeHandlePointerDown(props.placement === "up" ? "top" : "bottom")}
      />
    </>
  );
}
