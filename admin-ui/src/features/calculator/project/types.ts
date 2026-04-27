export type ProjectStageSectionProps = {
  error: string | null;
};

export type ProjectWorkspaceTab = "contacts" | "materials" | "kp" | "design" | "montage";

export type ProjectWorkspaceTabOption = {
  id: ProjectWorkspaceTab;
  label: string;
  tone?: "default" | "document";
};

export type ProjectKpRowDraft = {
  id: string;
  title: string;
  unit: string;
  quantity: string;
  workRate: string;
  materialRate: string;
};

export type ProjectWorkspaceDraft = {
  clientName: string;
  clientContact: string;
  managerName: string;
  managerContact: string;
  designerName: string;
  designerContact: string;
  foremanName: string;
  foremanContact: string;
  materialsManagerName: string;
  materialsManagerContact: string;
  objectChatLink: string;
  deliveryWindow: string;
  unloadingContact: string;
  loadingDetails: string;
  materialsComment: string;
  kpVersion: string;
  kpStatus: string;
  kpRecipient: string;
  kpComment: string;
  designProjectLink: string;
  designApproval: string;
  designComment: string;
  meetingContact: string;
  accessWindow: string;
  workLimits: string;
  montageComment: string;
};

export type ProjectWorkspaceDraftSetter = <K extends keyof ProjectWorkspaceDraft>(
  key: K,
  value: ProjectWorkspaceDraft[K],
) => void;

export type ProjectKpRowDraftSetter = <K extends keyof ProjectKpRowDraft>(
  rowId: string,
  key: K,
  value: ProjectKpRowDraft[K],
) => void;
