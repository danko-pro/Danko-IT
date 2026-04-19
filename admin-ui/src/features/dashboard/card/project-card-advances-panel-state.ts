/**
 * Локальный state и handlers панели авансов.
 * Здесь живут форма добавления, валидация и delayed-remove сценарий для анимации удаления.
 */
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { ProjectCardAdvanceItem } from "../model/project-model";

const ADVANCE_REMOVE_DURATION_MS = 420;
const DEFAULT_ADVANCE_TITLE = "Аванс";

type ProjectCardAdvancesPanelStateOptions = {
  advances: ProjectCardAdvanceItem[];
  onAddAdvance: (payload: { title: string; amount: number; date: string }) => void;
  onDeleteAdvance: (advanceId: string) => void;
};

export function useProjectCardAdvancesPanelState(options: ProjectCardAdvancesPanelStateOptions) {
  const [isAdvanceFormOpen, setIsAdvanceFormOpen] = useState(false);
  const [advanceTitle, setAdvanceTitle] = useState(DEFAULT_ADVANCE_TITLE);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [removingAdvanceIds, setRemovingAdvanceIds] = useState<string[]>([]);
  const removeTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(removeTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  function resetAdvanceForm() {
    setAdvanceTitle(DEFAULT_ADVANCE_TITLE);
    setAdvanceAmount("");
    setAdvanceDate("");
    setAdvanceError(null);
    setIsAdvanceFormOpen(false);
  }

  function openAdvanceForm() {
    setIsAdvanceFormOpen(true);
  }

  function toggleAdvanceForm() {
    if (isAdvanceFormOpen) {
      resetAdvanceForm();
      return;
    }

    openAdvanceForm();
  }

  function handleAdvanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number(advanceAmount.replace(",", "."));
    if (!advanceDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAdvanceError("Укажите сумму аванса и дату поступления.");
      return;
    }

    options.onAddAdvance({
      title: advanceTitle.trim() || DEFAULT_ADVANCE_TITLE,
      amount: parsedAmount,
      date: advanceDate,
    });

    resetAdvanceForm();
  }

  function handleAdvanceRemove(advanceId: string) {
    setRemovingAdvanceIds((current) => {
      if (current.includes(advanceId)) {
        return current;
      }

      return [...current, advanceId];
    });

    removeTimeoutsRef.current[advanceId] = window.setTimeout(() => {
      options.onDeleteAdvance(advanceId);
      setRemovingAdvanceIds((current) => current.filter((id) => id !== advanceId));
      delete removeTimeoutsRef.current[advanceId];
    }, ADVANCE_REMOVE_DURATION_MS);
  }

  const visibleAdvanceCount = options.advances.reduce(
    (count, advance) => count + (removingAdvanceIds.includes(advance.id) ? 0 : 1),
    0,
  );

  return {
    advanceAmount,
    advanceDate,
    advanceError,
    advanceTitle,
    isAdvanceFormOpen,
    removingAdvanceIds,
    visibleAdvanceCount,
    handleAdvanceRemove,
    handleAdvanceSubmit,
    resetAdvanceForm,
    setAdvanceAmount,
    setAdvanceDate,
    setAdvanceTitle,
    toggleAdvanceForm,
  };
}
