import { useCallback, useMemo, useState } from "react";
import { calculateElectric, type ElectricOptions } from "../public-estimate-electric";
import type { CeilingCalculationResult } from "../public-estimate-ceiling";
import type { EstimateRoomInput } from "../public-estimate-geometry";
import { type ElectricRoomDraft, type EstimateRoomDraft } from "./context";
import { buildElectricSummaryItems } from "./summary";

type UseElectricEstimateParams = {
  rooms: EstimateRoomDraft[];
  roomInputs: EstimateRoomInput[];
  ceilingResult: CeilingCalculationResult;
};

export function useElectricEstimate({ rooms, roomInputs, ceilingResult }: UseElectricEstimateParams) {
  const [electricRooms, setElectricRooms] = useState<Record<string, ElectricRoomDraft>>({});
  const [electricOptions, setElectricOptions] = useState<ElectricOptions>({
    includeKitchenOutputs: true,
    includeSwitchboard: true,
  });

  const electricRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const electricDraft = electricRooms[room.id] ?? {};
        const ceilingRoom = ceilingResult.roomResults.find((ceilingResultRoom) => ceilingResultRoom.roomId === room.id);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          roomType: room.type,
          area: roomInputs[index]?.area ?? 0,
          isIncluded: electricDraft.isIncluded ?? true,
          ceilingPointCount: ceilingRoom?.pointCount ?? 1,
        };
      }),
    [ceilingResult.roomResults, electricRooms, roomInputs, rooms],
  );

  const electricResult = useMemo(
    () => calculateElectric(electricRoomInputs, electricOptions),
    [electricOptions, electricRoomInputs],
  );

  const electricSummaryItems = buildElectricSummaryItems(electricResult);

  const updateElectricRoom = useCallback((roomId: string, patch: ElectricRoomDraft) => {
    setElectricRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }, []);

  const updateElectricOptions = useCallback((patch: Partial<ElectricOptions>) => {
    setElectricOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }, []);

  const removeElectricRoom = useCallback((roomId: string) => {
    setElectricRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }, []);

  const onElectricRoomIncludedChange = useCallback(
    (roomId: string, isIncluded: boolean) => {
      updateElectricRoom(roomId, { isIncluded });
    },
    [updateElectricRoom],
  );

  const onElectricKitchenOutputsChange = useCallback(
    (includeKitchenOutputs: boolean) => {
      updateElectricOptions({ includeKitchenOutputs });
    },
    [updateElectricOptions],
  );

  const onElectricSwitchboardChange = useCallback(
    (includeSwitchboard: boolean) => {
      updateElectricOptions({ includeSwitchboard });
    },
    [updateElectricOptions],
  );

  return {
    electricRooms,
    electricOptions,
    electricResult,
    electricSummaryItems,
    removeElectricRoom,
    onElectricRoomIncludedChange,
    onElectricKitchenOutputsChange,
    onElectricSwitchboardChange,
  };
}
