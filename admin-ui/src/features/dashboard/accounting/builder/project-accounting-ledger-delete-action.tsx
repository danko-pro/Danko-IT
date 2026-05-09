import { ConfirmDeleteContent, DeleteButton } from "../../../../shared/controls";
import {
  ProjectAccountingLedgerBuilderPopover,
  useProjectAccountingLedgerBuilderPopover,
} from "./project-accounting-ledger-builder-popover";

type ProjectAccountingLedgerDeleteActionProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ProjectAccountingLedgerDeleteAction(props: ProjectAccountingLedgerDeleteActionProps) {
  const popover = useProjectAccountingLedgerBuilderPopover({
    isOpen: props.isOpen,
    onClose: props.onClose,
    preferredMaxHeight: 180,
    minimumHeight: 120,
    bodyClassName: "dashboard-ledger-builder-delete-cloud-body",
  });

  return (
    <div
      ref={popover.rootRef}
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
      <DeleteButton
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
      </DeleteButton>

      {props.isOpen ? (
        <ProjectAccountingLedgerBuilderPopover
          popover={popover}
          ariaLabel="Подтверждение удаления строки"
          className="dashboard-ledger-builder-delete-cloud"
        >
          <ConfirmDeleteContent message="Удалить строку?" onCancel={props.onClose} onConfirm={props.onConfirm} />
        </ProjectAccountingLedgerBuilderPopover>
      ) : null}
    </div>
  );
}
