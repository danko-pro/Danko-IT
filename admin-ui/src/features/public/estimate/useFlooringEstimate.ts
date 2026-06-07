import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useFlooringSnapshotRefresh } from "./useFlooringSnapshotRefresh";
import { parseEstimateDecimal, type EstimateRoomGeometry, type EstimateRoomInput } from "../public-estimate-geometry";
import {
  normalizeEstimateCountOnBlur,
  sanitizeEstimateIntegerInput,
} from "../public-estimate-input";
import {
  calculateFlooring,
  type FlooringCoveringType,
  type FlooringLayoutType,
  type FlooringPreparationType,
} from "../public-estimate-flooring";
import {
  getDefaultFlooringCovering,
  getDefaultFlooringLayout,
  getDefaultFlooringPlinth,
  getDefaultFlooringPreparation,
  getFlooringCoveringOptions,
  getFlooringLayoutOptions,
  getFlooringPlinthOptions,
  getFlooringPreparationOptions,
} from "./flooring-snapshot-options";
import type { EstimateRoomDraft, FlooringOptionsDraft, FlooringRoomDraft } from "./context";
import { buildFlooringSummaryItems } from "./summary";

type UseFlooringEstimateParams = {
  rooms: EstimateRoomDraft[];
  roomInputs: EstimateRoomInput[];
  roomGeometries: EstimateRoomGeometry[];
};

export function useFlooringEstimate({ rooms, roomInputs, roomGeometries }: UseFlooringEstimateParams) {
  const snapshotRevision = useFlooringSnapshotRefresh();
  const [flooringRooms, setFlooringRooms] = useState<Record<string, FlooringRoomDraft>>({});
  const [flooringOptions, setFlooringOptions] = useState<FlooringOptionsDraft>({
    includePlinth: true,
    plinthType: getDefaultFlooringPlinth(),
    includeThresholds: false,
    thresholdCount: "0",
    includeDemolition: false,
  });

  const flooringRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const flooringDraft = flooringRooms[room.id] ?? {};
        const coveringType = flooringDraft.coveringType ?? getDefaultFlooringCovering(room.type);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          perimeter: roomGeometries[index]?.perimeter ?? 0,
          plinthLength: roomGeometries[index]?.plinthLength ?? 0,
          coveringType,
          preparationType: flooringDraft.preparationType ?? getDefaultFlooringPreparation(room.type),
          layoutType: flooringDraft.layoutType ?? getDefaultFlooringLayout(coveringType),
          isIncluded: flooringDraft.isIncluded ?? true,
        };
      }),
    [flooringRooms, roomGeometries, roomInputs, rooms, snapshotRevision],
  );

  const flooringResult = useMemo(
    () =>
      calculateFlooring(flooringRoomInputs, {
        includePlinth: flooringOptions.includePlinth,
        plinthType: flooringOptions.plinthType,
        includeThresholds: flooringOptions.includeThresholds,
        thresholdCount: parseEstimateDecimal(flooringOptions.thresholdCount),
        includeDemolition: flooringOptions.includeDemolition,
      }),
    [flooringOptions, flooringRoomInputs, snapshotRevision],
  );

  const flooringSummaryItems = useMemo(
    () => buildFlooringSummaryItems(flooringResult),
    [flooringResult],
  );

  const flooringCoveringOptions = useMemo(() => getFlooringCoveringOptions(), [snapshotRevision]);
  const flooringPreparationOptions = useMemo(() => getFlooringPreparationOptions(), [snapshotRevision]);
  const flooringLayoutOptions = useMemo(() => getFlooringLayoutOptions(), [snapshotRevision]);
  const flooringPlinthOptions = useMemo(() => getFlooringPlinthOptions(), [snapshotRevision]);

  const updateFlooringRoom = useCallback((roomId: string, patch: FlooringRoomDraft) => {
    setFlooringRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }, []);

  const updateFlooringCovering = useCallback(
    (roomId: string, coveringType: FlooringCoveringType) => {
      updateFlooringRoom(roomId, {
        coveringType,
        layoutType: getDefaultFlooringLayout(coveringType),
      });
    },
    [updateFlooringRoom],
  );

  const updateFlooringOptions = useCallback((patch: Partial<FlooringOptionsDraft>) => {
    setFlooringOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }, []);

  const removeFlooringRoom = useCallback((roomId: string) => {
    setFlooringRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }, []);

  const onFlooringRoomIncludedChange = useCallback(
    (roomId: string, isIncluded: boolean) => {
      updateFlooringRoom(roomId, { isIncluded });
    },
    [updateFlooringRoom],
  );

  const onFlooringPreparationChange = useCallback(
    (roomId: string, preparationType: FlooringPreparationType) => {
      updateFlooringRoom(roomId, { preparationType });
    },
    [updateFlooringRoom],
  );

  const onFlooringLayoutChange = useCallback(
    (roomId: string, layoutType: FlooringLayoutType) => {
      updateFlooringRoom(roomId, { layoutType });
    },
    [updateFlooringRoom],
  );

  const onFlooringThresholdCountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateFlooringOptions({ thresholdCount: sanitizeEstimateIntegerInput(event.target.value) });
    },
    [updateFlooringOptions],
  );

  const onFlooringThresholdCountBlur = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateFlooringOptions({ thresholdCount: normalizeEstimateCountOnBlur(event.target.value) });
    },
    [updateFlooringOptions],
  );

  return {
    flooringRooms,
    flooringOptions,
    flooringCoveringOptions,
    flooringPreparationOptions,
    flooringLayoutOptions,
    flooringPlinthOptions,
    flooringResult,
    flooringSummaryItems,
    removeFlooringRoom,
    onFlooringRoomIncludedChange,
    onFlooringCoveringChange: updateFlooringCovering,
    onFlooringPreparationChange,
    onFlooringLayoutChange,
    onFlooringOptionsChange: updateFlooringOptions,
    onFlooringThresholdCountChange,
    onFlooringThresholdCountBlur,
  };
}
