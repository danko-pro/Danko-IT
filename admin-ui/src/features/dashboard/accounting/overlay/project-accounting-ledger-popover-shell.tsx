import type { CSSProperties, ReactNode, Ref } from "react";

type ProjectAccountingLedgerPopoverShellProps = {
  placement: "up" | "down";
  ariaLabel: string;
  menuRef?: Ref<HTMLDivElement>;
  className?: string;
  bodyClassName?: string;
  shellStyle?: CSSProperties;
  style?: CSSProperties;
  children: ReactNode;
};

export function ProjectAccountingLedgerPopoverShell(props: ProjectAccountingLedgerPopoverShellProps) {
  const placementClass =
    props.placement === "up"
      ? "dashboard-ledger-popover-shell dashboard-ledger-popover-shell-up"
      : "dashboard-ledger-popover-shell dashboard-ledger-popover-shell-down";

  return (
    <div
      ref={props.menuRef}
      className={props.className ? `${placementClass} ${props.className}` : placementClass}
      role="dialog"
      aria-label={props.ariaLabel}
      style={props.shellStyle}
    >
      <div
        className={
          props.bodyClassName
            ? `dashboard-ledger-popover-body ${props.bodyClassName}`
            : "dashboard-ledger-popover-body"
        }
        style={props.style}
      >
        {props.children}
      </div>
    </div>
  );
}
