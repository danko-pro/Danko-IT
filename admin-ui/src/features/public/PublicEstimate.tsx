import { useCallback, useMemo, useState } from "react";
import { calculateCeiling } from "./public-estimate-ceiling";
import { calculateCompletion, type CompletionOptions } from "./public-estimate-completion";
import {
  applianceItemCatalog,
  calculateAppliances,
  createDefaultAppliancesOptions,
  getApplianceUnitPrice,
  type ApplianceItemKey,
  type AppliancesOptions,
} from "./public-estimate-appliances";
import {
  calculateLooseFurniture,
  createDefaultLooseFurnitureOptions,
  getLooseFurnitureUnitPrice,
  looseFurnitureItemCatalog,
  type LooseFurnitureItemKey,
  type LooseFurnitureOptions,
} from "./public-estimate-loose-furniture";
import { calculateHomeGoods, createDefaultHomeGoodsOptions, type HomeGoodsOptions } from "./public-estimate-home-goods";
import { calculateDoors, type DoorOptions } from "./public-estimate-doors";
import { calculateElectric, type ElectricOptions } from "./public-estimate-electric";
import { parseEstimateDecimal, parseEstimateInteger } from "./public-estimate-geometry";
import {
  estimateNumericFieldProps,
  estimateTextFieldProps,
  normalizeEstimateCountOnBlur,
  normalizeEstimateDecimalOnBlur,
  normalizeEstimateQuantityOnBlur,
  sanitizeEstimateDecimalInput,
  sanitizeEstimateIntegerInput,
} from "./public-estimate-input";
import {
  calculateFlooring,
  type FlooringCoveringType,
  type FlooringLayoutType,
  type FlooringPlinthType,
  type FlooringPreparationType,
} from "./public-estimate-flooring";
import { buildPublicEstimateResult } from "./estimate/engine";
import { type EstimateSection, type EstimateSectionId } from "./public-estimate-model";
import { classifyEstimatePackage } from "./public-estimate-package";
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
} from "./public-estimate-plumbing";
import { calculateWarmFloor, type WarmFloorMode } from "./public-estimate-warm-floor";
import { calculateWalls } from "./public-estimate-walls";
import {
  doorPackageOptions,
  flooringCoveringOptions,
  flooringLayoutOptions,
  flooringPlinthOptions,
  flooringPreparationOptions,
  GEOMETRY_STEP_HINT,
  getDefaultCeilingLightSettings,
  getDefaultFlooringCovering,
  getDefaultFlooringLayout,
  getDefaultFlooringPreparation,
  getDefaultWallsCovering,
  getDefaultWallsPreparation,
  wallsCoveringOptions,
  wallsPreparationOptions,
} from "./estimate/defaults";
import {
  normalizeAppliancesOptionsDraft,
  normalizeLooseFurnitureOptionsDraft,
  type AppliancesOptionsDraft,
  type CeilingRoomDraft,
  type CompletionOptionsDraft,
  type ElectricRoomDraft,
  type EstimateObjectMeta,
  type FlooringOptionsDraft,
  type FlooringRoomDraft,
  type LooseFurnitureOptionsDraft,
  type WallsRoomDraft,
  type WarmFloorRoomDraft,
} from "./estimate/context";
import { buildEstimateSpecModalData } from "./estimate/spec";
import {
  buildAppliancesSummaryItems,
  buildCeilingSummaryItems,
  buildCompactVolumeItems,
  buildCompletionSummaryItems,
  buildDoorCompositionItems,
  buildDoorSummaryItems,
  buildElectricSummaryItems,
  buildEstimateTotalItems,
  buildFlooringSummaryItems,
  buildHomeGoodsSummaryItems,
  buildLooseFurnitureSummaryItems,
  buildPlumbingCompositionItems,
  buildPlumbingSummaryItems,
  buildVolumeSummaryItems,
  buildWallsSummaryItems,
  buildWarmFloorSummaryItems,
} from "./estimate/summary";
import { estimateNavigationItems, formatEstimateStep, getEstimateSectionClassName } from "./sections/registry";
import { useEstimateNavigation } from "./estimate/useEstimateNavigation";
import { useEstimateRooms } from "./estimate/useEstimateRooms";
import { FlooringSection } from "./sections/flooring/FlooringSection";
import { GeometrySection } from "./sections/geometry/GeometrySection";
import { ObjectSection } from "./sections/object/ObjectSection";
import { WarmFloorSection } from "./sections/warm-floor/WarmFloorSection";
import { CeilingSection } from "./sections/ceiling/CeilingSection";
import { AppliancesSection } from "./sections/appliances/AppliancesSection";
import { LooseFurnitureSection } from "./sections/loose-furniture/LooseFurnitureSection";
import { HomeGoodsSection } from "./sections/home-goods/HomeGoodsSection";
import { CompletionSection } from "./sections/completion/CompletionSection";
import { EstimateActions } from "./components/estimate/EstimateActions";
import { EstimateMobileTotal } from "./components/estimate/EstimateMobileTotal";
import { EstimatePassportSidebar } from "./components/estimate/EstimatePassportSidebar";
import { EstimateRail } from "./components/estimate/EstimateRail";
import { EstimateSpecModal } from "./components/estimate/EstimateSpecModal";
import { EstimateVolumesPrint } from "./components/estimate/EstimateVolumesPrint";
import { CostsSection } from "./sections/costs/CostsSection";
import { DoorsSection } from "./sections/doors/DoorsSection";
import { ElectricSection } from "./sections/electric/ElectricSection";
import { PlumbingSection } from "./sections/plumbing/PlumbingSection";
import { WallsSection } from "./sections/walls/WallsSection";

