import { useCallback, useState } from "react";

import type { CoveringAssemblyRow, FlooringAssemblyTarget } from "./flooring-assembly";
import {
  assemblyEditResetKey,
  FLOORING_ASSEMBLY_LOAD_FAILED_WARNING,
  loadAssemblyForEditorEdit,
} from "./flooring-catalog-assembly-load";

export function useFlooringAssemblyEditLoad() {
  const [assemblyResetKey, setAssemblyResetKey] = useState<string | undefined>(undefined);
  const [assemblyInitialRows, setAssemblyInitialRows] = useState<CoveringAssemblyRow[]>([]);
  const [assemblyInitialTitle, setAssemblyInitialTitle] = useState("");
  const [assemblyLoading, setAssemblyLoading] = useState(false);

  const clearAssemblyEditLoad = useCallback(() => {
    setAssemblyResetKey(undefined);
    setAssemblyInitialRows([]);
    setAssemblyInitialTitle("");
    setAssemblyLoading(false);
  }, []);

  const loadAssemblyForEdit = useCallback(
    async (
      target: FlooringAssemblyTarget,
      targetId: number,
      setAssemblyTarget: (target: FlooringAssemblyTarget) => void,
      setWarningMessage: (message: string | null) => void,
    ) => {
      setAssemblyTarget(target);
      setAssemblyResetKey(assemblyEditResetKey(target, targetId));
      setAssemblyLoading(true);
      setAssemblyInitialRows([]);
      setAssemblyInitialTitle("");

      const result = await loadAssemblyForEditorEdit(target, targetId);
      setAssemblyInitialRows(result.rows);
      setAssemblyInitialTitle(result.title);
      setAssemblyLoading(false);

      if (result.status === "failed") {
        setWarningMessage(FLOORING_ASSEMBLY_LOAD_FAILED_WARNING);
      }
    },
    [],
  );

  return {
    assemblyResetKey,
    assemblyInitialRows,
    assemblyInitialTitle,
    assemblyLoading,
    clearAssemblyEditLoad,
    loadAssemblyForEdit,
  };
}
