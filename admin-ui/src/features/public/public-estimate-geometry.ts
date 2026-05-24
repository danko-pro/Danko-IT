export type EstimateRoomType = "living_room" | "kitchen" | "bathroom" | "hallway" | "balcony" | "other";

export type EstimateRoomInput = {
  id: string;
  name: string;
  type: EstimateRoomType;
  area: number;
  doorCount: number;
  windowCount: number;
};

export type EstimateRoomGeometry = EstimateRoomInput & {
  shapeFactor: number;
  perimeter: number;
  wallArea: number;
  openingArea: number;
  finishWallArea: number;
  ceilingArea: number;
  plinthLength: number;
};

export type EstimateGeometryTotals = {
  floorArea: number;
  perimeter: number;
  wallArea: number;
  openingArea: number;
  finishWallArea: number;
  ceilingArea: number;
  plinthLength: number;
};

export const estimateRoomShapeFactors: Record<EstimateRoomType, number> = {
  living_room: 1.05,
  kitchen: 1.1,
  bathroom: 1.1,
  hallway: 1.25,
  balcony: 1.2,
  other: 1.1,
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function parseEstimateDecimal(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function calculateEstimateRoomGeometry(
  room: EstimateRoomInput,
  ceilingHeight: number,
): EstimateRoomGeometry {
  const area = safeNumber(room.area);
  const safeCeilingHeight = safeNumber(ceilingHeight);
  const doorCount = Math.round(safeNumber(room.doorCount));
  const windowCount = Math.round(safeNumber(room.windowCount));
  const shapeFactor = estimateRoomShapeFactors[room.type];
  const perimeter = 4 * Math.sqrt(area) * shapeFactor;
  const wallArea = perimeter * safeCeilingHeight;
  const openingArea = doorCount * 1.6 + windowCount * 1.8;
  const finishWallArea = Math.max(0, wallArea - openingArea);
  const ceilingArea = area;
  const plinthLength = Math.max(0, perimeter - doorCount * 0.9);

  return {
    ...room,
    area,
    doorCount,
    windowCount,
    shapeFactor,
    perimeter,
    wallArea,
    openingArea,
    finishWallArea,
    ceilingArea,
    plinthLength,
  };
}

export function calculateEstimateGeometryTotals(rooms: EstimateRoomGeometry[]): EstimateGeometryTotals {
  return rooms.reduce<EstimateGeometryTotals>(
    (totals, room) => ({
      floorArea: totals.floorArea + room.area,
      perimeter: totals.perimeter + room.perimeter,
      wallArea: totals.wallArea + room.wallArea,
      openingArea: totals.openingArea + room.openingArea,
      finishWallArea: totals.finishWallArea + room.finishWallArea,
      ceilingArea: totals.ceilingArea + room.ceilingArea,
      plinthLength: totals.plinthLength + room.plinthLength,
    }),
    {
      floorArea: 0,
      perimeter: 0,
      wallArea: 0,
      openingArea: 0,
      finishWallArea: 0,
      ceilingArea: 0,
      plinthLength: 0,
    },
  );
}
