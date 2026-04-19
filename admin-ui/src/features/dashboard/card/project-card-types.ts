import type { DashboardProjectCardData, ProjectCardContract } from "../model/project-model";
import type { ContractSyncState } from "./project-card-contract-types";

export type ProjectCardProps = {
  project: DashboardProjectCardData;
  onAddAdvance: (payload: { title: string; amount: number; date: string }) => void;
  onDeleteAdvance: (advanceId: string) => void;
  onCompleteContractMilestone: (milestoneId: string) => void;
  onUploadContract: (file: File) => void;
  onExtractContract: () => void;
  onUpdateContract: (contract: ProjectCardContract) => void | Promise<void>;
  onDeleteContract: () => void | Promise<void>;
  contractSyncState: ContractSyncState;
  onOpenAccounting: () => void;
};
