import type {
  CalculatorFlooringDetail,
  CalculatorProjectDetail,
  CalculatorStage,
  CalculatorWarmFloorDetail,
} from "./calculator-types";

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
  warmFloorPreview: CalculatorWarmFloorDetail | null,
  flooringPreview: CalculatorFlooringDetail | null,
): CalculatorHeaderTotals {
  return {
    warmFloorWorkTotal: warmFloorPreview?.summary.work_total ?? projectDetail?.warm_floor.summary.work_total ?? 0,
    warmFloorMaterialTotal: warmFloorPreview?.summary.material_total ?? projectDetail?.warm_floor.summary.material_total ?? 0,
    flooringWorkTotal: flooringPreview?.summary.work_total ?? projectDetail?.flooring.summary.work_total ?? 0,
    flooringMaterialTotal: flooringPreview?.summary.material_total ?? projectDetail?.flooring.summary.material_total ?? 0,
  };
}
