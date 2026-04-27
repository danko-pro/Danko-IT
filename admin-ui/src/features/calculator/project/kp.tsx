import { WorkspaceInlineField, WorkspaceNoteField } from "./fields";
import type { ProjectKpProps } from "./pane-props";
import { ProjectStageKpTable } from "./table";

export function ProjectKp(props: ProjectKpProps) {
  const { draft, updateDraft, kpRows, updateKpRow } = props;

  return (
    <div className="calculator-project-workspace-pane">
      <div className="calculator-project-workspace-grid calculator-project-workspace-grid-kp-meta">
        <WorkspaceInlineField
          label="Версия КП"
          value={draft.kpVersion}
          onChange={(value) => updateDraft("kpVersion", value)}
        />
        <WorkspaceInlineField
          label="Статус КП"
          value={draft.kpStatus}
          onChange={(value) => updateDraft("kpStatus", value)}
        />
        <WorkspaceInlineField
          label="Кому отправлено"
          value={draft.kpRecipient}
          onChange={(value) => updateDraft("kpRecipient", value)}
        />
      </div>

      <div className="calculator-project-workspace-notes">
        <WorkspaceNoteField
          label="Комментарий по КП"
          value={draft.kpComment}
          onChange={(value) => updateDraft("kpComment", value)}
        />
      </div>

      <ProjectStageKpTable kpRows={kpRows} updateKpRow={updateKpRow} />
    </div>
  );
}
