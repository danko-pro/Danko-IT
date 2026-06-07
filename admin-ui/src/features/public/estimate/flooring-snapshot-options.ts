import type { EstimateRoomType } from "../public-estimate-geometry";
import type {
  FlooringCoveringType,
  FlooringLayoutType,
  FlooringPlinthType,
  FlooringPreparationType,
} from "../public-estimate-flooring";
import {
  getPackageBackedFlooringRows,
  isFlooringLegacyV1,
  loadFlooringSnapshot,
} from "../public-flooring-snapshot";

export type FlooringSelectOption<T extends string = string> = { value: T; label: string };

/** Legacy flooring-v1 hardcoded dropdown options when snapshot is unavailable. */
export const FALLBACK_FLOORING_COVERING_OPTIONS: FlooringSelectOption<FlooringCoveringType>[] = [
  { value: "porcelain", label: "Керамогранит" },
  { value: "quartz_vinyl", label: "Кварцвинил" },
  { value: "laminate", label: "Ламинат" },
  { value: "carpet", label: "Ковролин" },
  { value: "engineered_wood", label: "Инженерная доска" },
];

export const FALLBACK_FLOORING_PREPARATION_OPTIONS: FlooringSelectOption<FlooringPreparationType>[] = [
  { value: "none", label: "Без подготовки" },
  { value: "primer", label: "Грунтование" },
  { value: "self_leveling", label: "Наливной пол" },
  { value: "waterproofing", label: "Гидроизоляция" },
];

export const FALLBACK_FLOORING_LAYOUT_OPTIONS: FlooringSelectOption<FlooringLayoutType>[] = [
  { value: "straight", label: "Прямая" },
  { value: "large_format_straight", label: "Крупный формат" },
  { value: "glue", label: "Клеевая" },
  { value: "floating", label: "Плавающая" },
];

export const FALLBACK_FLOORING_PLINTH_OPTIONS: FlooringSelectOption<FlooringPlinthType>[] = [
  { value: "none", label: "Без плинтуса" },
  { value: "duropolymer", label: "Дюрополимерный" },
  { value: "painted_mdf", label: "МДФ окрашенный" },
];

function buildOptionsFromSnapshotItems<T extends { code: string; title: string }>(
  items: T[] | undefined,
  legacyFallback: FlooringSelectOption[],
  useLegacyFallback: boolean,
): FlooringSelectOption[] {
  if (!items?.length) {
    return useLegacyFallback ? legacyFallback : [];
  }

  const options = items.map((item) => ({ value: item.code, label: item.title }));

  return options.length > 0 ? options : useLegacyFallback ? legacyFallback : [];
}

type LoadedSnapshotOptions = {
  coverings: ReturnType<typeof getPackageBackedFlooringRows>["coverings"];
  preparations: ReturnType<typeof getPackageBackedFlooringRows>["preparations"];
  layouts: ReturnType<typeof getPackageBackedFlooringRows>["layouts"];
  plinthTypes: ReturnType<typeof loadFlooringSnapshot>["plinthTypes"];
  useLegacyFallback: boolean;
};

function tryLoadSnapshotOptions(): LoadedSnapshotOptions | null {
  try {
    const snapshot = loadFlooringSnapshot();
    const packageBacked = getPackageBackedFlooringRows(snapshot);

    return {
      ...packageBacked,
      plinthTypes: snapshot.plinthTypes,
      useLegacyFallback: isFlooringLegacyV1(snapshot.version),
    };
  } catch {
    return null;
  }
}

export function getFlooringCoveringOptions(): FlooringSelectOption[] {
  const snapshotItems = tryLoadSnapshotOptions();
  return buildOptionsFromSnapshotItems(
    snapshotItems?.coverings,
    FALLBACK_FLOORING_COVERING_OPTIONS,
    snapshotItems?.useLegacyFallback ?? false,
  );
}

export function getFlooringPreparationOptions(): FlooringSelectOption[] {
  const snapshotItems = tryLoadSnapshotOptions();
  return buildOptionsFromSnapshotItems(
    snapshotItems?.preparations,
    FALLBACK_FLOORING_PREPARATION_OPTIONS,
    snapshotItems?.useLegacyFallback ?? false,
  );
}

export function getFlooringLayoutOptions(): FlooringSelectOption[] {
  const snapshotItems = tryLoadSnapshotOptions();
  return buildOptionsFromSnapshotItems(
    snapshotItems?.layouts,
    FALLBACK_FLOORING_LAYOUT_OPTIONS,
    snapshotItems?.useLegacyFallback ?? false,
  );
}

export function getFlooringPlinthOptions(): FlooringSelectOption[] {
  const snapshotItems = tryLoadSnapshotOptions();
  return buildOptionsFromSnapshotItems(
    snapshotItems?.plinthTypes,
    FALLBACK_FLOORING_PLINTH_OPTIONS,
    snapshotItems?.useLegacyFallback ?? true,
  );
}

function pickPreferredOrFirst(preferred: string, options: FlooringSelectOption[]): string {
  const available = new Set(options.map((option) => option.value));

  if (available.has(preferred)) {
    return preferred;
  }

  return options[0]?.value ?? preferred;
}

function isTileLikeCovering(coveringType: string): boolean {
  if (coveringType === "porcelain") {
    return true;
  }

  const normalized = coveringType.toLowerCase();
  return normalized.includes("keram") || normalized.includes("plitka") || normalized.includes("tile");
}

function preferredLayoutForCovering(coveringType: string): string {
  if (isTileLikeCovering(coveringType)) {
    return "large_format_straight";
  }

  if (coveringType === "carpet" || coveringType === "engineered_wood") {
    return "glue";
  }

  if (coveringType === "laminate") {
    return "floating";
  }

  return "straight";
}

function preferredCoveringForRoomType(roomType: EstimateRoomType): string {
  if (roomType === "living_room") {
    return "carpet";
  }

  if (roomType === "other") {
    return "quartz_vinyl";
  }

  return "porcelain";
}

function preferredPreparationForRoomType(roomType: EstimateRoomType): string {
  return roomType === "living_room" ? "self_leveling" : "primer";
}

export function getDefaultFlooringCovering(roomType: EstimateRoomType): FlooringCoveringType {
  return pickPreferredOrFirst(
    preferredCoveringForRoomType(roomType),
    getFlooringCoveringOptions(),
  ) as FlooringCoveringType;
}

export function getDefaultFlooringPreparation(roomType: EstimateRoomType): FlooringPreparationType {
  return pickPreferredOrFirst(
    preferredPreparationForRoomType(roomType),
    getFlooringPreparationOptions(),
  ) as FlooringPreparationType;
}

export function getDefaultFlooringLayout(coveringType: FlooringCoveringType): FlooringLayoutType {
  return pickPreferredOrFirst(
    preferredLayoutForCovering(coveringType),
    getFlooringLayoutOptions(),
  ) as FlooringLayoutType;
}

export function getDefaultFlooringPlinth(): FlooringPlinthType {
  return pickPreferredOrFirst("duropolymer", getFlooringPlinthOptions()) as FlooringPlinthType;
}
