import { buildFlooringPreview, buildFlooringState, type CalculatorFlooringDetail } from "../flooring";
import { type CalculatorProjectDetail, type CalculatorSummary } from "../model/types";
import type { CalculatorRoomSummary } from "../room/model";
import { buildWallFinishPreview, buildWallFinishState, type CalculatorWallFinishDetail } from "../wall-finish";
import { buildWarmFloorPreview, buildWarmFloorState, type CalculatorWarmFloorDetail } from "../warm-floor";

type RoomBackedDetail = {
  rooms: Array<{ room_id: number }>;
};

type RoomBackedDraft = {
  rooms: Array<{ room_id: number }>;
};

function isDraftReadyForDetail(detail: RoomBackedDetail | null, draftState: RoomBackedDraft | undefined): boolean {
  if (!detail || !draftState) {
    return false;
  }
  if (detail.rooms.length === 0) {
    return true;
  }
  const draftRoomIds = new Set(draftState.rooms.map((room) => room.room_id));
  return detail.rooms.every((room) => draftRoomIds.has(room.room_id));
}

function sumRoomMetric(
  rooms: CalculatorRoomSummary[],
  key: "floor_area_m2" | "wall_area_gross_m2" | "openings_area_m2" | "door_area_m2" | "wall_area_net_m2" | "perimeter_m",
): number {
  return rooms.reduce((total, room) => total + room[key], 0);
}

function buildProjectSummaryPreview(
  summary: CalculatorSummary,
  rooms: CalculatorRoomSummary[],
): CalculatorSummary {
  return {
    ...summary,
    rooms_count: rooms.length,
    floor_area_m2: sumRoomMetric(rooms, "floor_area_m2"),
    wall_area_gross_m2: sumRoomMetric(rooms, "wall_area_gross_m2"),
    openings_area_m2: sumRoomMetric(rooms, "openings_area_m2"),
    door_area_m2: sumRoomMetric(rooms, "door_area_m2"),
    wall_area_net_m2: sumRoomMetric(rooms, "wall_area_net_m2"),
    perimeter_m: sumRoomMetric(rooms, "perimeter_m"),
  };
}

export function buildCalculatorProjectDetailPreview(
  projectDetail: CalculatorProjectDetail | null,
  roomPreviewSummary: CalculatorRoomSummary | null,
): CalculatorProjectDetail | null {
  if (!projectDetail || !roomPreviewSummary) {
    return projectDetail;
  }

  const hasTargetRoom = projectDetail.rooms.some((room) => room.id === roomPreviewSummary.id);
  if (!hasTargetRoom) {
    return projectDetail;
  }

  const rooms = projectDetail.rooms.map((room) => (room.id === roomPreviewSummary.id ? roomPreviewSummary : room));
  return {
    ...projectDetail,
    rooms,
    summary: buildProjectSummaryPreview(projectDetail.summary, rooms),
  };
}

function patchWarmFloorBaseDetail(
  detail: CalculatorWarmFloorDetail | null,
  roomPreviewSummary: CalculatorRoomSummary | null,
): CalculatorWarmFloorDetail | null {
  if (!detail || !roomPreviewSummary) {
    return detail;
  }

  return {
    ...detail,
    rooms: detail.rooms.map((room) =>
      room.room_id === roomPreviewSummary.id
        ? {
            ...room,
            room_name: roomPreviewSummary.name,
            base_floor_area_m2: roomPreviewSummary.floor_area_m2,
            effective_area_m2: room.area_m2_override === null ? roomPreviewSummary.floor_area_m2 : room.effective_area_m2,
          }
        : room,
    ),
  };
}

function patchFlooringBaseDetail(
  detail: CalculatorFlooringDetail | null,
  roomPreviewSummary: CalculatorRoomSummary | null,
): CalculatorFlooringDetail | null {
  if (!detail || !roomPreviewSummary) {
    return detail;
  }

  return {
    ...detail,
    rooms: detail.rooms.map((room) =>
      room.room_id === roomPreviewSummary.id
        ? {
            ...room,
            room_name: roomPreviewSummary.name,
            base_area_m2: roomPreviewSummary.floor_area_m2,
            effective_area_m2: room.area_m2_override === null ? roomPreviewSummary.floor_area_m2 : room.effective_area_m2,
            base_perimeter_m: roomPreviewSummary.perimeter_m,
            effective_perimeter_m: room.perimeter_m_override === null ? roomPreviewSummary.perimeter_m : room.effective_perimeter_m,
            plinth_m:
              room.plinth_m_override === null && room.perimeter_m_override === null
                ? roomPreviewSummary.perimeter_m
                : room.plinth_m,
          }
        : room,
    ),
  };
}

