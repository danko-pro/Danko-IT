import { useCallback, useMemo, useState } from "react";
import { calculateDoors, type DoorOptions, type DoorPackageType } from "../public-estimate-doors";
import type { EstimateRoomInput } from "../public-estimate-geometry";
import { type EstimateRoomDraft } from "./context";
import { buildDoorCompositionItems, buildDoorSummaryItems } from "./summary";

type UseDoorsEstimateParams = {
  rooms: EstimateRoomDraft[];
  roomInputs: EstimateRoomInput[];
};

export function useDoorsEstimate({ rooms, roomInputs }: UseDoorsEstimateParams) {
  const [doorOptions, setDoorOptions] = useState<DoorOptions>({
    packageType: "invisible_19000",
    includeHandles: true,
    includePrivacyLocks: true,
    includeLogistics: true,
    includeInstallation: true,
  });

  const doorRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => ({
        roomId: room.id,
        roomName: room.name.trim() || "Помещение",
        roomType: room.type,
        area: roomInputs[index]?.area ?? 0,
        doorCount: roomInputs[index]?.doorCount ?? 0,
      })),
    [roomInputs, rooms],
  );

  const doorsResult = useMemo(
    () => calculateDoors(doorRoomInputs, doorOptions),
    [doorOptions, doorRoomInputs],
  );

  const doorCompositionItems = buildDoorCompositionItems(doorsResult, doorOptions);
  const doorSummaryItems = buildDoorSummaryItems(doorsResult);

  const updateDoorOptions = useCallback((patch: Partial<DoorOptions>) => {
    setDoorOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }, []);

  const onPackageTypeChange = useCallback(
    (packageType: DoorPackageType) => {
      updateDoorOptions({ packageType });
    },
    [updateDoorOptions],
  );

  const onIncludeHandlesChange = useCallback(
    (checked: boolean) => {
      updateDoorOptions({ includeHandles: checked });
    },
    [updateDoorOptions],
  );

  const onIncludePrivacyLocksChange = useCallback(
    (checked: boolean) => {
      updateDoorOptions({ includePrivacyLocks: checked });
    },
    [updateDoorOptions],
  );

  const onIncludeLogisticsChange = useCallback(
    (checked: boolean) => {
      updateDoorOptions({ includeLogistics: checked });
    },
    [updateDoorOptions],
  );

  const onIncludeInstallationChange = useCallback(
    (checked: boolean) => {
      updateDoorOptions({ includeInstallation: checked });
    },
    [updateDoorOptions],
  );

  return {
    doorOptions,
    doorsResult,
    doorCompositionItems,
    doorSummaryItems,
    onPackageTypeChange,
    onIncludeHandlesChange,
    onIncludePrivacyLocksChange,
    onIncludeLogisticsChange,
    onIncludeInstallationChange,
  };
}
