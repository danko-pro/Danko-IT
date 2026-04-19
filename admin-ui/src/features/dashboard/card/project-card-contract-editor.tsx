/**
 * Редактор contract-панели.
 * Этот слой держит только shell редактора и связывает fields/actions с delete flow.
 */
import { Button } from "../../../shared/controls";
import { ProjectCardContractDeleteZone } from "./project-card-contract-delete-zone";
import { ProjectCardContractEditorFields } from "./project-card-contract-editor-fields";
import type { ProjectCardContractEditorProps } from "./project-card-contract-types";

export function ProjectCardContractEditor(props: ProjectCardContractEditorProps) {
  return (
    <div
      className={
        props.isOpen
          ? "dashboard-project-contract-editor-shell dashboard-project-contract-editor-shell-open"
          : "dashboard-project-contract-editor-shell"
      }
    >
      <div className="dashboard-project-contract-editor-shell-inner">
        <div className="dashboard-project-contract-editor">
          <ProjectCardContractEditorFields draft={props.draft} isBusy={props.isBusy} onDraftChange={props.onDraftChange} />

          <div className="dashboard-project-contract-editor-actions">
            <div className="dashboard-project-contract-editor-actions-main">
              <Button onClick={props.onSave} disabled={props.isBusy}>
                {props.isSubmitting ? "Сохраняю..." : "Сохранить"}
              </Button>
              <Button variant="secondary" onClick={props.onCancel} disabled={props.isBusy}>
                Отмена
              </Button>
            </div>

            <ProjectCardContractDeleteZone
              hasSavedContract={props.hasSavedContract}
              isBusy={props.isBusy}
              isDeleteConfirmOpen={props.isDeleteConfirmOpen}
              isDeleting={props.isDeleting}
              onCloseDeleteConfirm={props.onCloseDeleteConfirm}
              onDelete={props.onDelete}
              onOpenDeleteConfirm={props.onOpenDeleteConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
