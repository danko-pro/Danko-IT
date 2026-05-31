import { useCallback, useMemo, useState } from "react";
import {
  calculatePlumbing,
  dishwasherPackageLabels,
  getDishwasherZonePackageTotal,
  getInstallRelocationZoneTotal,
  getKitchenSinkZonePackageTotal,
  getShowerZonePackageTotal,
  kitchenSinkPackageLabels,
  showerPackageLabels,
  type PlumbingOptions,
} from "../public-estimate-plumbing";
import type { PlumbingPackageLevel } from "../public-estimate-plumbing-zones";
import type { EstimateRoomInput } from "../public-estimate-geometry";
import { type EstimateRoomDraft } from "./context";
import { buildPlumbingCompositionItems, buildPlumbingSummaryItems } from "./summary";

type UsePlumbingEstimateParams = {
  rooms: EstimateRoomDraft[];
  roomInputs: EstimateRoomInput[];
};

export function usePlumbingEstimate({ rooms, roomInputs }: UsePlumbingEstimateParams) {
  const [plumbingOptions, setPlumbingOptions] = useState<PlumbingOptions>({
    includeBathroomSet: true,
    includeBath: true,
    includeHygienicShower: true,
    includeElectricTowelRail: false,
    includeKitchenSink: true,
    kitchenSinkPackageLevel: "b",
    includeDishwasherOutput: true,
    dishwasherPackageLevel: "b",
    includeShowerZone: false,
    showerPackageLevel: "b",
    includeInstallRelocation: false,
    includeWasherOutput: true,
    includeWaterNode: true,
    includeLeakProtection: false,
  });

  const plumbingRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => ({
        roomId: room.id,
        roomName: room.name.trim() || "Помещение",
        roomType: room.type,
        area: roomInputs[index]?.area ?? 0,
      })),
    [roomInputs, rooms],
  );

  const plumbingResult = useMemo(
    () => calculatePlumbing(plumbingRoomInputs, plumbingOptions),
    [plumbingOptions, plumbingRoomInputs],
  );

  const plumbingCompositionItems = buildPlumbingCompositionItems(plumbingResult);
  const plumbingSummaryItems = buildPlumbingSummaryItems(plumbingResult);

  const updatePlumbingOptions = useCallback((patch: Partial<PlumbingOptions>) => {
    setPlumbingOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }, []);

  const onIncludeBathroomSetChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeBathroomSet: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeBathChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeBath: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeHygienicShowerChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeHygienicShower: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeElectricTowelRailChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeElectricTowelRail: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeKitchenSinkChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeKitchenSink: checked });
    },
    [updatePlumbingOptions],
  );

  const onKitchenSinkPackageLevelChange = useCallback(
    (level: PlumbingPackageLevel) => {
      updatePlumbingOptions({ kitchenSinkPackageLevel: level });
    },
    [updatePlumbingOptions],
  );

  const onIncludeDishwasherOutputChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeDishwasherOutput: checked });
    },
    [updatePlumbingOptions],
  );

  const onDishwasherPackageLevelChange = useCallback(
    (level: PlumbingPackageLevel) => {
      updatePlumbingOptions({ dishwasherPackageLevel: level });
    },
    [updatePlumbingOptions],
  );

  const onIncludeShowerZoneChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeShowerZone: checked });
    },
    [updatePlumbingOptions],
  );

  const onShowerPackageLevelChange = useCallback(
    (level: PlumbingPackageLevel) => {
      updatePlumbingOptions({ showerPackageLevel: level });
    },
    [updatePlumbingOptions],
  );

  const onIncludeInstallRelocationChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeInstallRelocation: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeWasherOutputChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeWasherOutput: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeWaterNodeChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeWaterNode: checked });
    },
    [updatePlumbingOptions],
  );

  const onIncludeLeakProtectionChange = useCallback(
    (checked: boolean) => {
      updatePlumbingOptions({ includeLeakProtection: checked });
    },
    [updatePlumbingOptions],
  );

  return {
    plumbingOptions,
    plumbingResult,
    plumbingCompositionItems,
    plumbingSummaryItems,
    kitchenSinkPackageLabels,
    dishwasherPackageLabels,
    showerPackageLabels,
    getKitchenSinkZonePackageTotal,
    getDishwasherZonePackageTotal,
    getShowerZonePackageTotal,
    getInstallRelocationZoneTotal,
    onIncludeBathroomSetChange,
    onIncludeBathChange,
    onIncludeHygienicShowerChange,
    onIncludeElectricTowelRailChange,
    onIncludeKitchenSinkChange,
    onKitchenSinkPackageLevelChange,
    onIncludeDishwasherOutputChange,
    onDishwasherPackageLevelChange,
    onIncludeShowerZoneChange,
    onShowerPackageLevelChange,
    onIncludeInstallRelocationChange,
    onIncludeWasherOutputChange,
    onIncludeWaterNodeChange,
    onIncludeLeakProtectionChange,
  };
}
