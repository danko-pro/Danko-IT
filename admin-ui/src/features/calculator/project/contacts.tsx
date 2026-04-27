import { WorkspaceInlineField } from "./fields";
import type { ProjectPaneProps } from "./pane-props";

export function ProjectContacts(props: ProjectPaneProps) {
  const { draft, updateDraft } = props;

  return (
    <div className="calculator-project-workspace-pane">
      <div className="calculator-project-workspace-grid">
        <WorkspaceInlineField label="Заказчик" value={draft.clientName} onChange={(value) => updateDraft("clientName", value)} />
        <WorkspaceInlineField
          label="Телефон / Telegram"
          value={draft.clientContact}
          onChange={(value) => updateDraft("clientContact", value)}
        />
        <WorkspaceInlineField label="Менеджер" value={draft.managerName} onChange={(value) => updateDraft("managerName", value)} />
        <WorkspaceInlineField
          label="Телефон / Telegram"
          value={draft.managerContact}
          onChange={(value) => updateDraft("managerContact", value)}
        />
        <WorkspaceInlineField label="Дизайнер" value={draft.designerName} onChange={(value) => updateDraft("designerName", value)} />
        <WorkspaceInlineField
          label="Телефон / Telegram"
          value={draft.designerContact}
          onChange={(value) => updateDraft("designerContact", value)}
        />
        <WorkspaceInlineField label="Прораб" value={draft.foremanName} onChange={(value) => updateDraft("foremanName", value)} />
        <WorkspaceInlineField
          label="Телефон / Telegram"
          value={draft.foremanContact}
          onChange={(value) => updateDraft("foremanContact", value)}
        />
        <WorkspaceInlineField
          label="Менеджер по материалам"
          value={draft.materialsManagerName}
          onChange={(value) => updateDraft("materialsManagerName", value)}
        />
        <WorkspaceInlineField
          label="Телефон / Telegram"
          value={draft.materialsManagerContact}
          onChange={(value) => updateDraft("materialsManagerContact", value)}
        />
      </div>

      <div className="calculator-project-workspace-grid calculator-project-workspace-grid-single">
        <WorkspaceInlineField
          label="Ссылка на чат объекта"
          value={draft.objectChatLink}
          onChange={(value) => updateDraft("objectChatLink", value)}
        />
      </div>
    </div>
  );
}
