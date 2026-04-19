import { Button } from "../../../shared/controls";
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
          <div className="dashboard-project-contract-delete-confirm-text">
            Удалить договор и связанные вехи?
          </div>
          <div className="dashboard-project-contract-delete-confirm-actions">
            <button
              type="button"
              className="dashboard-project-contract-danger-button"
              onClick={props.onDelete}
              disabled={props.isBusy}
            >
              {props.isDeleting ? "Удаляю..." : "Удалить"}
            </button>
            <Button variant="secondary" onClick={props.onCloseDeleteConfirm} disabled={props.isBusy}>
              Отмена
            </Button>
          </div>
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
