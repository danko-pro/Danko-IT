import { ProjectAccountingLedgerDeleteAction } from "./project-accounting-ledger-delete-action";
import { ProjectAccountingLedgerEntryGrid } from "./project-accounting-ledger-entry-grid";
import type { ProjectAccountingLedgerEntryBuilderProps } from "./project-accounting-ledger-entry-builder-types";

export type { ProjectAccountingLedgerEntryBuilderProps } from "./project-accounting-ledger-entry-builder-types";

export function ProjectAccountingLedgerEntryBuilder(
  props: ProjectAccountingLedgerEntryBuilderProps,
) {
  return (
    <div className="dashboard-ledger-builder-entry-shell">
      <div className="dashboard-ledger-builder-entry-main">
        <ProjectAccountingLedgerEntryGrid {...props} />
      </div>

      <div className="dashboard-ledger-builder-entry-actions">
        <ProjectAccountingLedgerDeleteAction
          isOpen={props.isDeleteConfirmOpen}
          onOpen={props.onRequestDelete}
          onClose={props.onCancelDelete}
          onConfirm={props.onConfirmDelete}
        />
      </div>
    </div>
  );
}
