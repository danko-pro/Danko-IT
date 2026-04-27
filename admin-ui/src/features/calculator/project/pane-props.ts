import type {
  ProjectKpRowDraft,
  ProjectKpRowDraftSetter,
  ProjectWorkspaceDraft,
  ProjectWorkspaceDraftSetter,
} from "./types";

export type ProjectPaneProps = {
  draft: ProjectWorkspaceDraft;
  updateDraft: ProjectWorkspaceDraftSetter;
};

export type ProjectKpProps = ProjectPaneProps & {
  kpRows: ProjectKpRowDraft[];
  updateKpRow: ProjectKpRowDraftSetter;
};
