import type { CalculatorProject, CalculatorSummary } from "./calculator-core-types";
import type {
  CalculatorDoorCatalogItem,
  CalculatorDoorComponentCatalogItem,
  CalculatorProjectDoor,
} from "./calculator-door-types";
import type { CalculatorFlooringDetail } from "./calculator-flooring-types";
import type { CalculatorRoomSummary } from "./calculator-room-types";
import type { CalculatorWallFinishDetail } from "./calculator-wall-finish-types";
import type { CalculatorWarmFloorDetail } from "./calculator-warm-floor-types";

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
