import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  looseFurnitureGroupLabels,
  looseFurnitureItemCatalog,
  type LooseFurnitureItemKey,
  type LooseFurnitureOptions,
} from "./public-estimate-loose-furniture";
import { calculateHomeGoods, createDefaultHomeGoodsOptions, type HomeGoodsOptions } from "./public-estimate-home-goods";
import { calculateDoors, type DoorOptions } from "./public-estimate-doors";
import { calculateElectric, type ElectricOptions } from "./public-estimate-electric";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  parseEstimateInteger,
} from "./public-estimate-geometry";
import {
  estimateNumericFieldProps,
  estimateTextFieldProps,
  normalizeEstimateCeilingHeightOnBlur,
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
  GEOMETRY_ROW_REMOVE_MS,
  GEOMETRY_STEP_HINT,
  getDefaultCeilingLightSettings,
  getDefaultFlooringCovering,
  getDefaultFlooringLayout,
  getDefaultFlooringPreparation,
  getDefaultWallsCovering,
  getDefaultWallsPreparation,
  initialRooms,
  wallsCoveringOptions,
  wallsPreparationOptions,
} from "./estimate/defaults";
import {
  buildNewRoomName,
  inferRoomTypeFromName,
  normalizeAppliancesOptionsDraft,
  normalizeEstimateRoomDraft,
  normalizeLooseFurnitureOptionsDraft,
  normalizeRoom,
  type AppliancesOptionsDraft,
  type CeilingRoomDraft,
  type CompletionOptionsDraft,
  type ElectricRoomDraft,
  type EstimateObjectMeta,
  type EstimateRoomDraft,
  type FlooringOptionsDraft,
  type FlooringRoomDraft,
  type LooseFurnitureOptionsDraft,
  type WallsRoomDraft,
  type WarmFloorRoomDraft,
} from "./estimate/context";
import { formatMeasurement, formatMoney } from "./estimate/format";
import { buildEstimateSpecModalData } from "./estimate/spec";
import {
  ESTIMATE_INITIAL_SECTION_ID,
  ESTIMATE_SCROLL_SPY_SECTION_IDS,
  estimateNavigationItems,
  formatEstimateStep,
  getEstimateSectionClassName,
} from "./sections/registry";
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

