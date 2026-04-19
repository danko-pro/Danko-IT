/**
 * Общие типы contract-панели.
 * Держим контракт синхронизации, draft и props в одном месте,
 * чтобы shell, state и вложенные блоки работали через единый интерфейс.
 */
import type { ContractSyncState } from "../model/project-contract-sync";
import type { ProjectCardAdvanceItem, ProjectCardContract } from "../model/project-model";
import type {
  ProjectCardContractSummary,
  ProjectCardTimelineMilestone,
} from "./project-card-contract-timeline";
export type { ContractSyncState } from "../model/project-contract-sync";

export type ContractDraft = {
  title: string;
  number: string;
  signedAt: string;
  startDate: string;
  plannedEndDate: string;
  amount: string;
  advanceTerms: string;
};

export type ProjectCardContractPanelProps = {
  contract: ProjectCardContract;
  advances: ProjectCardAdvanceItem[];
  onCompleteContractMilestone: (milestoneId: string) => void;
  onUploadContract: (file: File) => void;
  onExtractContract: () => void;
  onUpdateContract: (contract: ProjectCardContract) => void | Promise<void>;
  onDeleteContract: () => void | Promise<void>;
  syncState: ContractSyncState;
};

export type ProjectCardContractContentProps = {
  contract: ProjectCardContract;
  contractSummary: ProjectCardContractSummary;
  extractionChipClass: string;
  extractionChipLabel: string;
  isDownloadingSource: boolean;
  onCompleteContractMilestone: (milestoneId: string) => void;
  onDownloadContractSource: () => void;
  timelineMilestones: ProjectCardTimelineMilestone[];
};

export type ProjectCardContractEditorProps = {
  draft: ContractDraft;
  hasSavedContract: boolean;
  isBusy: boolean;
  isDeleteConfirmOpen: boolean;
  isDeleting: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onCloseDeleteConfirm: () => void;
  onDelete: () => void;
  onDraftChange: (field: keyof ContractDraft, value: string) => void;
  onOpenDeleteConfirm: () => void;
  onSave: () => void;
};
