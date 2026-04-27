import type { Dispatch, SetStateAction } from "react";

import type { CalculatorProject, CalculatorProjectDetail, CalculatorRoomDetail } from "../model/types";
import { fetchJson } from "../../../shared/utils";

type CalculatorLoadersControllerOptions = {
  setCalculatorLoading: Dispatch<SetStateAction<boolean>>;
  setCalculatorProjectLoading: Dispatch<SetStateAction<boolean>>;
  setCalculatorRoomLoading: Dispatch<SetStateAction<boolean>>;
  setCalculatorProjects: Dispatch<SetStateAction<CalculatorProject[]>>;
  setCalculatorProjectDetail: Dispatch<SetStateAction<CalculatorProjectDetail | null>>;
  setCalculatorRoomDetail: Dispatch<SetStateAction<CalculatorRoomDetail | null>>;
  setCalculatorError: Dispatch<SetStateAction<string | null>>;
};

// Контур загрузки данных калькулятора.
// Здесь инкапсулированы все read-side запросы и их загрузочные флаги, чтобы root-контроллер не смешивал их с CRUD-операциями.

export function createAdminCalculatorLoadersController(props: CalculatorLoadersControllerOptions) {
  async function loadCalculatorProjects() {
    try {
      props.setCalculatorLoading(true);
      const data = await fetchJson<CalculatorProject[]>("/api/calculator/projects");
      props.setCalculatorProjects(data);
      props.setCalculatorError(null);
    } catch (loadError) {
      props.setCalculatorError(loadError instanceof Error ? loadError.message : "Не удалось загрузить проекты калькулятора");
    } finally {
      props.setCalculatorLoading(false);
    }
  }

  async function loadCalculatorProjectDetail(projectId: number) {
    try {
      props.setCalculatorProjectLoading(true);
      const data = await fetchJson<CalculatorProjectDetail>(`/api/calculator/projects/${projectId}`);
      props.setCalculatorProjectDetail(data);
      props.setCalculatorError(null);
    } catch (loadError) {
      props.setCalculatorProjectDetail(null);
      props.setCalculatorError(loadError instanceof Error ? loadError.message : "Не удалось загрузить проект калькулятора");
    } finally {
      props.setCalculatorProjectLoading(false);
    }
  }

  async function loadCalculatorRoomDetail(roomId: number) {
    try {
      props.setCalculatorRoomLoading(true);
      const data = await fetchJson<CalculatorRoomDetail>(`/api/calculator/rooms/${roomId}`);
      props.setCalculatorRoomDetail(data);
      props.setCalculatorError(null);
    } catch (loadError) {
      props.setCalculatorRoomDetail(null);
      props.setCalculatorError(loadError instanceof Error ? loadError.message : "Не удалось загрузить комнату");
    } finally {
      props.setCalculatorRoomLoading(false);
    }
  }

  return {
    loadCalculatorProjects,
    loadCalculatorProjectDetail,
    loadCalculatorRoomDetail,
  };
}
