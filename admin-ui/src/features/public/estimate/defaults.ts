import type { DoorPackageType } from "../public-estimate-doors";
import type { EstimateRoomType } from "../public-estimate-geometry";
import {
  FALLBACK_FLOORING_COVERING_OPTIONS,
  FALLBACK_FLOORING_LAYOUT_OPTIONS,
  FALLBACK_FLOORING_PLINTH_OPTIONS,
  FALLBACK_FLOORING_PREPARATION_OPTIONS,
  getDefaultFlooringCovering,
  getDefaultFlooringLayout,
  getDefaultFlooringPreparation,
} from "./flooring-snapshot-options";
import type { WallsCoveringType, WallsPreparationType } from "../public-estimate-walls";

export const roomTypeOptions: Array<{ value: EstimateRoomType; label: string }> = [
  { value: "living_room", label: "Комната" },
  { value: "kitchen", label: "Кухня" },
  { value: "bathroom", label: "Санузел" },
  { value: "hallway", label: "Прихожая" },
  { value: "balcony", label: "Балкон" },
  { value: "other", label: "Другое" },
];

export const GEOMETRY_STEP_HINT =
  "Площадь, двери и окна по БТИ — периметр и стены пересчитаются автоматически.";

export const GEOMETRY_ROW_REMOVE_MS = 280;

export const validEstimateRoomTypes = new Set<EstimateRoomType>(roomTypeOptions.map((option) => option.value));

export const NEW_ROOM_DEFAULT_NAME = "Новое помещение";

export const flooringCoveringOptions = FALLBACK_FLOORING_COVERING_OPTIONS;
export const flooringPreparationOptions = FALLBACK_FLOORING_PREPARATION_OPTIONS;
export const flooringLayoutOptions = FALLBACK_FLOORING_LAYOUT_OPTIONS;
export const flooringPlinthOptions = FALLBACK_FLOORING_PLINTH_OPTIONS;

export { getDefaultFlooringCovering, getDefaultFlooringLayout, getDefaultFlooringPreparation };

export const wallsCoveringOptions: Array<{ value: WallsCoveringType; label: string }> = [
  { value: "wallpaper", label: "Обои" },
  { value: "tile", label: "Плитка" },
  { value: "paint", label: "Окраска" },
  { value: "paintable_wallpaper", label: "Обои под покраску" },
];

export const wallsPreparationOptions: Array<{ value: WallsPreparationType; label: string }> = [
  { value: "none", label: "Без подготовки" },
  { value: "primer", label: "Грунтование" },
  { value: "putty_wallpaper", label: "Шпаклевка под обои" },
  { value: "putty_paint", label: "Шпаклевка под покраску" },
  { value: "waterproofing", label: "Гидроизоляция" },
];

export const doorPackageOptions: Array<{ value: DoorPackageType; label: string }> = [
  { value: "invisible_19000", label: "INVISIBLE 3 / 19 000" },
  { value: "invisible_20350", label: "INVISIBLE 3 / 20 350" },
];

export type EstimateInitialRoom = {
  id: string;
  name: string;
  type: EstimateRoomType;
  area: string;
  doorCount: string;
  windowCount: string;
};

export const initialRooms: EstimateInitialRoom[] = [
  { id: "hallway", name: "Прихожая", type: "hallway", area: "6.5", doorCount: "1", windowCount: "0" },
  { id: "kitchen", name: "Кухня", type: "kitchen", area: "12", doorCount: "1", windowCount: "1" },
  { id: "living-room", name: "Комната", type: "living_room", area: "18", doorCount: "1", windowCount: "1" },
  { id: "bathroom", name: "Санузел", type: "bathroom", area: "4.3", doorCount: "1", windowCount: "0" },
  { id: "balcony", name: "Балкон", type: "balcony", area: "2.2", doorCount: "1", windowCount: "1" },
];

export function getDefaultWallsCovering(roomType: EstimateRoomType): WallsCoveringType {
  return roomType === "bathroom" ? "tile" : "wallpaper";
}

export function getDefaultWallsPreparation(roomType: EstimateRoomType): WallsPreparationType {
  return roomType === "bathroom" ? "waterproofing" : "primer";
}

export function getDefaultCeilingLightSettings(roomType: EstimateRoomType) {
  if (roomType === "hallway") {
    return { squareMetersPerPoint: 2.5, minPoints: 2, hasPointLights: true };
  }

  if (roomType === "kitchen") {
    return { squareMetersPerPoint: 2.5, minPoints: 3, hasPointLights: true };
  }

  if (roomType === "living_room") {
    return { squareMetersPerPoint: 3, minPoints: 4, hasPointLights: true };
  }

  if (roomType === "bathroom") {
    return { squareMetersPerPoint: 1.5, minPoints: 4, hasPointLights: true };
  }

  if (roomType === "balcony") {
    return { squareMetersPerPoint: 4, minPoints: 1, hasPointLights: false };
  }

  return { squareMetersPerPoint: 3, minPoints: 2, hasPointLights: true };
}