function getGeometryRowRemoveDelayMs(): number {
  if (typeof window === "undefined") {
    return GEOMETRY_ROW_REMOVE_MS;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GEOMETRY_ROW_REMOVE_MS;
}

function prefersReducedEstimateMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const ESTIMATE_PAGE_BOTTOM_THRESHOLD_PX = 96;
const ESTIMATE_SCROLL_ACTIVATION_LINE_DESKTOP_PX = 96;
const ESTIMATE_SCROLL_ACTIVATION_LINE_MOBILE_PX = 64;
const ESTIMATE_MOBILE_BREAKPOINT_QUERY = "(max-width: 1180px)";

function getEstimateScrollActivationLinePx(): number {
  return window.matchMedia(ESTIMATE_MOBILE_BREAKPOINT_QUERY).matches
    ? ESTIMATE_SCROLL_ACTIVATION_LINE_MOBILE_PX
    : ESTIMATE_SCROLL_ACTIVATION_LINE_DESKTOP_PX;
}
const ESTIMATE_PROGRAMMATIC_SCROLL_MAX_MS = 3000;
const ESTIMATE_PROGRAMMATIC_SCROLL_REDUCED_MOTION_MAX_MS = 150;
const ESTIMATE_SCROLL_STABILIZE_FRAMES = 4;
const ESTIMATE_SCROLL_STABILIZE_PX = 2;
const ESTIMATE_USER_SCROLL_CANCEL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

type EstimateNavigationScrollLock = {
  targetSectionId: string;
  cleanup: () => void;
};

function releaseEstimateNavigationScrollLock(
  lockRef: { current: EstimateNavigationScrollLock | null },
) {
  const lock = lockRef.current;

  if (!lock) {
    return;
  }

  lock.cleanup();
  lockRef.current = null;
}

function pickActiveEstimateSectionByScrollLine(
  sections: HTMLElement[],
  activationLinePx: number,
): string {
  let activeId = sections[0]?.id ?? ESTIMATE_INITIAL_SECTION_ID;

  for (const section of sections) {
    if (section.getBoundingClientRect().top <= activationLinePx) {
      activeId = section.id;
    }
  }

  return activeId;
}

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

function createEstimateRoom(existingRooms: EstimateRoomDraft[]): EstimateRoomDraft {
  return normalizeEstimateRoomDraft({
    id: `room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: buildNewRoomName(existingRooms),
    type: "other",
    area: "",
    doorCount: "1",
    windowCount: "0",
  });
}

export function PublicEstimate() {
  const [objectMeta, setObjectMeta] = useState<EstimateObjectMeta>({
    address: "",
    complexName: "",
    apartmentNumber: "",
    contact: "",
  });
  const [ceilingHeightInput, setCeilingHeightInput] = useState("2.7");
  const [rooms, setRooms] = useState<EstimateRoomDraft[]>(() => initialRooms.map(normalizeEstimateRoomDraft));
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
  const [isMobileVolumesExpanded, setIsMobileVolumesExpanded] = useState(false);
  const [activeEstimateSection, setActiveEstimateSection] = useState(ESTIMATE_INITIAL_SECTION_ID);
  const estimateRailScrollRef = useRef<HTMLElement>(null);
  const navigationScrollTargetRef = useRef<EstimateNavigationScrollLock | null>(null);
  const pendingAddedRoomIdRef = useRef<string | null>(null);
  const geometryRemoveTimeoutsRef = useRef<Record<string, number>>({});
  const [enteringRoomIds, setEnteringRoomIds] = useState<string[]>([]);
  const [removingRoomIds, setRemovingRoomIds] = useState<string[]>([]);

  const ceilingHeight = useMemo(() => parseEstimateDecimal(ceilingHeightInput), [ceilingHeightInput]);
  const roomInputs = useMemo(() => rooms.map(normalizeRoom), [rooms]);
  const roomGeometries = useMemo(
    () => roomInputs.map((room) => calculateEstimateRoomGeometry(room, ceilingHeight)),
    [roomInputs, ceilingHeight],
  );
  const totals = useMemo(() => calculateEstimateGeometryTotals(roomGeometries), [roomGeometries]);
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

  const summaryItems = [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(totals.plinthLength, "м") },
  ];
  const compactVolumeItems = summaryItems.filter((item) =>
    ["Площадь пола", "Стены к отделке", "Потолки"].includes(item.label),
  );
  const estimateTotalItems = [
    { label: "Работы", value: formatMoney(estimateResult.totals.works) },
    { label: "Материалы", value: formatMoney(estimateResult.totals.materials) },
    { label: "Оборудование", value: formatMoney(estimateResult.totals.equipment) },
    { label: "Расходники", value: formatMoney(estimateResult.totals.consumables) },
    { label: "Итого", value: formatMoney(estimateResult.totals.total), isStrong: true },
    { label: "₽/м²", value: `${formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²` },
  ];
  const packageClassification = classifyEstimatePackage(estimateResult.totals.pricePerSquareMeter);
  const scrollToEstimateSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    releaseEstimateNavigationScrollLock(navigationScrollTargetRef);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const activationLinePx = getEstimateScrollActivationLinePx();
    const targetTop = Math.max(0, section.getBoundingClientRect().top + window.scrollY - activationLinePx);

    setActiveEstimateSection(sectionId);

    const cleanups: Array<() => void> = [];
    let released = false;

    const releaseLock = () => {
      if (released) {
        return;
      }

      released = true;
      cleanups.forEach((cleanup) => cleanup());

      if (navigationScrollTargetRef.current?.targetSectionId === sectionId) {
        navigationScrollTargetRef.current = null;
      }
    };

    const cancelLockForUserScroll = () => {
      releaseLock();
    };

    const handleUserScrollKeydown = (event: KeyboardEvent) => {
      if (ESTIMATE_USER_SCROLL_CANCEL_KEYS.has(event.key)) {
        cancelLockForUserScroll();
      }
    };

    window.addEventListener("wheel", cancelLockForUserScroll, { passive: true });
    window.addEventListener("touchstart", cancelLockForUserScroll, { passive: true });
    window.addEventListener("keydown", handleUserScrollKeydown);
    cleanups.push(() => {
      window.removeEventListener("wheel", cancelLockForUserScroll);
      window.removeEventListener("touchstart", cancelLockForUserScroll);
      window.removeEventListener("keydown", handleUserScrollKeydown);
    });

    const onScrollEnd = () => {
      releaseLock();
    };

    const scrollEndSupported = "onscrollend" in window;

    if (scrollEndSupported) {
      window.addEventListener("scrollend", onScrollEnd, { once: true });
      cleanups.push(() => window.removeEventListener("scrollend", onScrollEnd));
    } else {
      let lastScrollY = window.scrollY;
      let stableFrames = 0;
      let stabilizeFrameId = 0;

      const checkScrollStable = () => {
        if (released) {
          return;
        }

        const currentScrollY = window.scrollY;

        if (Math.abs(currentScrollY - lastScrollY) <= ESTIMATE_SCROLL_STABILIZE_PX) {
          stableFrames += 1;

          if (stableFrames >= ESTIMATE_SCROLL_STABILIZE_FRAMES) {
            releaseLock();
            return;
          }
        } else {
          stableFrames = 0;
          lastScrollY = currentScrollY;
        }

        stabilizeFrameId = window.requestAnimationFrame(checkScrollStable);
      };

      stabilizeFrameId = window.requestAnimationFrame(checkScrollStable);
      cleanups.push(() => {
        if (stabilizeFrameId) {
          window.cancelAnimationFrame(stabilizeFrameId);
        }
      });
    }

    const maxLockMs = prefersReducedMotion
      ? ESTIMATE_PROGRAMMATIC_SCROLL_REDUCED_MOTION_MAX_MS
      : ESTIMATE_PROGRAMMATIC_SCROLL_MAX_MS;
    const timeoutId = window.setTimeout(releaseLock, maxLockMs);

    cleanups.push(() => window.clearTimeout(timeoutId));

    navigationScrollTargetRef.current = {
      targetSectionId: sectionId,
      cleanup: releaseLock,
    };

    window.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (prefersReducedMotion) {
      window.requestAnimationFrame(() => {
        releaseLock();
      });
    }
  }, []);

  const isEstimatePageBottom = useCallback(() => {
    return (
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - ESTIMATE_PAGE_BOTTOM_THRESHOLD_PX
    );
  }, []);

  useEffect(() => {
    const sections = ESTIMATE_SCROLL_SPY_SECTION_IDS.map((sectionId) => document.getElementById(sectionId)).filter(
      (section): section is HTMLElement => Boolean(section),
    );

    if (!sections.length) {
      return;
    }

    let frameId = 0;

    const updateActiveSection = () => {
      const navigationScrollTarget = navigationScrollTargetRef.current;

      if (navigationScrollTarget) {
        setActiveEstimateSection((current) =>
          current === navigationScrollTarget.targetSectionId
            ? current
            : navigationScrollTarget.targetSectionId,
        );
        return;
      }

      if (isEstimatePageBottom()) {
        setActiveEstimateSection((current) => (current === "estimate-costs" ? current : "estimate-costs"));
        return;
      }

      const nextSectionId = pickActiveEstimateSectionByScrollLine(
        sections,
        getEstimateScrollActivationLinePx(),
      );

      setActiveEstimateSection((current) => (current === nextSectionId ? current : nextSectionId));
    };

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      releaseEstimateNavigationScrollLock(navigationScrollTargetRef);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isEstimatePageBottom]);

  useEffect(() => {
    const railScroll = estimateRailScrollRef.current;

    if (!railScroll) {
      return;
    }

    const activeLink = railScroll.querySelector<HTMLAnchorElement>(`a[href="#${activeEstimateSection}"]`);

    if (!activeLink) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const isHorizontalRail = window.matchMedia("(max-width: 1180px)").matches;

    if (isHorizontalRail) {
      activeLink.scrollIntoView({
        behavior: scrollBehavior,
        block: "nearest",
        inline: "center",
      });
      return;
    }

    const railRect = railScroll.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const edgePadding = 10;

    if (linkRect.top >= railRect.top + edgePadding && linkRect.bottom <= railRect.bottom - edgePadding) {
      return;
    }

    const linkTop = linkRect.top - railRect.top + railScroll.scrollTop;
    const targetTop = linkTop - (railScroll.clientHeight - activeLink.offsetHeight) / 2;

    railScroll.scrollTo({
      top: Math.max(0, targetTop),
      behavior: scrollBehavior,
    });
  }, [activeEstimateSection]);

  useEffect(() => {
    return () => {
      Object.values(geometryRemoveTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useLayoutEffect(() => {
    if (!enteringRoomIds.length) {
      return;
    }

    if (prefersReducedEstimateMotion()) {
      setEnteringRoomIds([]);
      return;
    }

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        setEnteringRoomIds([]);
      });
    });

    return () => {
      if (outerFrame) {
        window.cancelAnimationFrame(outerFrame);
      }

      if (innerFrame) {
        window.cancelAnimationFrame(innerFrame);
      }
    };
  }, [enteringRoomIds]);

  useEffect(() => {
    const roomId = pendingAddedRoomIdRef.current;

    if (!roomId) {
      return;
    }

    const row = document.querySelector<HTMLElement>(`[data-estimate-room-id="${roomId}"]`);

    if (!row) {
      return;
    }

    pendingAddedRoomIdRef.current = null;

    const nameInput = row.querySelector<HTMLInputElement>(".public-estimate-room-name input");
    const prefersReducedMotion = prefersReducedEstimateMotion();

    nameInput?.focus({ preventScroll: true });
    nameInput?.select();
    row.scrollIntoView({
      block: prefersReducedMotion ? "nearest" : "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [rooms]);

  useEffect(() => {
    const railScroll = estimateRailScrollRef.current;

    if (!railScroll) {
      return;
    }

    const horizontalRailQuery = window.matchMedia("(max-width: 1180px)");
    let dragPointerId: number | null = null;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let dragMoved = false;
    let suppressLinkClickUntil = 0;

    const isHorizontalRail = () => horizontalRailQuery.matches;

    const canScrollHorizontally = () => railScroll.scrollWidth > railScroll.clientWidth + 1;

    const handleWheel = (event: WheelEvent) => {
      if (!isHorizontalRail() || !canScrollHorizontally()) {
        return;
      }

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

      if (delta === 0) {
        return;
      }

      railScroll.scrollLeft += delta;
      event.preventDefault();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isHorizontalRail() || event.button !== 0 || !canScrollHorizontally()) {
        return;
      }

      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScrollLeft = railScroll.scrollLeft;
      dragMoved = false;
      railScroll.classList.add("is-dragging");
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      const deltaX = event.clientX - dragStartX;

      if (Math.abs(deltaX) > 4) {
        dragMoved = true;
      }

      railScroll.scrollLeft = dragStartScrollLeft - deltaX;
    };

    const finishDrag = (event: PointerEvent) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      if (dragMoved) {
        suppressLinkClickUntil = Date.now() + 300;
      }

      dragPointerId = null;
      dragMoved = false;
      railScroll.classList.remove("is-dragging");
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (Date.now() < suppressLinkClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    railScroll.addEventListener("wheel", handleWheel, { passive: false });
    railScroll.addEventListener("pointerdown", handlePointerDown);
    railScroll.addEventListener("pointermove", handlePointerMove);
    railScroll.addEventListener("pointerup", finishDrag);
    railScroll.addEventListener("pointercancel", finishDrag);
    railScroll.addEventListener("click", handleClickCapture, true);

    return () => {
      railScroll.removeEventListener("wheel", handleWheel);
      railScroll.removeEventListener("pointerdown", handlePointerDown);
      railScroll.removeEventListener("pointermove", handlePointerMove);
      railScroll.removeEventListener("pointerup", finishDrag);
      railScroll.removeEventListener("pointercancel", finishDrag);
      railScroll.removeEventListener("click", handleClickCapture, true);
      railScroll.classList.remove("is-dragging");
    };
  }, []);

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
  const warmFloorSummaryItems =
    warmFloorMode === "water"
      ? [
          { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
          { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
          { label: "Труба", value: formatMeasurement(warmFloorResult.pipeMeters, "м") },
          { label: "Контуры", value: `${warmFloorResult.circuitCount} шт.` },
          { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
          { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
          { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
        ]
      : [
          { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
          { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
          { label: "Терморегулятор", value: `${warmFloorResult.thermostatCount} шт.` },
          { label: "Автомат в щит", value: `${warmFloorResult.electricBreakerCount} шт.` },
          { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
          { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
          { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
      ];
  const flooringSummaryItems = [
    { label: "Площадь пола", value: formatMeasurement(flooringResult.flooringArea, "м²") },
    { label: "Площадь материалов", value: formatMeasurement(flooringResult.purchaseArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(flooringResult.plinthLength, "м") },
    { label: "Работы", value: formatMoney(flooringResult.worksTotal) },
    { label: "Материалы", value: formatMoney(flooringResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(flooringResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(flooringResult.total), isStrong: true },
  ];
  const wallsSummaryItems = [
    { label: "Площадь стен", value: formatMeasurement(wallsResult.wallFinishArea, "м²") },
    { label: "Площадь материалов", value: formatMeasurement(wallsResult.purchaseArea, "м²") },
    { label: "Работы", value: formatMoney(wallsResult.worksTotal) },
    { label: "Материалы", value: formatMoney(wallsResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(wallsResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(wallsResult.total), isStrong: true },
  ];
  const ceilingSummaryItems = [
    { label: "Площадь потолков", value: formatMeasurement(ceilingResult.ceilingArea, "м²") },
    { label: "Точки света", value: `${ceilingResult.pointCount} шт.` },
    { label: "Работы", value: formatMoney(ceilingResult.worksTotal) },
    { label: "Материалы", value: formatMoney(ceilingResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(ceilingResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(ceilingResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(ceilingResult.total), isStrong: true },
  ];
  const electricSummaryItems = [
    { label: "Розетки", value: `${electricResult.socketCount} шт.` },
    { label: "Световые выводы", value: `${electricResult.lightOutputCount} шт.` },
    { label: "Выключатели", value: `${electricResult.switchCount} шт.` },
    { label: "Кухонные выводы", value: `${electricResult.kitchenOutputCount} шт.` },
    { label: "Щит / автоматика", value: `${electricResult.switchboardAutomationCount} поз.` },
    { label: "Работы", value: formatMoney(electricResult.worksTotal) },
    { label: "Материалы", value: formatMoney(electricResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(electricResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(electricResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(electricResult.total), isStrong: true },
  ];
  const plumbingCompositionItems = [
    { label: "Санузлов", value: `${plumbingResult.bathroomCount} шт.` },
    { label: "Кухня", value: plumbingResult.hasKitchen ? "да" : "нет" },
    { label: "ХВС", value: `${plumbingResult.coldWaterPoints} точ.` },
    { label: "ГВС", value: `${plumbingResult.hotWaterPoints} точ.` },
    { label: "Канализация", value: `${plumbingResult.sewerPoints} точ.` },
  ];
  // A8.2: разбивка по категориям (Работы/Материалы/Оборудование/Расходники) удалена из публичного
  // UI сантехники — зоны снапшота отдают единый запечённый итог без разложения себестоимости (whitelist).
  const plumbingSummaryItems = [
    { label: "ХВС точки", value: `${plumbingResult.coldWaterPoints} точ.` },
    { label: "ГВС точки", value: `${plumbingResult.hotWaterPoints} точ.` },
    { label: "Канализация", value: `${plumbingResult.sewerPoints} точ.` },
    { label: "Приборы", value: `${plumbingResult.fixtureCount} шт.` },
    { label: "Итого", value: formatMoney(plumbingResult.total), isStrong: true },
  ];
  const doorCompositionItems = [
    { label: "Дверей", value: `${doorsResult.totalDoorCount} шт.` },
    { label: "Санузловых заверток", value: `${doorsResult.privacyLockCount} шт.` },
    { label: "Пакет", value: doorsResult.packageLabel },
    { label: "Монтаж", value: doorOptions.includeInstallation ? "да" : "нет" },
    { label: "Логистика", value: doorOptions.includeLogistics ? "да" : "нет" },
  ];
  const doorSummaryItems = [
    { label: "Двери", value: `${doorsResult.totalDoorCount} шт.` },
    { label: "Ручки", value: `${doorsResult.handleCount} шт.` },
    { label: "Завертки", value: `${doorsResult.privacyLockCount} шт.` },
    { label: "Доставка / подъём", value: formatMoney(doorsResult.logisticsTotal) },
    { label: "Работы", value: formatMoney(doorsResult.worksTotal) },
    { label: "Материалы", value: formatMoney(doorsResult.materialsTotal) },
    { label: "Фурнитура", value: formatMoney(doorsResult.hardwareTotal) },
    { label: "Доп. расходы", value: formatMoney(doorsResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(doorsResult.total), isStrong: true },
  ];
  const completionSummaryItems = [
    { label: "Кухня", value: formatMoney(completionResult.kitchenTotal) },
    { label: "Мебель", value: formatMoney(completionResult.furnitureTotal) },
    { label: "Компонентов включено", value: `${completionResult.includedComponentCount} шт.` },
    { label: "Итого", value: formatMoney(completionResult.total), isStrong: true },
  ];
  const appliancesSummaryItems = [
    { label: "Пакет", value: appliancesResult.packageLabel },
    { label: "Позиции включены", value: `${appliancesResult.includedItemCount} шт.` },
    { label: "Кухонная техника", value: formatMoney(appliancesResult.kitchenAppliancesTotal) },
    { label: "TV-зона", value: formatMoney(appliancesResult.tvTotal) },
    { label: "Стирка", value: formatMoney(appliancesResult.laundryTotal) },
    { label: "Итого", value: formatMoney(appliancesResult.total), isStrong: true },
  ];
  const looseFurnitureSummaryItems = [
    { label: "Пакет", value: looseFurnitureResult.packageLabel },
    { label: "Позиции включены", value: `${looseFurnitureResult.includedItemCount} шт.` },
    { label: looseFurnitureGroupLabels.dining, value: formatMoney(looseFurnitureResult.diningTotal) },
    { label: looseFurnitureGroupLabels.living, value: formatMoney(looseFurnitureResult.livingTotal) },
    { label: looseFurnitureGroupLabels.bedroom, value: formatMoney(looseFurnitureResult.bedroomTotal) },
    { label: looseFurnitureGroupLabels.loggia, value: formatMoney(looseFurnitureResult.loggiaTotal) },
    { label: looseFurnitureGroupLabels.work, value: formatMoney(looseFurnitureResult.workTotal) },
    { label: looseFurnitureGroupLabels.storage, value: formatMoney(looseFurnitureResult.storageTotal) },
    { label: looseFurnitureGroupLabels.hall, value: formatMoney(looseFurnitureResult.hallTotal) },
    { label: "Итого", value: formatMoney(looseFurnitureResult.total), isStrong: true },
  ];
  const homeGoodsSummaryItems = [
    { label: "Уборка", value: formatMoney(homeGoodsResult.cleaningTotal) },
    { label: "Товары для дома", value: formatMoney(homeGoodsResult.homeGoodsTotal) },
    { label: "Пакет", value: homeGoodsResult.packageLabel },
    { label: "Итого", value: formatMoney(homeGoodsResult.total), isStrong: true },
  ];
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

  function updateRoom(roomId: string, patch: Partial<EstimateRoomDraft>) {
    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.id !== roomId) {
          return room;
        }

        const nextRoom = normalizeEstimateRoomDraft({ ...room, ...patch });

        if ("name" in patch) {
          const inferredType = inferRoomTypeFromName(nextRoom.name);

          if (inferredType !== null) {
            nextRoom.type = inferredType;
          }
        }

        return nextRoom;
      }),
    );
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

  function purgeRoomFromRelatedState(roomId: string) {
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
  }

  function finalizeRoomRemove(roomId: string) {
    setRooms((currentRooms) =>
      currentRooms.length > 1 ? currentRooms.filter((room) => room.id !== roomId) : currentRooms,
    );
    purgeRoomFromRelatedState(roomId);
    setRemovingRoomIds((current) => current.filter((id) => id !== roomId));
    delete geometryRemoveTimeoutsRef.current[roomId];
  }

  function addRoom() {
    let newRoomId = "";

    setRooms((currentRooms) => {
      const newRoom = createEstimateRoom(currentRooms);

      newRoomId = newRoom.id;
      pendingAddedRoomIdRef.current = newRoom.id;

      return [...currentRooms, newRoom];
    });

    if (!prefersReducedEstimateMotion() && newRoomId) {
      setEnteringRoomIds((current) => (current.includes(newRoomId) ? current : [...current, newRoomId]));
    }
  }

  function removeRoom(roomId: string) {
    if (rooms.length <= 1 || removingRoomIds.includes(roomId)) {
      return;
    }

    const removeDelayMs = getGeometryRowRemoveDelayMs();

    if (removeDelayMs === 0) {
      finalizeRoomRemove(roomId);
      return;
    }

    setRemovingRoomIds((current) => (current.includes(roomId) ? current : [...current, roomId]));

    geometryRemoveTimeoutsRef.current[roomId] = window.setTimeout(() => {
      finalizeRoomRemove(roomId);
    }, removeDelayMs);
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
          onToggleMobileVolumesExpanded={() => setIsMobileVolumesExpanded((expanded) => !expanded)}
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
            onCeilingHeightChange={(event) =>
              setCeilingHeightInput(sanitizeEstimateDecimalInput(event.target.value))
            }
            onCeilingHeightBlur={(event) =>
              setCeilingHeightInput(normalizeEstimateCeilingHeightOnBlur(event.target.value))
            }
            rooms={rooms}
            roomGeometries={roomGeometries}
            enteringRoomIds={enteringRoomIds}
            removingRoomIds={removingRoomIds}
            onRoomNameChange={(roomId, event) => updateRoom(roomId, { name: event.target.value })}
            onRoomAreaChange={(roomId, event) =>
              updateRoom(roomId, { area: sanitizeEstimateDecimalInput(event.target.value) })
            }
            onRoomAreaBlur={(roomId, event) =>
              updateRoom(roomId, { area: normalizeEstimateDecimalOnBlur(event.target.value) })
            }
            onRoomDoorCountChange={(roomId, event) =>
              updateRoom(roomId, { doorCount: sanitizeEstimateIntegerInput(event.target.value) })
            }
            onRoomDoorCountBlur={(roomId, event) =>
              updateRoom(roomId, { doorCount: normalizeEstimateCountOnBlur(event.target.value) })
            }
            onRoomWindowCountChange={(roomId, event) =>
              updateRoom(roomId, { windowCount: sanitizeEstimateIntegerInput(event.target.value) })
            }
            onRoomWindowCountBlur={(roomId, event) =>
              updateRoom(roomId, { windowCount: normalizeEstimateCountOnBlur(event.target.value) })
            }
            onRemoveRoom={removeRoom}
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
