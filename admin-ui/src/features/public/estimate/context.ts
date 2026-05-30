import {
  applianceItemCatalog,
  type ApplianceItemKey,
  type AppliancesOptions,
} from "../public-estimate-appliances";
import type { CompletionOptions } from "../public-estimate-completion";
import {
  type FlooringCoveringType,
  type FlooringLayoutType,
  type FlooringPlinthType,
  type FlooringPreparationType,
} from "../public-estimate-flooring";
import {
  parseEstimateDecimal,
  parseEstimateInteger,
  type EstimateRoomInput,
  type EstimateRoomType,
} from "../public-estimate-geometry";
import {
  looseFurnitureItemCatalog,
  type LooseFurnitureItemKey,
  type LooseFurnitureOptions,
} from "../public-estimate-loose-furniture";
import {
  type WallsCoveringType,
  type WallsPreparationType,
} from "../public-estimate-walls";
import { NEW_ROOM_DEFAULT_NAME, roomTypeOptions, validEstimateRoomTypes } from "./defaults";

export type EstimateObjectMeta = {
  address: string;
  complexName: string;
  apartmentNumber: string;
  contact: string;
};

export type EstimateRoomDraft = Omit<EstimateRoomInput, "area" | "doorCount" | "windowCount"> & {
  area: string;
  doorCount: string;
  windowCount: string;
};

export type WarmFloorRoomDraft = {
  isSelected?: boolean;
  warmFloorArea?: string;
};

export type FlooringRoomDraft = {
  isIncluded?: boolean;
  coveringType?: FlooringCoveringType;
  preparationType?: FlooringPreparationType;
  layoutType?: FlooringLayoutType;
};

export type FlooringOptionsDraft = {
  includePlinth: boolean;
  plinthType: FlooringPlinthType;
  includeThresholds: boolean;
  thresholdCount: string;
  includeDemolition: boolean;
};

export type WallsRoomDraft = {
  isIncluded?: boolean;
  coveringType?: WallsCoveringType;
  preparationType?: WallsPreparationType;
};

export type CeilingRoomDraft = {
  isIncluded?: boolean;
  hasPointLights?: boolean;
};

export type ElectricRoomDraft = {
  isIncluded?: boolean;
};

export type CompletionOptionsDraft = Omit<CompletionOptions, "kitchenLengthMeters"> & {
  kitchenLengthMeters: string;
};

export type AppliancesOptionsDraft = Omit<AppliancesOptions, "items"> & {
  items: Record<ApplianceItemKey, { isIncluded: boolean; quantity: string }>;
};

export type LooseFurnitureOptionsDraft = Omit<LooseFurnitureOptions, "items"> & {
  items: Record<LooseFurnitureItemKey, { isIncluded: boolean; quantity: string }>;
};

export function inferRoomTypeFromName(name: string): EstimateRoomType | null {
  const normalized = name.trim().toLocaleLowerCase("ru-RU");

  if (!normalized) {
    return null;
  }

  const matchedOption = roomTypeOptions.find((option) => option.label.toLocaleLowerCase("ru-RU") === normalized);

  return matchedOption?.value ?? null;
}

export function normalizeEstimateRoomType(type: string | undefined | null): EstimateRoomType {
  if (type && validEstimateRoomTypes.has(type as EstimateRoomType)) {
    return type as EstimateRoomType;
  }

  return "other";
}

export function normalizeEstimateRoomDraft(room: EstimateRoomDraft): EstimateRoomDraft {
  const type = normalizeEstimateRoomType(room.type);
  const inferredType = inferRoomTypeFromName(room.name);

  return {
    ...room,
    type: inferredType ?? type,
  };
}

export function buildNewRoomName(existingRooms: EstimateRoomDraft[]): string {
  const usedNames = new Set(existingRooms.map((room) => room.name.trim().toLocaleLowerCase("ru-RU")));
  const baseName = NEW_ROOM_DEFAULT_NAME;

  if (!usedNames.has(baseName.toLocaleLowerCase("ru-RU"))) {
    return baseName;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseName} ${suffix}`;

    if (!usedNames.has(candidate.toLocaleLowerCase("ru-RU"))) {
      return candidate;
    }
  }

  return `Помещение ${existingRooms.length + 1}`;
}

export function normalizeAppliancesOptionsDraft(draft: AppliancesOptionsDraft): AppliancesOptions {
  const items = {} as AppliancesOptions["items"];

  for (const item of applianceItemCatalog) {
    const itemDraft = draft.items[item.key];
    items[item.key] = {
      isIncluded: itemDraft.isIncluded,
      quantity: Math.max(1, parseEstimateInteger(itemDraft.quantity)),
    };
  }

  return { packageLevel: draft.packageLevel, fridgeVariant: draft.fridgeVariant, items };
}

export function normalizeLooseFurnitureOptionsDraft(draft: LooseFurnitureOptionsDraft): LooseFurnitureOptions {
  const items = {} as LooseFurnitureOptions["items"];

  for (const item of looseFurnitureItemCatalog) {
    const itemDraft = draft.items[item.key];
    items[item.key] = {
      isIncluded: itemDraft.isIncluded,
      quantity: Math.max(1, parseEstimateInteger(itemDraft.quantity)),
    };
  }

  return { packageLevel: draft.packageLevel, items };
}

export function normalizeRoom(room: EstimateRoomDraft): EstimateRoomInput {
  const normalizedDraft = normalizeEstimateRoomDraft(room);

  return {
    ...normalizedDraft,
    area: parseEstimateDecimal(normalizedDraft.area),
    doorCount: parseEstimateDecimal(normalizedDraft.doorCount),
    windowCount: parseEstimateDecimal(normalizedDraft.windowCount),
  };
}
