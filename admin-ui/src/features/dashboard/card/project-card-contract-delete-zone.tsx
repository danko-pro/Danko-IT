import { Button, ConfirmDeleteContent } from "../../../shared/controls";
import type { ProjectCardContractEditorProps } from "./project-card-contract-types";

type ProjectCardContractDeleteZoneProps = Pick<
  ProjectCardContractEditorProps,
  | "hasSavedContract"
  | "isBusy"
  | "isDeleteConfirmOpen"
  | "isDeleting"
  | "onCloseDeleteConfirm"
  | "onDelete"
  | "onOpenDeleteConfirm"
>;

export function ProjectCardContractDeleteZone(props: ProjectCardContractDeleteZoneProps) {
  if (!props.hasSavedContract) {
    return null;
  }

  return (
    <div className="dashboard-project-contract-delete-zone">
      {props.isDeleteConfirmOpen ? (
        <div className="dashboard-project-contract-delete-confirm">
          <ConfirmDeleteContent
            message="Удалить договор и связанные вехи?"
            busy={props.isBusy}
            onCancel={props.onCloseDeleteConfirm}
            onConfirm={props.onDelete}
          />
        </div>
      ) : (
        <button
          type="button"
          className="dashboard-project-contract-delete-trigger"
          onClick={props.onOpenDeleteConfirm}
          disabled={props.isBusy}
        >
          Удалить договор
        </button>
      )}
    </div>
  );
}
