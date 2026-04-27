import type { CalculatorProject, CalculatorSummary } from "../model/core";
import type {
  CalculatorDoorCatalogItem,
  CalculatorDoorComponentCatalogItem,
  CalculatorProjectDoor,
} from "../doors/model";
import type { CalculatorFlooringDetail } from "../flooring/model";
import type { CalculatorRoomSummary } from "../room/model";
import type { CalculatorWallFinishDetail } from "../wall-finish/model";
import type { CalculatorWarmFloorDetail } from "../warm-floor/model";

// Тип верхнего project detail, который собирает все stage-срезы калькулятора.

export type CalculatorProjectDetail = {
  project: CalculatorProject;
  summary: CalculatorSummary;
  rooms: CalculatorRoomSummary[];
  warm_floor: CalculatorWarmFloorDetail;
  flooring: CalculatorFlooringDetail;
  wall_finishes: CalculatorWallFinishDetail;
  doors: CalculatorProjectDoor[];
  door_catalog: CalculatorDoorCatalogItem[];
  door_component_catalog: CalculatorDoorComponentCatalogItem[];
};
