import { WorkspaceInlineField, WorkspaceNoteField } from "./fields";
import type { ProjectPaneProps } from "./pane-props";

export function ProjectDesign(props: ProjectPaneProps) {
  const { draft, updateDraft } = props;

  return (
    <div className="calculator-project-workspace-pane">
      <div className="calculator-project-workspace-grid">
        <WorkspaceInlineField
          label="Ссылка на проект"
          value={draft.designProjectLink}
          onChange={(value) => updateDraft("designProjectLink", value)}
        />
        <WorkspaceInlineField
          label="Согласование"
          value={draft.designApproval}
          onChange={(value) => updateDraft("designApproval", value)}
        />
      </div>

      <div className="calculator-project-workspace-notes">
        <WorkspaceNoteField
          label="Комментарий для дизайнеров"
          value={draft.designComment}
          onChange={(value) => updateDraft("designComment", value)}
        />
      </div>
    </div>
  );
}
