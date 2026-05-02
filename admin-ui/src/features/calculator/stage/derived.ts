import type {
  CalculatorFlooringDetail,
  CalculatorProjectDetail,
  CalculatorStage,
  CalculatorWarmFloorDetail,
} from "../model/types";

// Derived helpers верхнего уровня экрана калькулятора.
// Здесь считаются stage flags и итоговые суммы для шапки без деталей конкретных stage-контроллеров.

export type CalculatorStageFlags = {
  isProjectStage: boolean;
  isRoomsStage: boolean;
  isWarmFloorStage: boolean;
  isFlooringStage: boolean;
  isWallFinishStage: boolean;
  isDoorsStage: boolean;
};

export type CalculatorHeaderTotals = {
  warmFloorWorkTotal: number;
  warmFloorMaterialTotal: number;
  flooringWorkTotal: number;
  flooringMaterialTotal: number;
};

export function buildCalculatorStageFlags(activeStage: CalculatorStage): CalculatorStageFlags {
  return {
    isProjectStage: activeStage === "project",
    isRoomsStage: activeStage === "rooms",
    isWarmFloorStage: activeStage === "warmfloor",
    isFlooringStage: activeStage === "flooring",
    isWallFinishStage: activeStage === "wallfinish",
    isDoorsStage: activeStage === "doors",
  };
}

export function buildCalculatorHeaderTotals(
  projectDetail: CalculatorProjectDetail | null,
  _warmFloorPreview: CalculatorWarmFloorDetail | null,
  _flooringPreview: CalculatorFlooringDetail | null,
): CalculatorHeaderTotals {
  return {
    warmFloorWorkTotal: projectDetail?.warm_floor.summary.work_total ?? 0,
    warmFloorMaterialTotal: projectDetail?.warm_floor.summary.material_total ?? 0,
    flooringWorkTotal: projectDetail?.flooring.summary.work_total ?? 0,
    flooringMaterialTotal: projectDetail?.flooring.summary.material_total ?? 0,
  };
}
