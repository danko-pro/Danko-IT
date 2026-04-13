import { getDoorMaterialSpecTitle, getDoorWorkSpecTitle } from "./calculator-shared";
import type {
  CalculatorDoorSpecItem,
  CalculatorDoorsSummary,
  CalculatorFlooringCovering,
  CalculatorFlooringDetail,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  CalculatorFlooringRoom,
  CalculatorProjectDetail,
  CalculatorProjectDoor,
  CalculatorStage,
  CalculatorWarmFloorDetail,
  CalculatorWallFinishCovering,
  CalculatorWallFinishDetail,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishRoom,
} from "./calculator";

export type FlooringTechRoomSelection = {
  room: CalculatorFlooringRoom;
  covering: CalculatorFlooringCovering;
  preparation: CalculatorFlooringPreparation | null;
  layout: CalculatorFlooringLayout | null;
};

export type WallFinishTechRoomSelection = {
  room: CalculatorWallFinishRoom;
  covering: CalculatorWallFinishCovering;
  preparation: CalculatorWallFinishPreparation | null;
  layout: CalculatorWallFinishLayout | null;
};

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

export function buildIdMap<T extends { id: number }>(items: T[] | null | undefined): Map<number, T> {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

export function buildRoomStateById<T extends { room_id: number }>(rooms: T[]): Map<number, T> {
  return new Map(rooms.map((room) => [room.room_id, room]));
}

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

export function buildFlooringSelectedTechRooms(
  isFlooringStage: boolean,
  flooringPreview: CalculatorFlooringDetail | null,
  flooringCoveringById: Map<number, CalculatorFlooringCovering>,
  flooringPreparationById: Map<number, CalculatorFlooringPreparation>,
  flooringLayoutById: Map<number, CalculatorFlooringLayout>,
): FlooringTechRoomSelection[] {
  if (!isFlooringStage || !flooringPreview) {
    return [];
  }
  return flooringPreview.rooms
    .filter((room) => room.selected && room.covering_id !== null)
    .map((room) => ({
      room,
      covering: room.covering_id === null ? null : flooringCoveringById.get(room.covering_id) ?? null,
      preparation: room.preparation_id === null ? null : flooringPreparationById.get(room.preparation_id) ?? null,
      layout: room.layout_id === null ? null : flooringLayoutById.get(room.layout_id) ?? null,
    }))
    .filter((item): item is FlooringTechRoomSelection => item.covering !== null);
}

export function buildWallFinishSelectedTechRooms(
  isWallFinishStage: boolean,
  wallFinishPreview: CalculatorWallFinishDetail | null,
  wallFinishCoveringById: Map<number, CalculatorWallFinishCovering>,
  wallFinishPreparationById: Map<number, CalculatorWallFinishPreparation>,
  wallFinishLayoutById: Map<number, CalculatorWallFinishLayout>,
): WallFinishTechRoomSelection[] {
  if (!isWallFinishStage || !wallFinishPreview) {
    return [];
  }
  return wallFinishPreview.rooms
    .filter((room) => room.selected && room.covering_id !== null)
    .map((room) => ({
      room,
      covering: room.covering_id === null ? null : wallFinishCoveringById.get(room.covering_id) ?? null,
      preparation: room.preparation_id === null ? null : wallFinishPreparationById.get(room.preparation_id) ?? null,
      layout: room.layout_id === null ? null : wallFinishLayoutById.get(room.layout_id) ?? null,
    }))
    .filter((item): item is WallFinishTechRoomSelection => item.covering !== null);
}

export function buildDoorsStageSummary(projectDetail: CalculatorProjectDetail | null): CalculatorDoorsSummary {
  const doors = projectDetail?.doors ?? [];
  const summary = projectDetail?.summary;
  const purchaseTotal = summary?.door_purchase_total ?? 0;
  const saleTotal = summary?.door_sale_total ?? 0;
  const installTotal = summary?.door_install_total ?? 0;
  return {
    total_items: doors.length,
    door_units: doors.filter((door) => door.opening_kind === "door").length,
    opening_units: doors.filter((door) => door.opening_kind === "opening").length,
    trim_only_units: doors.filter((door) => door.opening_kind === "trim_only").length,
    purchase_total: purchaseTotal,
    sale_total: saleTotal,
    install_total: installTotal,
    grand_total: saleTotal + installTotal,
    margin_total: saleTotal - purchaseTotal,
    components_purchase_total: summary?.door_components_purchase_total ?? 0,
    components_sale_total: summary?.door_components_sale_total ?? 0,
  };
}

export function buildDoorsStageSpecification(doors: CalculatorProjectDoor[] | null | undefined): CalculatorDoorSpecItem[] {
  if (!doors?.length) {
    return [];
  }
  const specMap = new Map<string, CalculatorDoorSpecItem>();
  const addSpec = (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => {
    if (quantity <= 0 || amount <= 0) {
      return;
    }
    const key = `${kind}:${title}:${unit}`;
    const current = specMap.get(key);
    if (current) {
      current.quantity += quantity;
      current.amount += amount;
      return;
    }
    specMap.set(key, { kind, title, unit, quantity, amount });
  };
  for (const door of doors) {
    addSpec("material", getDoorMaterialSpecTitle(door), "шт", 1, Math.max(0, door.effective_sale_price ?? 0));
    addSpec("work", getDoorWorkSpecTitle(door), "шт", 1, Math.max(0, door.effective_install_price ?? 0));
  }
  return Array.from(specMap.values());
}
