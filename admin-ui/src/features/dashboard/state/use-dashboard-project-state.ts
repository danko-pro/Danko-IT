import { useState } from "react";
import { createEmptyLedgerEntry, recalculateProjectFromLedger } from "../model/project-accounting-logic";
import { firstProjectCardMock } from "../model/project-card.mock";
import type { DashboardProjectCardData, ProjectCardLedgerDocument, ProjectCardLedgerEntry } from "../model/project-model";

type AdvancePayload = {
  title: string;
  amount: number;
  date: string;
};

type LedgerDocumentKind = "invoice" | "act";

export function useDashboardProjectState(initialProject: DashboardProjectCardData = firstProjectCardMock) {
  const [project, setProject] = useState(initialProject);

  function addAdvance(payload: AdvancePayload) {
    setProject((current) => ({
      ...current,
      receivedTotal: current.receivedTotal + payload.amount,
      remainingTotal: current.remainingTotal + payload.amount,
      advances: [
        {
          id: `advance-${Date.now()}`,
          title: payload.title.trim() || "Аванс",
          amount: payload.amount,
          date: payload.date,
          status: "paid",
        },
        ...current.advances,
      ],
    }));
  }

  function deleteAdvance(advanceId: string) {
    setProject((current) => {
      const target = current.advances.find((advance) => advance.id === advanceId);
      if (!target) {
        return current;
      }

      const paidDelta = target.status === "paid" ? target.amount : 0;

      return {
        ...current,
        receivedTotal: current.receivedTotal - paidDelta,
        remainingTotal: current.remainingTotal - paidDelta,
        advances: current.advances.filter((advance) => advance.id !== advanceId),
      };
    });
  }

  function completeContractMilestone(milestoneId: string) {
    setProject((current) => ({
      ...current,
      contract: {
        ...current.contract,
        extractionStatus: "verified",
        milestones: current.contract.milestones.map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, status: "completed" } : milestone,
        ),
      },
    }));
  }

  function addLedgerEntry() {
    setProject((current) =>
      recalculateProjectFromLedger({
        ...current,
        ledgerEntries: [createEmptyLedgerEntry(), ...current.ledgerEntries],
      }),
    );
  }

  function deleteLedgerEntry(entryId: string) {
    setProject((current) =>
      recalculateProjectFromLedger({
        ...current,
        ledgerEntries: current.ledgerEntries.filter((entry) => entry.id !== entryId),
      }),
    );
  }

  function updateLedgerEntry(entryId: string, patch: Partial<ProjectCardLedgerEntry>) {
    setProject((current) =>
      recalculateProjectFromLedger({
        ...current,
        ledgerEntries: current.ledgerEntries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
      }),
    );
  }

  function updateLedgerDocument(
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) {
    setProject((current) =>
      recalculateProjectFromLedger({
        ...current,
        ledgerEntries: current.ledgerEntries.map((entry) => {
          if (entry.id !== entryId) {
            return entry;
          }

          const key = kind === "invoice" ? "invoiceDocument" : "actDocument";
          const document = entry[key];
          if (!document) {
            return entry;
          }

          return {
            ...entry,
            [key]: {
              ...document,
              ...patch,
            },
          };
        }),
      }),
    );
  }

  function uploadLedgerDocument(entryId: string, kind: LedgerDocumentKind, file: File) {
    setProject((current) =>
      recalculateProjectFromLedger({
        ...current,
        ledgerEntries: current.ledgerEntries.map((entry) => {
          if (entry.id !== entryId) {
            return entry;
          }

          const key = kind === "invoice" ? "invoiceDocument" : "actDocument";
          const existingDocument = entry[key];
          const uploadedAt = new Date().toISOString();
          const date = existingDocument?.date ?? uploadedAt.slice(0, 10);
          const amount =
            existingDocument?.amount ??
            (kind === "invoice" ? entry.planAmount : entry.actualAmount > 0 ? entry.actualAmount : entry.planAmount);

          return {
            ...entry,
            [key]: {
              id: existingDocument?.id ?? `${kind}-${entry.id}`,
              kind,
              title: existingDocument?.title ?? (kind === "invoice" ? "Счёт" : "Акт"),
              date,
              amount,
              sourceFile: {
                id: `source-${kind}-${entry.id}-${Date.now()}`,
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                uploadedAt,
              },
              extractedByAi: existingDocument?.extractedByAi ?? false,
              verifiedByUser: existingDocument?.verifiedByUser ?? false,
            },
          };
        }),
      }),
    );
  }

  return {
    project,
    actions: {
      addAdvance,
      deleteAdvance,
      completeContractMilestone,
      addLedgerEntry,
      deleteLedgerEntry,
      updateLedgerEntry,
      updateLedgerDocument,
      uploadLedgerDocument,
    },
  };
}
