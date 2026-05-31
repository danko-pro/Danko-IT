import { useCallback, useMemo, useState } from "react";
import { calculateCeiling } from "../public-estimate-ceiling";
import { type EstimateRoomGeometry } from "../public-estimate-geometry";
import { getDefaultCeilingLightSettings } from "./defaults";
import type { CeilingRoomDraft, EstimateRoomDraft } from "./context";
import { buildCeilingSummaryItems } from "./summary";

type UseCeilingEstimateParams = {
  rooms: EstimateRoomDraft[];
  roomGeometries: EstimateRoomGeometry[];
};

export function useCeilingEstimate({ rooms, roomGeometries }: UseCeilingEstimateParams) {
  const [ceilingRooms, setCeilingRooms] = useState<Record<string, CeilingRoomDraft>>({});

  const ceilingRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const ceilingDraft = ceilingRooms[room.id] ?? {};
        const lightDefaults = getDefaultCeilingLightSettings(room.type);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          ceilingArea: roomGeometries[index]?.ceilingArea ?? 0,
          isIncluded: ceilingDraft.isIncluded ?? true,
          hasPointLights: ceilingDraft.hasPointLights ?? lightDefaults.hasPointLights,
          squareMetersPerPoint: lightDefaults.squareMetersPerPoint,
          minPoints: lightDefaults.minPoints,
        };
      }),
    [ceilingRooms, roomGeometries, rooms],
  );

  const ceilingResult = useMemo(() => calculateCeiling(ceilingRoomInputs), [ceilingRoomInputs]);

  const ceilingSummaryItems = buildCeilingSummaryItems(ceilingResult);

  const updateCeilingRoom = useCallback((roomId: string, patch: CeilingRoomDraft) => {
    setCeilingRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }, []);

  const removeCeilingRoom = useCallback((roomId: string) => {
    setCeilingRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }, []);

  const getCeilingLightDefaults = useCallback(
    (roomId: string) =>
      getDefaultCeilingLightSettings(
        rooms.find((estimateRoom) => estimateRoom.id === roomId)?.type ?? "other",
      ),
    [rooms],
  );

  const onCeilingRoomIncludedChange = useCallback(
    (roomId: string, isIncluded: boolean) => {
      updateCeilingRoom(roomId, { isIncluded });
    },
    [updateCeilingRoom],
  );

  const onCeilingPointLightsChange = useCallback(
    (roomId: string, hasPointLights: boolean) => {
      updateCeilingRoom(roomId, { hasPointLights });
    },
    [updateCeilingRoom],
  );

  return {
    ceilingRooms,
    ceilingResult,
    ceilingSummaryItems,
    removeCeilingRoom,
    getCeilingLightDefaults,
    onCeilingRoomIncludedChange,
    onCeilingPointLightsChange,
  };
}
