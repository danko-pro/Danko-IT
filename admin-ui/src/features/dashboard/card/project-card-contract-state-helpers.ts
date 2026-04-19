import type { ProjectCardContract } from "../model/project-model";
import type { ContractDraft } from "./project-card-contract-types";

export const DEFAULT_CONTRACT_TITLE = "Договор без названия";
export const DEFAULT_CONTRACT_NUMBER = "Без номера";

export type ContractSyncDisplayMode = "hidden" | "full" | "compact";

export function buildDraft(contract: ProjectCardContract): ContractDraft {
  return {
    title: contract.title,
    number: contract.number,
    signedAt: contract.signedAt,
    startDate: contract.startDate,
    plannedEndDate: contract.plannedEndDate,
    amount: contract.amount > 0 ? String(contract.amount) : "",
    advanceTerms: contract.advanceTerms,
  };
}

export function hasContractContent(contract: ProjectCardContract) {
  return Boolean(
    contract.sourceFile ||
      contract.downloadUrl ||
      contract.signedAt ||
      contract.startDate ||
      contract.plannedEndDate ||
      contract.amount > 0 ||
      contract.milestones.length > 0 ||
      (contract.number && contract.number !== DEFAULT_CONTRACT_NUMBER) ||
      (contract.title && contract.title !== "Договор не загружен"),
  );
}

export function buildUpdatedContract(contract: ProjectCardContract, draft: ContractDraft): ProjectCardContract {
  const normalizedAmount = Number(draft.amount.replace(",", "."));

  return {
    ...contract,
    title: draft.title.trim() || DEFAULT_CONTRACT_TITLE,
    number: draft.number.trim() || DEFAULT_CONTRACT_NUMBER,
    signedAt: draft.signedAt.trim(),
    startDate: draft.startDate.trim(),
    plannedEndDate: draft.plannedEndDate.trim(),
    amount: Number.isFinite(normalizedAmount) ? Math.max(0, normalizedAmount) : 0,
    advanceTerms: draft.advanceTerms.trim(),
  };
}

export function getContractExtractionChipState(contract: ProjectCardContract) {
  return contract.extractionStatus === "verified"
    ? { className: "stat-chip", label: "Проверено" }
    : { className: "slot-chip", label: "AI требует проверки" };
}
