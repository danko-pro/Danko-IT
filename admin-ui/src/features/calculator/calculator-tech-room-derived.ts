import type {
  CalculatorFlooringCovering,
  CalculatorFlooringDetail,
  CalculatorFlooringLayout,
  CalculatorFlooringPreparation,
  CalculatorFlooringRoom,
  CalculatorWallFinishCovering,
  CalculatorWallFinishDetail,
  CalculatorWallFinishLayout,
  CalculatorWallFinishPreparation,
  CalculatorWallFinishRoom,
} from "./calculator-types";

// Derived helpers для технических room-подборок на stage flooring и wall finish.
// Здесь строятся списки выбранных комнат с уже разрешёнными связями на covering/preparation/layout.

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
