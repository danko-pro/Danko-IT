import type { ContractSyncState } from "../model/project-contract-sync";
import type { ProjectCardContract } from "../model/project-model";

export const idleContractSyncState: ContractSyncState = {
  uploading: false,
  extracting: false,
  tone: "info",
  message: null,
};

export function buildContractSyncState(state: ContractSyncState): ContractSyncState {
  return state;
}

export function buildContractExtractingState(message: string): ContractSyncState {
  return buildContractSyncState({
    uploading: false,
    extracting: true,
    tone: "info",
    message,
  });
}

export function buildContractUploadingState(message: string): ContractSyncState {
  return buildContractSyncState({
    uploading: true,
    extracting: false,
    tone: "info",
    message,
  });
}

export function buildContractSyncSuccessState(message: string): ContractSyncState {
  return buildContractSyncState({
    uploading: false,
    extracting: false,
    tone: "success",
    message,
  });
}

export function buildContractSyncInfoState(message: string): ContractSyncState {
  return buildContractSyncState({
    uploading: false,
    extracting: false,
    tone: "info",
    message,
  });
}

export function buildContractSyncErrorState(message: string): ContractSyncState {
  return buildContractSyncState({
    uploading: false,
    extracting: false,
    tone: "error",
    message,
  });
}

export function getContractSyncErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function markContractStarted(contract: ProjectCardContract, startedAt: string): ProjectCardContract {
  return {
    ...contract,
    startDate: startedAt,
    extractionStatus: "verified",
  };
}

export function markContractMilestoneCompleted(
  contract: ProjectCardContract,
  milestoneId: string,
): ProjectCardContract {
  return {
    ...contract,
    extractionStatus: "verified",
    milestones: contract.milestones.map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, status: "completed" } : milestone,
    ),
  };
}

export function isPersistedMilestoneId(milestoneId: string) {
  return /^\d+$/.test(milestoneId);
}