function createDefaultAppliancesOptionsDraft(): AppliancesOptionsDraft {
  const base = createDefaultAppliancesOptions();
  const items = {} as AppliancesOptionsDraft["items"];

  for (const item of applianceItemCatalog) {
    items[item.key] = {
      isIncluded: base.items[item.key].isIncluded,
      quantity: String(base.items[item.key].quantity),
    };
  }

  return { packageLevel: base.packageLevel, fridgeVariant: base.fridgeVariant, items };
}

function createDefaultLooseFurnitureOptionsDraft(): LooseFurnitureOptionsDraft {
  const base = createDefaultLooseFurnitureOptions();
  const items = {} as LooseFurnitureOptionsDraft["items"];

  for (const item of looseFurnitureItemCatalog) {
    items[item.key] = {
      isIncluded: base.items[item.key].isIncluded,
      quantity: String(base.items[item.key].quantity),
    };
  }

  return { packageLevel: base.packageLevel, items };
}

export function PublicEstimate() {
  const [objectMeta, setObjectMeta] = useState<EstimateObjectMeta>({
    address: "",
    complexName: "",
    apartmentNumber: "",
    contact: "",
  });
  const [warmFloorMode, setWarmFloorMode] = useState<WarmFloorMode>("water");
  const [warmFloorRooms, setWarmFloorRooms] = useState<Record<string, WarmFloorRoomDraft>>({});
  const [flooringRooms, setFlooringRooms] = useState<Record<string, FlooringRoomDraft>>({});
  const [wallsRooms, setWallsRooms] = useState<Record<string, WallsRoomDraft>>({});
  const [ceilingRooms, setCeilingRooms] = useState<Record<string, CeilingRoomDraft>>({});
  const [electricRooms, setElectricRooms] = useState<Record<string, ElectricRoomDraft>>({});
  const [flooringOptions, setFlooringOptions] = useState<FlooringOptionsDraft>({
    includePlinth: true,
    plinthType: "duropolymer",
    includeThresholds: false,
    thresholdCount: "0",
    includeDemolition: false,
  });
  const [electricOptions, setElectricOptions] = useState<ElectricOptions>({
    includeKitchenOutputs: true,
    includeSwitchboard: true,
  });
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
  const [doorOptions, setDoorOptions] = useState<DoorOptions>({
    packageType: "invisible_19000",
    includeHandles: true,
    includePrivacyLocks: true,
    includeLogistics: true,
    includeInstallation: true,
  });
  const [completionOptions, setCompletionOptions] = useState<CompletionOptionsDraft>({
    includeKitchenBase: false,
    kitchenLengthMeters: "5",
    includeKitchenAppliancePenal: false,
    includeKitchenFridgePenal: false,
    includeWardrobe: false,
    includeBathroomFurniture: false,
  });
  const [appliancesOptions, setAppliancesOptions] = useState<AppliancesOptionsDraft>(() =>
    createDefaultAppliancesOptionsDraft(),
  );
  const [looseFurnitureOptions, setLooseFurnitureOptions] = useState<LooseFurnitureOptionsDraft>(() =>
    createDefaultLooseFurnitureOptionsDraft(),
  );
  const [homeGoodsOptions, setHomeGoodsOptions] = useState<HomeGoodsOptions>(() => createDefaultHomeGoodsOptions());
  const [specModal, setSpecModal] = useState<{ kind: "section" | "full"; sectionId?: EstimateSectionId } | null>(
    null,
  );
  const {
    activeEstimateSection,
    estimateRailScrollRef,
    isMobileVolumesExpanded,
    toggleMobileVolumesExpanded,
    scrollToEstimateSection,
  } = useEstimateNavigation();
  const purgeRoomFromRelatedState = useCallback((roomId: string) => {
    setWarmFloorRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setFlooringRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setWallsRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setCeilingRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setElectricRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }, []);
  const {
    ceilingHeightInput,
    rooms,
    roomInputs,
    roomGeometries,
    totals,
    enteringRoomIds,
    removingRoomIds,
    onCeilingHeightChange,
    onCeilingHeightBlur,
    onRoomNameChange,
    onRoomAreaChange,
    onRoomAreaBlur,
    onRoomDoorCountChange,
    onRoomDoorCountBlur,
    onRoomWindowCountChange,
    onRoomWindowCountBlur,
    addRoom,
    removeRoom,
  } = useEstimateRooms();
  const handleRemoveRoom = useCallback(
    (roomId: string) => removeRoom(roomId, purgeRoomFromRelatedState),
    [removeRoom, purgeRoomFromRelatedState],
  );
  const warmFloorRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const warmFloorDraft = warmFloorRooms[room.id] ?? {};

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          isSelected: warmFloorDraft.isSelected ?? room.type === "bathroom",
          warmFloorArea: parseEstimateDecimal(warmFloorDraft.warmFloorArea ?? room.area),
        };
      }),
    [roomInputs, rooms, warmFloorRooms],
  );
  const warmFloorResult = useMemo(
    () => calculateWarmFloor(warmFloorMode, warmFloorRoomInputs),
    [warmFloorMode, warmFloorRoomInputs],
  );
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
    [flooringRooms, roomGeometries, roomInputs, rooms],
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
    [flooringOptions, flooringRoomInputs],
  );
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
  const doorsResult = useMemo(() => calculateDoors(doorRoomInputs, doorOptions), [doorOptions, doorRoomInputs]);
  const completionResult = useMemo(
    () =>
      calculateCompletion({
        ...completionOptions,
        kitchenLengthMeters: parseEstimateDecimal(completionOptions.kitchenLengthMeters),
      }),
    [completionOptions],
  );
  const normalizedAppliancesOptions = useMemo(
    () => normalizeAppliancesOptionsDraft(appliancesOptions),
    [appliancesOptions],
  );
  const normalizedLooseFurnitureOptions = useMemo(
    () => normalizeLooseFurnitureOptionsDraft(looseFurnitureOptions),
    [looseFurnitureOptions],
  );
  const appliancesResult = useMemo(
    () => calculateAppliances(normalizedAppliancesOptions),
    [normalizedAppliancesOptions],
  );
  const looseFurnitureResult = useMemo(
    () => calculateLooseFurniture(normalizedLooseFurnitureOptions),
    [normalizedLooseFurnitureOptions],
  );
  const homeGoodsResult = useMemo(
    () => calculateHomeGoods({ floorArea: totals.floorArea, options: homeGoodsOptions }),
    [homeGoodsOptions, totals.floorArea],
  );
  const estimateResult = useMemo(
    () =>
      buildPublicEstimateResult({
        warmFloorResult,
        flooringResult,
        wallsResult,
        ceilingResult,
        electricResult,
        plumbingResult,
        doorsResult,
        completionResult,
        appliancesResult,
        looseFurnitureResult,
        homeGoodsResult,
        floorArea: totals.floorArea,
      }),
    [
      appliancesResult,
      looseFurnitureResult,
      homeGoodsResult,
      ceilingResult,
      completionResult,
      doorsResult,
      electricResult,
      flooringResult,
      plumbingResult,
      totals.floorArea,
      wallsResult,
      warmFloorResult,
    ],
  );

  const summaryItems = buildVolumeSummaryItems(totals);
  const compactVolumeItems = buildCompactVolumeItems(summaryItems);
  const estimateTotalItems = buildEstimateTotalItems(estimateResult.totals);
  const packageClassification = classifyEstimatePackage(estimateResult.totals.pricePerSquareMeter);

  const warmFloorModeLabel = warmFloorMode === "water" ? "Водяной" : "Электрический";
  const warmFloorConnectionLabel =
    warmFloorMode === "electric"
      ? "автомат в щит"
      : warmFloorResult.usesTowelRailConnection
        ? "от полотенцесушителя"
        : warmFloorResult.needsPump
          ? "гребенка + насос"
          : warmFloorResult.needsManifold
            ? "гребенка"
            : "без отдельного узла";
  const warmFloorSummaryItems = buildWarmFloorSummaryItems(warmFloorMode, warmFloorResult);
  const flooringSummaryItems = buildFlooringSummaryItems(flooringResult);
  const wallsSummaryItems = buildWallsSummaryItems(wallsResult);
  const ceilingSummaryItems = buildCeilingSummaryItems(ceilingResult);
  const electricSummaryItems = buildElectricSummaryItems(electricResult);
  const plumbingCompositionItems = buildPlumbingCompositionItems(plumbingResult);
  const plumbingSummaryItems = buildPlumbingSummaryItems(plumbingResult);
  const doorCompositionItems = buildDoorCompositionItems(doorsResult, doorOptions);
  const doorSummaryItems = buildDoorSummaryItems(doorsResult);
  const completionSummaryItems = buildCompletionSummaryItems(completionResult);
  const appliancesSummaryItems = buildAppliancesSummaryItems(appliancesResult);
  const looseFurnitureSummaryItems = buildLooseFurnitureSummaryItems(looseFurnitureResult);
  const homeGoodsSummaryItems = buildHomeGoodsSummaryItems(homeGoodsResult);
  const allEstimateSections: EstimateSection[] = [
    warmFloorResult.section,
    flooringResult.section,
    wallsResult.section,
    ceilingResult.section,
    electricResult.section,
    plumbingResult.section,
    doorsResult.section,
    completionResult.section,
    appliancesResult.section,
    looseFurnitureResult.section,
    homeGoodsResult.section,
  ];
  const specModalData = useMemo(
    () =>
      buildEstimateSpecModalData({
        specModal,
        allEstimateSections,
        estimateResult,
        plumbingOptions,
        plumbingResult,
      }),
    [allEstimateSections, estimateResult, plumbingOptions, plumbingResult, specModal],
  );

  function openSectionSpec(sectionId: EstimateSectionId) {
    setSpecModal({ kind: "section", sectionId });
  }

  function openFullSpec() {
    setSpecModal({ kind: "full" });
  }

  function closeSpecModal() {
    setSpecModal(null);
  }

  function updateWarmFloorRoom(roomId: string, patch: WarmFloorRoomDraft) {
    setWarmFloorRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateFlooringRoom(roomId: string, patch: FlooringRoomDraft) {
    setFlooringRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateFlooringCovering(roomId: string, coveringType: FlooringCoveringType) {
    updateFlooringRoom(roomId, {
      coveringType,
      layoutType: getDefaultFlooringLayout(coveringType),
    });
  }

  function updateFlooringOptions(patch: Partial<FlooringOptionsDraft>) {
    setFlooringOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateWallsRoom(roomId: string, patch: WallsRoomDraft) {
    setWallsRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateCeilingRoom(roomId: string, patch: CeilingRoomDraft) {
    setCeilingRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateElectricRoom(roomId: string, patch: ElectricRoomDraft) {
    setElectricRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateElectricOptions(patch: Partial<ElectricOptions>) {
    setElectricOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updatePlumbingOptions(patch: Partial<PlumbingOptions>) {
    setPlumbingOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateDoorOptions(patch: Partial<DoorOptions>) {
    setDoorOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateCompletionOptions(patch: Partial<CompletionOptionsDraft>) {
    setCompletionOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateAppliancesOptions(patch: Partial<Pick<AppliancesOptions, "packageLevel" | "fridgeVariant">>) {
    setAppliancesOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateApplianceItem(key: ApplianceItemKey, patch: Partial<{ isIncluded: boolean; quantity: string }>) {
    setAppliancesOptions((currentOptions) => ({
      ...currentOptions,
      items: {
        ...currentOptions.items,
        [key]: {
          ...currentOptions.items[key],
          ...patch,
        },
      },
    }));
  }

  function updateLooseFurnitureOptions(patch: Partial<Pick<LooseFurnitureOptions, "packageLevel">>) {
    setLooseFurnitureOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function updateLooseFurnitureItem(
    key: LooseFurnitureItemKey,
    patch: Partial<{ isIncluded: boolean; quantity: string }>,
  ) {
    setLooseFurnitureOptions((currentOptions) => ({
      ...currentOptions,
      items: {
        ...currentOptions.items,
        [key]: {
          ...currentOptions.items[key],
          ...patch,
        },
      },
    }));
  }

  function updateHomeGoodsOptions(patch: Partial<HomeGoodsOptions>) {
    setHomeGoodsOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function handlePrintEstimate() {
    window.print();
  }

  function handlePrintVolumes() {
    document.body.classList.add("public-estimate-print-volumes");

    const cleanup = () => {
      document.body.classList.remove("public-estimate-print-volumes");
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }

  return (
    <main className="public-landing public-estimate-page">
      <header className="public-estimate-header">
        <a className="public-brand public-privacy-brand" href="/" aria-label="Danko, на главную">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="public-brand-copy">
            <span className="public-brand-name">Danko</span>
            <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
          </span>
        </a>
        <a className="public-privacy-back" href="/">
          Вернуться на главную
        </a>
      </header>

      <section className="public-estimate public-estimate-workbench" aria-labelledby="public-estimate-title">
        <EstimateRail
          navigationItems={estimateNavigationItems}
          activeSectionId={activeEstimateSection}
          railScrollRef={estimateRailScrollRef}
          onNavigateToSection={scrollToEstimateSection}
          compactVolumeItems={compactVolumeItems}
          summaryItems={summaryItems}
          isMobileVolumesExpanded={isMobileVolumesExpanded}
          onToggleMobileVolumesExpanded={toggleMobileVolumesExpanded}
          onPrintVolumes={handlePrintVolumes}
        />

        <div className="public-estimate-card public-estimate-card-main">
          <div className="public-estimate-intro">
            <p className="public-section-kicker">Калькулятор ремонта</p>
            <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
            <p className="public-estimate-subtitle">
              Задайте помещения и параметры объекта — геометрия и итоги обновляются автоматически по мере заполнения
              разделов.
            </p>
          </div>

          <ObjectSection
            className={getEstimateSectionClassName("estimate-object", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-object")}
            objectMeta={objectMeta}
            textFieldProps={estimateTextFieldProps}
            onAddressChange={(event) =>
              setObjectMeta((current) => ({ ...current, address: event.target.value }))
            }
            onComplexNameChange={(event) =>
              setObjectMeta((current) => ({ ...current, complexName: event.target.value }))
            }
            onApartmentNumberChange={(event) =>
              setObjectMeta((current) => ({ ...current, apartmentNumber: event.target.value }))
            }
            onContactChange={(event) =>
              setObjectMeta((current) => ({ ...current, contact: event.target.value }))
            }
          />

          <GeometrySection
            className={getEstimateSectionClassName("estimate-geometry", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-geometry")}
            geometryStepHint={GEOMETRY_STEP_HINT}
            ceilingHeightInput={ceilingHeightInput}
            numberFieldProps={estimateNumericFieldProps}
            onCeilingHeightChange={onCeilingHeightChange}
            onCeilingHeightBlur={onCeilingHeightBlur}
            rooms={rooms}
            roomGeometries={roomGeometries}
            enteringRoomIds={enteringRoomIds}
            removingRoomIds={removingRoomIds}
            onRoomNameChange={onRoomNameChange}
            onRoomAreaChange={onRoomAreaChange}
            onRoomAreaBlur={onRoomAreaBlur}
            onRoomDoorCountChange={onRoomDoorCountChange}
            onRoomDoorCountBlur={onRoomDoorCountBlur}
            onRoomWindowCountChange={onRoomWindowCountChange}
            onRoomWindowCountBlur={onRoomWindowCountBlur}
            onRemoveRoom={handleRemoveRoom}
            onAddRoom={addRoom}
          />

          <WarmFloorSection
            className={getEstimateSectionClassName("estimate-warm-floor", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-warm-floor")}
            warmFloorMode={warmFloorMode}
            onSetWarmFloorMode={setWarmFloorMode}
            rooms={rooms}
            warmFloorRooms={warmFloorRooms}
            roomInputs={roomInputs}
            numberFieldProps={estimateNumericFieldProps}
            onWarmFloorRoomSelectedChange={(roomId, isSelected) =>
              updateWarmFloorRoom(roomId, { isSelected })
            }
            onWarmFloorAreaChange={(roomId, event) =>
              updateWarmFloorRoom(roomId, {
                warmFloorArea: sanitizeEstimateDecimalInput(event.target.value),
              })
            }
            onWarmFloorAreaBlur={(roomId, event) =>
              updateWarmFloorRoom(roomId, {
                warmFloorArea: normalizeEstimateDecimalOnBlur(event.target.value),
              })
            }
            warmFloorSummaryItems={warmFloorSummaryItems}
            warmFloorResult={warmFloorResult}
            warmFloorModeLabel={warmFloorModeLabel}
            warmFloorConnectionLabel={warmFloorConnectionLabel}
            onOpenSectionSpec={() => openSectionSpec("warm_floor")}
          />

          <FlooringSection
            className={getEstimateSectionClassName("estimate-flooring", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-flooring")}
            flooringResult={flooringResult}
            flooringRooms={flooringRooms}
            flooringOptions={flooringOptions}
            flooringCoveringOptions={flooringCoveringOptions}
            flooringPreparationOptions={flooringPreparationOptions}
            flooringLayoutOptions={flooringLayoutOptions}
            flooringPlinthOptions={flooringPlinthOptions}
            numberFieldProps={estimateNumericFieldProps}
            flooringSummaryItems={flooringSummaryItems}
            onFlooringRoomIncludedChange={(roomId, isIncluded) => updateFlooringRoom(roomId, { isIncluded })}
            onFlooringCoveringChange={updateFlooringCovering}
            onFlooringPreparationChange={(roomId, preparationType) =>
              updateFlooringRoom(roomId, { preparationType })
            }
            onFlooringLayoutChange={(roomId, layoutType) => updateFlooringRoom(roomId, { layoutType })}
            onFlooringOptionsChange={updateFlooringOptions}
            onFlooringThresholdCountChange={(event) =>
              updateFlooringOptions({ thresholdCount: sanitizeEstimateIntegerInput(event.target.value) })
            }
            onFlooringThresholdCountBlur={(event) =>
              updateFlooringOptions({ thresholdCount: normalizeEstimateCountOnBlur(event.target.value) })
            }
            onOpenSectionSpec={() => openSectionSpec("flooring")}
          />

          <WallsSection
            className={getEstimateSectionClassName("estimate-walls", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-walls")}
            wallsResult={wallsResult}
            wallsRooms={wallsRooms}
            wallsCoveringOptions={wallsCoveringOptions}
            wallsPreparationOptions={wallsPreparationOptions}
            wallsSummaryItems={wallsSummaryItems}
            onWallsRoomIncludedChange={(roomId, isIncluded) => updateWallsRoom(roomId, { isIncluded })}
            onWallsCoveringChange={(roomId, coveringType) => updateWallsRoom(roomId, { coveringType })}
            onWallsPreparationChange={(roomId, preparationType) => updateWallsRoom(roomId, { preparationType })}
            onOpenSectionSpec={() => openSectionSpec("walls")}
          />

          <CeilingSection
            className={getEstimateSectionClassName("estimate-ceiling", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-ceiling")}
            ceilingResult={ceilingResult}
            ceilingRooms={ceilingRooms}
            ceilingSummaryItems={ceilingSummaryItems}
            getCeilingLightDefaults={(roomId) =>
              getDefaultCeilingLightSettings(
                rooms.find((estimateRoom) => estimateRoom.id === roomId)?.type ?? "other",
              )
            }
            onCeilingRoomIncludedChange={(roomId, isIncluded) => updateCeilingRoom(roomId, { isIncluded })}
            onCeilingPointLightsChange={(roomId, hasPointLights) => updateCeilingRoom(roomId, { hasPointLights })}
            onOpenSectionSpec={() => openSectionSpec("ceiling")}
          />

          <ElectricSection
            className={getEstimateSectionClassName("estimate-electric", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-electric")}
            electricResult={electricResult}
            electricRooms={electricRooms}
            electricOptions={electricOptions}
            electricSummaryItems={electricSummaryItems}
            onElectricRoomIncludedChange={(roomId, isIncluded) => updateElectricRoom(roomId, { isIncluded })}
            onElectricKitchenOutputsChange={(includeKitchenOutputs) =>
              updateElectricOptions({ includeKitchenOutputs })
            }
            onElectricSwitchboardChange={(includeSwitchboard) => updateElectricOptions({ includeSwitchboard })}
            onOpenSectionSpec={() => openSectionSpec("electric")}
          />

          <PlumbingSection
            className={getEstimateSectionClassName("estimate-plumbing", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-plumbing")}
            plumbingCompositionItems={plumbingCompositionItems}
            plumbingSummaryItems={plumbingSummaryItems}
            plumbingOptions={plumbingOptions}
            plumbingResult={plumbingResult}
            kitchenSinkPackageLabels={kitchenSinkPackageLabels}
            dishwasherPackageLabels={dishwasherPackageLabels}
            showerPackageLabels={showerPackageLabels}
            getKitchenSinkZonePackageTotal={getKitchenSinkZonePackageTotal}
            getDishwasherZonePackageTotal={getDishwasherZonePackageTotal}
            getShowerZonePackageTotal={getShowerZonePackageTotal}
            getInstallRelocationZoneTotal={getInstallRelocationZoneTotal}
            onIncludeBathroomSetChange={(checked) => updatePlumbingOptions({ includeBathroomSet: checked })}
            onIncludeBathChange={(checked) => updatePlumbingOptions({ includeBath: checked })}
            onIncludeHygienicShowerChange={(checked) => updatePlumbingOptions({ includeHygienicShower: checked })}
            onIncludeElectricTowelRailChange={(checked) => updatePlumbingOptions({ includeElectricTowelRail: checked })}
            onIncludeKitchenSinkChange={(checked) => updatePlumbingOptions({ includeKitchenSink: checked })}
            onKitchenSinkPackageLevelChange={(level) => updatePlumbingOptions({ kitchenSinkPackageLevel: level })}
            onIncludeDishwasherOutputChange={(checked) => updatePlumbingOptions({ includeDishwasherOutput: checked })}
            onDishwasherPackageLevelChange={(level) => updatePlumbingOptions({ dishwasherPackageLevel: level })}
            onIncludeShowerZoneChange={(checked) => updatePlumbingOptions({ includeShowerZone: checked })}
            onShowerPackageLevelChange={(level) => updatePlumbingOptions({ showerPackageLevel: level })}
            onIncludeInstallRelocationChange={(checked) => updatePlumbingOptions({ includeInstallRelocation: checked })}
            onIncludeWasherOutputChange={(checked) => updatePlumbingOptions({ includeWasherOutput: checked })}
            onIncludeWaterNodeChange={(checked) => updatePlumbingOptions({ includeWaterNode: checked })}
            onIncludeLeakProtectionChange={(checked) => updatePlumbingOptions({ includeLeakProtection: checked })}
            onOpenSectionSpec={() => openSectionSpec("plumbing")}
          />

          <DoorsSection
            className={getEstimateSectionClassName("estimate-doors", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-doors")}
            doorCompositionItems={doorCompositionItems}
            doorSummaryItems={doorSummaryItems}
            doorOptions={doorOptions}
            doorsResult={doorsResult}
            doorPackageOptions={doorPackageOptions}
            onPackageTypeChange={(packageType) => updateDoorOptions({ packageType })}
            onIncludeHandlesChange={(checked) => updateDoorOptions({ includeHandles: checked })}
            onIncludePrivacyLocksChange={(checked) => updateDoorOptions({ includePrivacyLocks: checked })}
            onIncludeLogisticsChange={(checked) => updateDoorOptions({ includeLogistics: checked })}
            onIncludeInstallationChange={(checked) => updateDoorOptions({ includeInstallation: checked })}
            onOpenSectionSpec={() => openSectionSpec("doors")}
          />

          <CompletionSection
            className={getEstimateSectionClassName("estimate-completion", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-completion")}
            completionOptions={completionOptions}
            completionResult={completionResult}
            completionSummaryItems={completionSummaryItems}
            numberFieldProps={estimateNumericFieldProps}
            onIncludeKitchenBaseChange={(checked) => updateCompletionOptions({ includeKitchenBase: checked })}
            onKitchenLengthMetersChange={(value) =>
              updateCompletionOptions({ kitchenLengthMeters: sanitizeEstimateDecimalInput(value) })
            }
            onKitchenLengthMetersBlur={(value) =>
              updateCompletionOptions({ kitchenLengthMeters: normalizeEstimateDecimalOnBlur(value) })
            }
            onIncludeKitchenAppliancePenalChange={(checked) =>
              updateCompletionOptions({ includeKitchenAppliancePenal: checked })
            }
            onIncludeKitchenFridgePenalChange={(checked) =>
              updateCompletionOptions({ includeKitchenFridgePenal: checked })
            }
            onIncludeWardrobeChange={(checked) => updateCompletionOptions({ includeWardrobe: checked })}
            onIncludeBathroomFurnitureChange={(checked) =>
              updateCompletionOptions({ includeBathroomFurniture: checked })
            }
            onOpenSectionSpec={() => openSectionSpec("completion")}
          />

          <AppliancesSection
            className={getEstimateSectionClassName("estimate-appliances", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-appliances")}
            appliancesOptions={appliancesOptions}
            appliancesSummaryItems={appliancesSummaryItems}
            appliancesResult={appliancesResult}
            numberFieldProps={estimateNumericFieldProps}
            getUnitPrice={(key) => getApplianceUnitPrice(key, appliancesOptions)}
            getLineTotal={(key, isIncluded, quantity) => {
              const unitPrice = getApplianceUnitPrice(key, appliancesOptions);
              return isIncluded ? unitPrice * Math.max(1, parseEstimateInteger(quantity)) : 0;
            }}
            onPackageLevelChange={(level) => updateAppliancesOptions({ packageLevel: level })}
            onFridgeVariantChange={(variant) => updateAppliancesOptions({ fridgeVariant: variant })}
            onApplianceIncludeChange={(key, checked) => updateApplianceItem(key, { isIncluded: checked })}
            onQuantityChange={(key, value) =>
              updateApplianceItem(key, { quantity: sanitizeEstimateIntegerInput(value) })
            }
            onQuantityBlur={(key, value) =>
              updateApplianceItem(key, { quantity: normalizeEstimateQuantityOnBlur(value) })
            }
            onOpenSectionSpec={() => openSectionSpec("appliances")}
          />

          <LooseFurnitureSection
            className={getEstimateSectionClassName("estimate-loose-furniture", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-loose-furniture")}
            looseFurnitureOptions={looseFurnitureOptions}
            looseFurnitureSummaryItems={looseFurnitureSummaryItems}
            looseFurnitureResult={looseFurnitureResult}
            numberFieldProps={estimateNumericFieldProps}
            getUnitPrice={(key) => getLooseFurnitureUnitPrice(key, looseFurnitureOptions)}
            getLineTotal={(key, isIncluded, quantity) => {
              const unitPrice = getLooseFurnitureUnitPrice(key, looseFurnitureOptions);
              return isIncluded ? unitPrice * Math.max(1, parseEstimateInteger(quantity)) : 0;
            }}
            onPackageLevelChange={(level) => updateLooseFurnitureOptions({ packageLevel: level })}
            onLooseFurnitureIncludeChange={(key, checked) => updateLooseFurnitureItem(key, { isIncluded: checked })}
            onQuantityChange={(key, value) =>
              updateLooseFurnitureItem(key, { quantity: sanitizeEstimateIntegerInput(value) })
            }
            onQuantityBlur={(key, value) =>
              updateLooseFurnitureItem(key, { quantity: normalizeEstimateQuantityOnBlur(value) })
            }
            onOpenSectionSpec={() => openSectionSpec("loose_furniture")}
          />

          <HomeGoodsSection
            className={getEstimateSectionClassName("estimate-home-goods", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-home-goods")}
            floorArea={totals.floorArea}
            homeGoodsOptions={homeGoodsOptions}
            homeGoodsSummaryItems={homeGoodsSummaryItems}
            homeGoodsResult={homeGoodsResult}
            onIncludeCleaningChange={(checked) => updateHomeGoodsOptions({ includeCleaning: checked })}
            onIncludeHomeGoodsChange={(checked) => updateHomeGoodsOptions({ includeHomeGoods: checked })}
            onPackageLevelChange={(level) => updateHomeGoodsOptions({ packageLevel: level })}
            onOpenSectionSpec={() => openSectionSpec("home_goods")}
          />

          <CostsSection
            className={getEstimateSectionClassName("estimate-costs", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-costs")}
            estimateTotalItems={estimateTotalItems}
            estimateResult={estimateResult}
            onOpenFullSpec={openFullSpec}
          />

          <EstimateActions />
        </div>

        <EstimatePassportSidebar
          summaryItems={summaryItems}
          estimateResult={estimateResult}
          packageClassification={packageClassification}
          onPrintVolumes={handlePrintVolumes}
          onOpenFullSpec={openFullSpec}
          onPrintEstimate={handlePrintEstimate}
        />
      </section>

      <EstimateMobileTotal
        total={estimateResult.totals.total}
        pricePerSquareMeter={estimateResult.totals.pricePerSquareMeter}
        onNavigateToCosts={() => scrollToEstimateSection("estimate-costs")}
      />

      <EstimateVolumesPrint summaryItems={summaryItems} />

      <EstimateSpecModal data={specModalData} onClose={closeSpecModal} />
    </main>
  );
}
