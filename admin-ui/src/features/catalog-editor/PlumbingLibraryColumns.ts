import type { CatalogTableColumnState } from "./useCatalogTableColumns";

export type PlumbingLibraryColumnKey =
  | "id"
  | "publicTitle"
  | "technicalTitle"
  | "category"
  | "unit"
  | "works"
  | "materials"
  | "equipment"
  | "consumables"
  | "coefficient"
  | "base"
  | "total"
  | "group"
  | "source"
  | "actions";

export const PLUMBING_LIBRARY_COLUMNS: PlumbingLibraryColumnKey[] = [
  "id",
  "publicTitle",
  "technicalTitle",
  "category",
  "unit",
  "works",
  "materials",
  "equipment",
  "consumables",
  "coefficient",
  "base",
  "total",
  "group",
  "source",
  "actions",
];

export const PLUMBING_LIBRARY_COLUMN_LABELS: Record<PlumbingLibraryColumnKey, string> = {
  id: "ID",
  publicTitle: "\u041f\u0443\u0431\u043b.",
  technicalTitle: "\u0422\u0435\u0445. / \u043a\u043e\u043c\u043c.",
  category: "\u041a\u0430\u0442.",
  unit: "\u0415\u0434.",
  works: "\u0420\u0430\u0431.",
  materials: "\u041c\u0430\u0442.",
  equipment: "\u041e\u0431\u043e\u0440.",
  consumables: "\u0420\u0430\u0441\u0445.",
  coefficient: "\u041a",
  base: "\u0411\u0430\u0437\u0430",
  total: "\u0418\u0442\u043e\u0433",
  group: "\u0413\u0440\u0443\u043f\u043f\u0430",
  source: "\u0418\u0441\u0442.",
  actions: "",
};

export const PLUMBING_LIBRARY_COLUMN_TITLES: Partial<Record<PlumbingLibraryColumnKey, string>> = {
  publicTitle: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
  technicalTitle: "\u0422\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 / \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439",
  works: "\u0420\u0430\u0431\u043e\u0442\u0430, \u20bd",
  materials: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b, \u20bd",
  equipment: "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435, \u20bd",
  consumables: "\u0420\u0430\u0441\u0445\u043e\u0434\u043d\u0438\u043a\u0438, \u20bd",
  coefficient: "\u041a\u043e\u044d\u0444\u0444\u0438\u0446\u0438\u0435\u043d\u0442",
  base: "\u0411\u0430\u0437\u0430, \u20bd",
  total: "\u0418\u0442\u043e\u0433\u043e, \u20bd",
  source: "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
  actions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
};

export const PLUMBING_LIBRARY_COLUMN_CLASS: Record<PlumbingLibraryColumnKey, string> = {
  id: "ce-col-id",
  publicTitle: "ce-col-title",
  technicalTitle: "ce-col-tech",
  category: "ce-col-select",
  unit: "ce-col-select",
  works: "ce-col-num",
  materials: "ce-col-num",
  equipment: "ce-col-num",
  consumables: "ce-col-num",
  coefficient: "ce-col-num",
  base: "ce-col-num ce-col-total",
  total: "ce-col-num ce-col-total",
  group: "ce-col-select",
  source: "ce-col-select",
  actions: "ce-col-actions",
};

export const PLUMBING_LIBRARY_DEFAULT_COLUMNS: Record<PlumbingLibraryColumnKey, CatalogTableColumnState> = {
  id: { align: "left", width: 9 },
  publicTitle: { align: "left", width: 13 },
  technicalTitle: { align: "left", width: 14 },
  category: { align: "left", width: 7 },
  unit: { align: "center", width: 4 },
  works: { align: "right", width: 5.5 },
  materials: { align: "right", width: 5.5 },
  equipment: { align: "right", width: 5.5 },
  consumables: { align: "right", width: 5.5 },
  coefficient: { align: "right", width: 4.5 },
  base: { align: "right", width: 5.5 },
  total: { align: "right", width: 5.5 },
  group: { align: "left", width: 7 },
  source: { align: "left", width: 5.5 },
  actions: { align: "center", width: 3 },
};

export const PLUMBING_LIBRARY_MIN_COLUMN_WIDTH: Record<PlumbingLibraryColumnKey, number> = {
  id: 6,
  publicTitle: 9,
  technicalTitle: 10,
  category: 5,
  unit: 3.5,
  works: 4.5,
  materials: 4.5,
  equipment: 4.5,
  consumables: 4.5,
  coefficient: 3.8,
  base: 4.5,
  total: 4.5,
  group: 5,
  source: 4.5,
  actions: 3,
};
