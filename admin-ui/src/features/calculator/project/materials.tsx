import { WorkspaceInlineField, WorkspaceNoteField } from "./fields";
import type { ProjectPaneProps } from "./pane-props";

export function ProjectMaterials(props: ProjectPaneProps) {
  const { draft, updateDraft } = props;

  return (
    <div className="calculator-project-workspace-pane">
      <div className="calculator-project-workspace-grid">
        <WorkspaceInlineField
          label="Окно доставки"
          value={draft.deliveryWindow}
          onChange={(value) => updateDraft("deliveryWindow", value)}
        />
        <WorkspaceInlineField
          label="Кто принимает"
          value={draft.unloadingContact}
          onChange={(value) => updateDraft("unloadingContact", value)}
        />
        <WorkspaceInlineField
          label="Разгрузка / подъём"
          value={draft.loadingDetails}
          onChange={(value) => updateDraft("loadingDetails", value)}
        />
      </div>

      <div className="calculator-project-workspace-notes">
        <WorkspaceNoteField
          label="Комментарий для материалов"
          value={draft.materialsComment}
          onChange={(value) => updateDraft("materialsComment", value)}
        />
      </div>
    </div>
  );
}
