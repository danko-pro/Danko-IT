import { WorkspaceInlineField, WorkspaceNoteField } from "./fields";
import type { ProjectPaneProps } from "./pane-props";

export function ProjectMontage(props: ProjectPaneProps) {
  const { draft, updateDraft } = props;

  return (
    <div className="calculator-project-workspace-pane">
      <div className="calculator-project-workspace-grid">
        <WorkspaceInlineField
          label="Кто встречает"
          value={draft.meetingContact}
          onChange={(value) => updateDraft("meetingContact", value)}
        />
        <WorkspaceInlineField
          label="Время доступа"
          value={draft.accessWindow}
          onChange={(value) => updateDraft("accessWindow", value)}
        />
        <WorkspaceInlineField
          label="Ограничения"
          value={draft.workLimits}
          onChange={(value) => updateDraft("workLimits", value)}
        />
      </div>

      <div className="calculator-project-workspace-notes">
        <WorkspaceNoteField
          label="Комментарий для монтажников"
          value={draft.montageComment}
          onChange={(value) => updateDraft("montageComment", value)}
        />
      </div>
    </div>
  );
}
