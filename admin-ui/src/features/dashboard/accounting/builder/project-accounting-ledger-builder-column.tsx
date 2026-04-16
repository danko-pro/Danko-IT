import type { ReactNode } from "react";

type ProjectAccountingLedgerBuilderColumnProps = {
  title: string;
  className?: string;
  hideTitle?: boolean;
  children: ReactNode;
};

export function ProjectAccountingLedgerBuilderColumn(props: ProjectAccountingLedgerBuilderColumnProps) {
  const className = props.className
    ? `dashboard-ledger-builder-column ${props.className}`
    : "dashboard-ledger-builder-column";

  return (
    <div className={className}>
      {props.hideTitle ? null : (
        <div className="dashboard-ledger-builder-column-head">
          <div className="dashboard-ledger-builder-column-title">{props.title}</div>
        </div>
      )}

      <div className="dashboard-ledger-builder-row">{props.children}</div>
    </div>
  );
}
