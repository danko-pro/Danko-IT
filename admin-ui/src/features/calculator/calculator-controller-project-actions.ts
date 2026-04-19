import type { Dispatch, SetStateAction } from "react";

import type { CalculatorProjectDetail } from "./calculator-types";
import type { CalculatorProjectCreatePayload } from "./calculator-screen-types";
import type { ScreenKey } from "../../shared/types";
import { fetchJson } from "../../shared/utils";

type CalculatorProjectActionsControllerOptions = {
  setScreen: Dispatch<SetStateAction<ScreenKey>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  setCalculatorBusyKey: Dispatch<SetStateAction<string | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
  setSelectedCalculatorProjectId: Dispatch<SetStateAction<number | null>>;
  setSelectedCalculatorRoomId: Dispatch<SetStateAction<number | null>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  loadCalculatorProjects: () => Promise<void>;
};

// Контур project-level мутаций калькулятора.
// Отвечает за создание проекта и быстрый сценарий входа в калькулятор без knowledge о room/finish/door операциях.

export function createAdminCalculatorProjectActionsController(props: CalculatorProjectActionsControllerOptions) {
  async function handleCreateCalculatorProject(payload: CalculatorProjectCreatePayload) {
    try {
      props.setCalculatorBusyKey("calculator-project-create");
      const created = await fetchJson<CalculatorProjectDetail>("/api/calculator/projects", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          note: payload.note || null,
        }),
      });
      await props.loadCalculatorProjects();
      props.setSelectedCalculatorProjectId(created.project.id);
      props.setCalculatorProjectDetail(created);
      props.setSelectedCalculatorRoomId(created.rooms[0]?.id ?? null);
      props.setSuccessMessage(`Проект калькулятора "${created.project.name}" создан.`);
      props.setCalculatorError(null);
    } catch (actionError) {
      props.setCalculatorError(actionError instanceof Error ? actionError.message : "Не удалось создать проект калькулятора");
    } finally {
      props.setCalculatorBusyKey(null);
    }
  }

  async function handleQuickCreateCalculatorProject() {
    const name = window.prompt("Название нового объекта / проекта:");
    if (!name || !name.trim()) {
      return;
    }
    props.setScreen("calculator");
    await handleCreateCalculatorProject({
      name: name.trim(),
      note: "",
    });
  }

  return {
    handleCreateCalculatorProject,
    handleQuickCreateCalculatorProject,
  };
}
