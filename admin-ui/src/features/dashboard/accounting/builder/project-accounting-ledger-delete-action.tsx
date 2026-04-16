import { ProjectAccountingLedgerPopoverShell, useLedgerPopoverDismiss, useWorkspacePopover } from "../overlay";

type ProjectAccountingLedgerDeleteActionProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ProjectAccountingLedgerDeleteAction(props: ProjectAccountingLedgerDeleteActionProps) {
  const { rootRef, menuRef, menuPlacement, menuMaxHeight } = useWorkspacePopover(props.isOpen, 180, 120);
  useLedgerPopoverDismiss(props.isOpen, rootRef, props.onClose);

  return (
    <div
      ref={rootRef}
      className={
        props.isOpen
          ? "dashboard-ledger-builder-delete-action dashboard-ledger-builder-delete-action-open"
          : "dashboard-ledger-builder-delete-action"
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          props.onClose();
        }
      }}
    >
      <button
        type="button"
        className={
          props.isOpen
            ? "dashboard-ledger-builder-delete-button dashboard-ledger-builder-delete-button-open"
            : "dashboard-ledger-builder-delete-button"
        }
        aria-label="Удалить строку"
        aria-haspopup="dialog"
        aria-expanded={props.isOpen}
        onClick={() => {
          if (props.isOpen) {
            props.onClose();
            return;
          }

          props.onOpen();
        }}
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 fill-none stroke-current"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.75 4.5h8.5" />
          <path d="M6.25 2.75h3.5" />
          <path d="M5 4.5v6.75c0 .55.45 1 1 1h4c.55 0 1-.45 1-1V4.5" />
          <path d="M6.85 6.35v3.4" />
          <path d="M9.15 6.35v3.4" />
        </svg>
      </button>

      {props.isOpen ? (
        <ProjectAccountingLedgerPopoverShell
          menuRef={menuRef}
          placement={menuPlacement}
          ariaLabel="Подтверждение удаления строки"
          className="dashboard-ledger-builder-delete-cloud"
          style={{ maxHeight: `${menuMaxHeight}px` }}
        >
          <div className="dashboard-ledger-builder-delete-cloud-copy">Удалить строку?</div>

          <div className="dashboard-ledger-builder-delete-cloud-actions">
            <button
              type="button"
              className="dashboard-ledger-builder-delete-cloud-button dashboard-ledger-builder-delete-cloud-button-danger"
              onClick={props.onConfirm}
            >
              Удалить
            </button>
            <button
              type="button"
              className="dashboard-ledger-builder-delete-cloud-button"
              onClick={props.onClose}
            >
              Отмена
            </button>
          </div>
        </ProjectAccountingLedgerPopoverShell>
      ) : null}
    </div>
  );
}
