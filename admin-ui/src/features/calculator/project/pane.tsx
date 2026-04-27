import { ProjectContacts } from "./contacts";
import { ProjectDesign } from "./design";
import { ProjectKp } from "./kp";
import { ProjectMaterials } from "./materials";
import { ProjectMontage } from "./montage";
import type { ProjectKpRowDraft, ProjectKpRowDraftSetter, ProjectWorkspaceDraft, ProjectWorkspaceDraftSetter, ProjectWorkspaceTab } from "./types";

type ProjectStagePaneProps = {
  activeTab: ProjectWorkspaceTab;
  draft: ProjectWorkspaceDraft;
  updateDraft: ProjectWorkspaceDraftSetter;
  kpRows: ProjectKpRowDraft[];
  updateKpRow: ProjectKpRowDraftSetter;
};

export function ProjectStagePane(props: ProjectStagePaneProps) {
  const { activeTab, draft, updateDraft, kpRows, updateKpRow } = props;

  if (activeTab === "contacts") {
    return <ProjectContacts draft={draft} updateDraft={updateDraft} />;
  }

  if (activeTab === "materials") {
    return <ProjectMaterials draft={draft} updateDraft={updateDraft} />;
  }

  if (activeTab === "kp") {
    return <ProjectKp draft={draft} updateDraft={updateDraft} kpRows={kpRows} updateKpRow={updateKpRow} />;
  }

  if (activeTab === "design") {
    return <ProjectDesign draft={draft} updateDraft={updateDraft} />;
  }

  return <ProjectMontage draft={draft} updateDraft={updateDraft} />;
}
