import type { CatalogTableColumnState } from "./useCatalogTableColumns";

export type PlumbingZoneCompositionColumnKey =
  | "id"
  | "title"
  | "unit"
  | "price"
  | "qty"
  | "coef"
  | "total"
  | "actions";

export const PLUMBING_ZONE_COMPOSITION_COLUMNS: PlumbingZoneCompositionColumnKey[] = [
  "id",
  "title",
  "unit",
  "price",
  "qty",
  "coef",
  "total",
  "actions",
];

export const PLUMBING_ZONE_COLUMN_LABELS: Record<PlumbingZoneCompositionColumnKey, string> = {
  id: "ID",
  title: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  unit: "\u0415\u0434.",
  price: "\u0426\u0435\u043d\u0430",
  qty: "\u041a\u043e\u043b-\u0432\u043e",
  coef: "\u041a",
  total: "\u0418\u0442\u043e\u0433\u043e",
  actions: "",
};

export const PLUMBING_ZONE_COLUMN_TITLES: Partial<Record<PlumbingZoneCompositionColumnKey, string>> = {
  price: "\u0426\u0435\u043d\u0430 \u0437\u0430 \u0435\u0434\u0438\u043d\u0438\u0446\u0443",
  coef: "\u041a\u043e\u044d\u0444\u0444\u0438\u0446\u0438\u0435\u043d\u0442",
  actions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
};

export const PLUMBING_ZONE_COLUMN_HEADER_CLASS: Record<PlumbingZoneCompositionColumnKey, string> = {
  id: "ce-zone-table-id",
  title: "",
  unit: "ce-zone-table-unit",
  price: "ce-num",
  qty: "ce-num",
  coef: "ce-num",
  total: "ce-num ce-col-total",
  actions: "ce-col-actions",
};

export const PLUMBING_ZONE_DEFAULT_COLUMNS: Record<PlumbingZoneCompositionColumnKey, CatalogTableColumnState> = {
  id: { align: "left", width: 12 },
  title: { align: "left", width: 40 },
  unit: { align: "center", width: 7 },
  price: { align: "right", width: 10 },
  qty: { align: "right", width: 11 },
  coef: { align: "right", width: 8 },
  total: { align: "right", width: 9 },
  actions: { align: "center", width: 3 },
};

export const PLUMBING_ZONE_MIN_COLUMN_WIDTH: Record<PlumbingZoneCompositionColumnKey, number> = {
  id: 8,
  title: 22,
  unit: 5,
  price: 7,
  qty: 8,
  coef: 6,
  total: 7,
  actions: 3,
};

export const PLUMBING_ZONE_EMPTY_MESSAGE =
  "\u0421\u043e\u0441\u0442\u0430\u0432 \u043f\u0443\u0441\u0442. \u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0438\u0437 \u0431\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0438 \u043d\u0438\u0436\u0435.";
export const PLUMBING_ZONE_VARIANT_SUFFIX =
  "\u0441\u043c\u0435\u0441\u0438\u0442\u0435\u043b\u044c \u0438 \u043c\u043e\u0439\u043a\u0430";
export const PLUMBING_ZONE_ATOMS_LABEL = "\u0410\u0442\u043e\u043c\u044b";
export const PLUMBING_ZONE_RISK_LABEL = "\u0420\u0435\u0437\u0435\u0440\u0432";
export const PLUMBING_ZONE_TOTAL_LABEL = "\u0418\u0442\u043e\u0433\u043e";
