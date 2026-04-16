import { useEffect, useState } from "react";
import type { ProjectCardLedgerEntry } from "../../model/project-model";
import { CATEGORY_OPTIONS } from "../project-accounting-ledger-config";
import {
  EXPENSE_ITEM_OPTIONS,
  counterpartyFromEntry,
  mergeUniqueCounterparties,
  mergeUniqueLabels,
} from "./project-accounting-ledger-builder-utils";

type UseProjectAccountingLedgerBuilderStateParams = {
  entries: ProjectCardLedgerEntry[];
  onDeleteEntry: (entryId: string) => void;
};

export function useProjectAccountingLedgerBuilderState(
  params: UseProjectAccountingLedgerBuilderStateParams,
) {
  const [categoryOptions, setCategoryOptions] = useState(() =>
    mergeUniqueLabels([...CATEGORY_OPTIONS, ...params.entries.map((entry) => entry.category)]),
  );
  const [expenseItemOptions, setExpenseItemOptions] = useState(() =>
    mergeUniqueLabels([...EXPENSE_ITEM_OPTIONS, ...params.entries.map((entry) => entry.item)]),
  );
  const [counterpartyOptions, setCounterpartyOptions] = useState(() =>
    mergeUniqueCounterparties(params.entries.map((entry) => counterpartyFromEntry(entry))),
  );
  const [confirmingDeleteEntryId, setConfirmingDeleteEntryId] = useState<string | null>(null);

  useEffect(() => {
    setCategoryOptions((current) =>
      mergeUniqueLabels([...current, ...params.entries.map((entry) => entry.category)]),
    );
  }, [params.entries]);

  useEffect(() => {
    setExpenseItemOptions((current) =>
      mergeUniqueLabels([...current, ...params.entries.map((entry) => entry.item)]),
    );
  }, [params.entries]);

  useEffect(() => {
    setCounterpartyOptions((current) =>
      mergeUniqueCounterparties([
        ...current,
        ...params.entries.map((entry) => counterpartyFromEntry(entry)),
      ]),
    );
  }, [params.entries]);

  useEffect(() => {
    if (!confirmingDeleteEntryId) {
      return;
    }

    const stillExists = params.entries.some((entry) => entry.id === confirmingDeleteEntryId);
    if (!stillExists) {
      setConfirmingDeleteEntryId(null);
    }
  }, [confirmingDeleteEntryId, params.entries]);

  const handleCreateCategoryOption = (value: string) => {
    setCategoryOptions((current) => mergeUniqueLabels([...current, value]));
  };

  const handleCreateExpenseItemOption = (value: string) => {
    setExpenseItemOptions((current) => mergeUniqueLabels([...current, value]));
  };

  const requestDeleteEntry = (entryId: string) => {
    setConfirmingDeleteEntryId(entryId);
  };

  const cancelDeleteEntry = (entryId: string) => {
    setConfirmingDeleteEntryId((current) => (current === entryId ? null : current));
  };

  const confirmDeleteEntry = (entryId: string) => {
    params.onDeleteEntry(entryId);
    setConfirmingDeleteEntryId((current) => (current === entryId ? null : current));
  };

  return {
    categoryOptions,
    expenseItemOptions,
    counterpartyOptions,
    confirmingDeleteEntryId,
    handleCreateCategoryOption,
    handleCreateExpenseItemOption,
    requestDeleteEntry,
    cancelDeleteEntry,
    confirmDeleteEntry,
  };
}
