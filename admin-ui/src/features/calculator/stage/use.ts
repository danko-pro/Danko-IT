import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

import { calculatorStageStorageKey, readStoredStage, writeSessionValue } from "../model/state";
import type { CalculatorStage } from "../model/types";

type UseCalculatorStageControllerResult = {
  activeStage: CalculatorStage;
  setActiveStage: Dispatch<SetStateAction<CalculatorStage>>;
};

// Контроллер активного stage калькулятора.
// Он синхронизирует текущий шаг с session storage и возвращает screen-слою только состояние навигации.

export function useCalculatorStageController(projectDetail: { project: { id: number } } | null): UseCalculatorStageControllerResult {
  const [activeStage, setActiveStage] = useState<CalculatorStage>(() => readStoredStage() ?? "rooms");

  useEffect(() => {
    writeSessionValue(calculatorStageStorageKey, activeStage);
  }, [activeStage]);

  useEffect(() => {
    if (!projectDetail) {
      setActiveStage("project");
    }
  }, [projectDetail]);

  return {
    activeStage,
    setActiveStage,
  };
}