function patchWallFinishBaseDetail(
  detail: CalculatorWallFinishDetail | null,
  roomPreviewSummary: CalculatorRoomSummary | null,
): CalculatorWallFinishDetail | null {
  if (!detail || !roomPreviewSummary) {
    return detail;
  }

  return {
    ...detail,
    rooms: detail.rooms.map((room) =>
      room.room_id === roomPreviewSummary.id
        ? {
            ...room,
            room_name: roomPreviewSummary.name,
            base_area_m2: roomPreviewSummary.wall_area_net_m2,
            effective_area_m2: room.area_m2_override === null ? roomPreviewSummary.wall_area_net_m2 : room.effective_area_m2,
          }
        : room,
    ),
  };
}

export function buildCalculatorDetailViews(
  projectDetail: CalculatorProjectDetail | null,
  roomPreviewSummary: CalculatorRoomSummary | null,
): {
  projectDetailView: CalculatorProjectDetail | null;
  warmFloorDetailView: CalculatorWarmFloorDetail | null;
  flooringDetailView: CalculatorFlooringDetail | null;
  wallFinishDetailView: CalculatorWallFinishDetail | null;
} {
  const projectDetailView = buildCalculatorProjectDetailPreview(projectDetail, roomPreviewSummary);
  const warmFloorDetailView = patchWarmFloorBaseDetail(projectDetailView?.warm_floor ?? null, roomPreviewSummary);
  const flooringDetailView = patchFlooringBaseDetail(projectDetailView?.flooring ?? null, roomPreviewSummary);
  const wallFinishDetailView = patchWallFinishBaseDetail(projectDetailView?.wall_finishes ?? null, roomPreviewSummary);

  if (!projectDetailView) {
    return {
      projectDetailView,
      warmFloorDetailView,
      flooringDetailView,
      wallFinishDetailView,
    };
  }

  return {
    projectDetailView: {
      ...projectDetailView,
      warm_floor: warmFloorDetailView ?? projectDetailView.warm_floor,
      flooring: flooringDetailView ?? projectDetailView.flooring,
      wall_finishes: wallFinishDetailView ?? projectDetailView.wall_finishes,
    },
    warmFloorDetailView,
    flooringDetailView,
    wallFinishDetailView,
  };
}

export function buildWarmFloorDisplayPreview(
  detail: CalculatorWarmFloorDetail | null,
  mode: "base" | "draft",
  draftState?: Parameters<typeof buildWarmFloorPreview>[1],
): CalculatorWarmFloorDetail | null {
  if (!detail) {
    return null;
  }
  return mode === "draft" && draftState
    ? buildWarmFloorPreview(detail, draftState)
    : buildWarmFloorPreview(detail, buildWarmFloorState(detail));
}

export function buildWarmFloorHeaderPreview(
  detail: CalculatorWarmFloorDetail | null,
  draftState?: Parameters<typeof buildWarmFloorPreview>[1],
): CalculatorWarmFloorDetail | null {
  return buildWarmFloorDisplayPreview(detail, isDraftReadyForDetail(detail, draftState) ? "draft" : "base", draftState);
}

export function buildFlooringDisplayPreview(
  detail: CalculatorFlooringDetail | null,
  mode: "base" | "draft",
  draftState?: Parameters<typeof buildFlooringPreview>[1],
): CalculatorFlooringDetail | null {
  if (!detail) {
    return null;
  }
  return mode === "draft" && draftState
    ? buildFlooringPreview(detail, draftState)
    : buildFlooringPreview(detail, buildFlooringState(detail));
}

export function buildFlooringHeaderPreview(
  detail: CalculatorFlooringDetail | null,
  draftState?: Parameters<typeof buildFlooringPreview>[1],
): CalculatorFlooringDetail | null {
  return buildFlooringDisplayPreview(detail, isDraftReadyForDetail(detail, draftState) ? "draft" : "base", draftState);
}

export function buildWallFinishDisplayPreview(
  detail: CalculatorWallFinishDetail | null,
  mode: "base" | "draft",
  draftState?: Parameters<typeof buildWallFinishPreview>[1],
): CalculatorWallFinishDetail | null {
  if (!detail) {
    return null;
  }
  return mode === "draft" && draftState
    ? buildWallFinishPreview(detail, draftState)
    : buildWallFinishPreview(detail, buildWallFinishState(detail));
}

export function buildWallFinishHeaderPreview(
  detail: CalculatorWallFinishDetail | null,
  draftState?: Parameters<typeof buildWallFinishPreview>[1],
): CalculatorWallFinishDetail | null {
  return buildWallFinishDisplayPreview(detail, isDraftReadyForDetail(detail, draftState) ? "draft" : "base", draftState);
}
