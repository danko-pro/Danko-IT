import { openingTypeOptions } from "../shared";
import { estimateOpeningAreaFromDraft } from "./calc";
import type { RoomEditState } from "./model";

export type OpeningState = RoomEditState["openings"][number];

export type OpeningViewModel = {
  opening: OpeningState;
  area: number | null;
  isFilled: boolean;
  typeLabel: string;
};

export const EMPTY_OPENING: OpeningState = {
  opening_type: "window",
  width_m: "",
  height_m: "",
  quantity: "1",
  area_m2: "",
  note: "",
};

export function formatOpeningWord(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return "проём";
  }

  if ([2, 3, 4].includes(remainder10) && ![12, 13, 14].includes(remainder100)) {
    return "проёма";
  }

  return "проёмов";
}

export function buildOpeningViewModels(openings: OpeningState[]): OpeningViewModel[] {
  return openings.map((opening) => ({
    opening,
    area: getOpeningArea(opening),
    isFilled: isOpeningFilled(opening),
    typeLabel: getOpeningTypeLabel(opening.opening_type),
  }));
}

function getOpeningTypeLabel(value: string) {
  return openingTypeOptions.find((option) => option.value === value)?.label ?? "Проём";
}

function getOpeningArea(opening: OpeningState) {
  return estimateOpeningAreaFromDraft(opening);
}

function isOpeningFilled(opening: OpeningState) {
  return Boolean(
    opening.width_m.trim() ||
      opening.height_m.trim() ||
      opening.area_m2.trim() ||
      opening.note.trim() ||
      (opening.quantity.trim() && opening.quantity.trim() !== "1") ||
      opening.opening_type !== "window",
  );
}
