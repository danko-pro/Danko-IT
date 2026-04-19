import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useState } from "react";

type UseCalculatorProjectControllerParams = {
  onCreateProject: (payload: { name: string; note: string }) => Promise<void>;
};

type UseCalculatorProjectControllerResult = {
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  projectNote: string;
  setProjectNote: Dispatch<SetStateAction<string>>;
  handleProjectSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

// Контроллер создания проекта калькулятора.
// Здесь хранится только локальная форма проекта и submit-обработчик без деталей остальных screen-срезов.

export function useCalculatorProjectController(
  params: UseCalculatorProjectControllerParams,
): UseCalculatorProjectControllerResult {
  const { onCreateProject } = params;
  const [projectName, setProjectName] = useState("");
  const [projectNote, setProjectNote] = useState("");

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      return;
    }
    await onCreateProject({ name, note: projectNote });
    setProjectName("");
    setProjectNote("");
  }

  return {
    projectName,
    setProjectName,
    projectNote,
    setProjectNote,
    handleProjectSubmit,
  };
}
