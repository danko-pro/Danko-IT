import type { CSSProperties, ReactNode } from "react";
import {
  ProjectAccountingLedgerPopoverResizeHandles,
  ProjectAccountingLedgerPopoverShell,
  useLedgerPopoverDismiss,
  useWorkspacePopover,
} from "../overlay";
import {
  useResizablePersistentPanel,
  type ResizablePanelSize,
} from "../../../../shared/interactions/popovers";

// Общий каркас popover-панелей builder-а:
// позиционирование в workspace, закрытие по клику вне панели
// и опциональный resizable-режим с единым shell/body контрактом.
type LedgerBuilderResizablePopoverConfig = {
  storageKey: string;
  defaultSize: ResizablePanelSize;
  minWidth: number;
  minHeight: number;
};

type UseProjectAccountingLedgerBuilderPopoverParams = {
  isOpen: boolean;
  onClose: () => void;
  preferredMaxHeight: number;
  minimumHeight: number;
  bodyClassName?: string;
  resizable?: LedgerBuilderResizablePopoverConfig;
};

type ProjectAccountingLedgerBuilderPopoverState = {
  rootRef: ReturnType<typeof useWorkspacePopover>["rootRef"];
  menuRef: ReturnType<typeof useWorkspacePopover>["menuRef"];
  menuPlacement: ReturnType<typeof useWorkspacePopover>["menuPlacement"];
  shellStyle?: CSSProperties;
  bodyClassName?: string;
  style: CSSProperties;
  showResizeHandles: boolean;
  onResizeHandlePointerDown: ReturnType<
    typeof useResizablePersistentPanel
  >["createResizeHandlePointerDown"];
};

type ProjectAccountingLedgerBuilderPopoverProps = {
  popover: ProjectAccountingLedgerBuilderPopoverState;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

const DISABLED_RESIZABLE_CONFIG: LedgerBuilderResizablePopoverConfig = {
  storageKey: "dashboard-ledger:popover:disabled",
  defaultSize: {
    width: 320,
    height: 240,
  },
  minWidth: 280,
  minHeight: 180,
};

function buildPopoverShellStyle(
  menuOffsetX: number,
  menuArrowOffsetX: number | null,
): CSSProperties | undefined {
  if (!menuOffsetX && menuArrowOffsetX === null) {
    return undefined;
  }

  return {
    transform: menuOffsetX ? `translateX(${menuOffsetX}px)` : undefined,
    ["--dashboard-ledger-popover-arrow-left" as string]:
      menuArrowOffsetX !== null ? `${menuArrowOffsetX}px` : undefined,
  };
}

function buildPopoverBodyClassName(
  bodyClassName: string | undefined,
  isResizable: boolean,
  isResizing: boolean,
): string | undefined {
  if (!isResizable) {
    return bodyClassName;
  }

  const resizableClassName = isResizing
    ? "dashboard-ledger-resizable-cloud-body dashboard-ledger-popover-body-resizing"
    : "dashboard-ledger-resizable-cloud-body";

  return bodyClassName ? `${resizableClassName} ${bodyClassName}` : resizableClassName;
}

export function useProjectAccountingLedgerBuilderPopover(
  params: UseProjectAccountingLedgerBuilderPopoverParams,
): ProjectAccountingLedgerBuilderPopoverState {
  const workspacePopover = useWorkspacePopover(
    params.isOpen,
    params.preferredMaxHeight,
    params.minimumHeight,
  );
  const resizableConfig = params.resizable ?? DISABLED_RESIZABLE_CONFIG;
  const resizablePanel = useResizablePersistentPanel({
    enabled: Boolean(params.resizable),
    storageKey: resizableConfig.storageKey,
    defaultSize: resizableConfig.defaultSize,
    minWidth: resizableConfig.minWidth,
    minHeight: resizableConfig.minHeight,
    maxWidth: workspacePopover.menuMaxWidth,
    maxHeight: workspacePopover.menuMaxHeight,
  });

  useLedgerPopoverDismiss(params.isOpen, workspacePopover.rootRef, params.onClose);

  return {
    rootRef: workspacePopover.rootRef,
    menuRef: workspacePopover.menuRef,
    menuPlacement: workspacePopover.menuPlacement,
    shellStyle: buildPopoverShellStyle(
      workspacePopover.menuOffsetX,
      workspacePopover.menuArrowOffsetX,
    ),
    bodyClassName: buildPopoverBodyClassName(
      params.bodyClassName,
      Boolean(params.resizable),
      resizablePanel.isResizing,
    ),
    style: params.resizable
      ? resizablePanel.panelStyle
      : { maxHeight: `${workspacePopover.menuMaxHeight}px` },
    showResizeHandles: Boolean(params.resizable),
    onResizeHandlePointerDown: resizablePanel.createResizeHandlePointerDown,
  };
}

export function ProjectAccountingLedgerBuilderPopover(
  props: ProjectAccountingLedgerBuilderPopoverProps,
) {
  return (
    <ProjectAccountingLedgerPopoverShell
      menuRef={props.popover.menuRef}
      placement={props.popover.menuPlacement}
      ariaLabel={props.ariaLabel}
      className={props.className}
      shellStyle={props.popover.shellStyle}
      bodyClassName={props.popover.bodyClassName}
      style={props.popover.style}
    >
      {props.children}

      {props.popover.showResizeHandles ? (
        <ProjectAccountingLedgerPopoverResizeHandles
          placement={props.popover.menuPlacement}
          onResizeHandlePointerDown={props.popover.onResizeHandlePointerDown}
        />
      ) : null}
    </ProjectAccountingLedgerPopoverShell>
  );
}
