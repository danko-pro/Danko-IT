import { useCallback, useMemo, useState } from "react";
import { type EstimateRoomGeometry } from "../public-estimate-geometry";
import {
  calculateWalls,
  type WallsCoveringType,
  type WallsPreparationType,
} from "../public-estimate-walls";
import { getDefaultWallsCovering, getDefaultWallsPreparation } from "./defaults";
import type { EstimateRoomDraft, WallsRoomDraft } from "./context";
import { buildWallsSummaryItems } from "./summary";

type UseWallsEstimateParams = {
  rooms: EstimateRoomDraft[];
  roomGeometries: EstimateRoomGeometry[];
};

export function useWallsEstimate({ rooms, roomGeometries }: UseWallsEstimateParams) {
  const [wallsRooms, setWallsRooms] = useState<Record<string, WallsRoomDraft>>({});

  const wallsRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const wallsDraft = wallsRooms[room.id] ?? {};

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          finishWallArea: roomGeometries[index]?.finishWallArea ?? 0,
          coveringType: wallsDraft.coveringType ?? getDefaultWallsCovering(room.type),
          preparationType: wallsDraft.preparationType ?? getDefaultWallsPreparation(room.type),
          isIncluded: wallsDraft.isIncluded ?? true,
        };
      }),
    [roomGeometries, rooms, wallsRooms],
  );

  const wallsResult = useMemo(() => calculateWalls(wallsRoomInputs), [wallsRoomInputs]);

  const wallsSummaryItems = buildWallsSummaryItems(wallsResult);

  const updateWallsRoom = useCallback((roomId: string, patch: WallsRoomDraft) => {
    setWallsRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }, []);

  const removeWallsRoom = useCallback((roomId: string) => {
    setWallsRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }, []);

  const onWallsRoomIncludedChange = useCallback(
    (roomId: string, isIncluded: boolean) => {
      updateWallsRoom(roomId, { isIncluded });
    },
    [updateWallsRoom],
  );

  const onWallsCoveringChange = useCallback(
    (roomId: string, coveringType: WallsCoveringType) => {
      updateWallsRoom(roomId, { coveringType });
    },
    [updateWallsRoom],
  );

  const onWallsPreparationChange = useCallback(
    (roomId: string, preparationType: WallsPreparationType) => {
      updateWallsRoom(roomId, { preparationType });
    },
    [updateWallsRoom],
  );

  return {
    wallsRooms,
    wallsResult,
    wallsSummaryItems,
    removeWallsRoom,
    onWallsRoomIncludedChange,
    onWallsCoveringChange,
    onWallsPreparationChange,
  };
}
