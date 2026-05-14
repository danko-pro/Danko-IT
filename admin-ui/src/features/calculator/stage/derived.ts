import type {
  CalculatorFlooringDetail,
  CalculatorProjectDetail,
  CalculatorStage,
  CalculatorWallFinishDetail,
  CalculatorWarmFloorDetail,
} from "../model/types";

// Производные данные верхнего уровня экрана калькулятора.
// Здесь считаются stage flags и итоговые суммы для шапки без деталей конкретных stage-контроллеров.

export type CalculatorStageFlags = {
  isProjectStage: boolean;
  isRoomsStage: boolean;
  isWarmFloorStage: boolean;
  isFlooringStage: boolean;
  isWallFinishStage: boolean;
  isCeilingsStage: boolean;
  isDoorsStage: boolean;
};

export type CalculatorHeaderTotals = {
  warmFloorWorkTotal: number;
  warmFloorMaterialTotal: number;
  flooringWorkTotal: number;
  flooringMaterialTotal: number;
  wallFinishWorkTotal: number;
  wallFinishMaterialTotal: number;
  ceilingWorkTotal: number;
  ceilingMaterialTotal: number;
  ceilingEquipmentTotal: number;
  ceilingConsumablesTotal: number;
};

export function buildCalculatorStageFlags(activeStage: CalculatorStage): CalculatorStageFlags {
  return {
    isProjectStage: activeStage === "project",
    isRoomsStage: activeStage === "rooms",
    isWarmFloorStage: activeStage === "warmfloor",
    isFlooringStage: activeStage === "flooring",
    isWallFinishStage: activeStage === "wallfinish",
    isCeilingsStage: activeStage === "ceilings",
    isDoorsStage: activeStage === "doors",
  };
}

export function buildCalculatorHeaderTotals(
  projectDetail: CalculatorProjectDetail | null,
  warmFloorPreview: CalculatorWarmFloorDetail | null,
  flooringPreview: CalculatorFlooringDetail | null,
  wallFinishPreview: CalculatorWallFinishDetail | null,
): CalculatorHeaderTotals {
  return {
    warmFloorWorkTotal: warmFloorPreview?.summary.work_total ?? projectDetail?.warm_floor.summary.work_total ?? 0,
    warmFloorMaterialTotal:
      warmFloorPreview?.summary.material_total ?? projectDetail?.warm_floor.summary.material_total ?? 0,
    flooringWorkTotal: flooringPreview?.summary.work_total ?? projectDetail?.flooring.summary.work_total ?? 0,
    flooringMaterialTotal: flooringPreview?.summary.material_total ?? projectDetail?.flooring.summary.material_total ?? 0,
    wallFinishWorkTotal: wallFinishPreview?.summary.work_total ?? projectDetail?.wall_finishes.summary.work_total ?? 0,
    wallFinishMaterialTotal:
      wallFinishPreview?.summary.material_total ?? projectDetail?.wall_finishes.summary.material_total ?? 0,
    ceilingWorkTotal: projectDetail?.ceilings.summary.work_total ?? 0,
    ceilingMaterialTotal: projectDetail?.ceilings.summary.material_total ?? 0,
    ceilingEquipmentTotal: projectDetail?.ceilings.summary.equipment_total ?? 0,
    ceilingConsumablesTotal: projectDetail?.ceilings.summary.consumables_total ?? 0,
  };
}
