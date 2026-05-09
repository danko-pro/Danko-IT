import type { ReactNode } from "react";

export function ConfirmDeleteContent(props: {
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmLabel = props.busy ? props.busyLabel ?? "Удаляю..." : props.confirmLabel ?? "Удалить";

  return (
    <>
      <div className="ui-confirm-delete-copy">{props.message}</div>
      <div className="ui-confirm-delete-actions">
        <button
          type="button"
          className="ui-confirm-delete-button ui-confirm-delete-button-danger"
          disabled={props.busy}
          onClick={props.onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="ui-confirm-delete-button" disabled={props.busy} onClick={props.onCancel}>
          {props.cancelLabel ?? "Отмена"}
        </button>
      </div>
    </>
  );
}
