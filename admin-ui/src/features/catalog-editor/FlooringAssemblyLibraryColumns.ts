import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import type {
  CatalogTableColumnState,
  CatalogTableColumns,
} from "./useCatalogTableColumns";

export type FlooringAssemblyLibraryColumnKey =
  | "code"
  | "title"
  | "section"
  | "kind"
  | "formula"
  | "unit"
  | "price"
  | "consumption"
  | "packageSize"
  | "layer"
  | "actions";

export type FlooringAssemblyLibraryColumnControls = {
  columns: CatalogTableColumns<FlooringAssemblyLibraryColumnKey>;
  beginColumnResize: (
    columnKey: FlooringAssemblyLibraryColumnKey,
    nextColumnKey: FlooringAssemblyLibraryColumnKey,
    event: ReactMouseEvent<HTMLSpanElement>,
  ) => void;
  columnClass: (columnKey: FlooringAssemblyLibraryColumnKey, className?: string) => string;
  columnStyle: (columnKey: FlooringAssemblyLibraryColumnKey) => CSSProperties;
  cycleColumnAlign: (columnKey: FlooringAssemblyLibraryColumnKey) => void;
};

export const FLOORING_ASSEMBLY_LIBRARY_COLUMNS: FlooringAssemblyLibraryColumnKey[] = [
  "code",
  "title",
  "section",
  "kind",
  "formula",
  "unit",
  "price",
  "consumption",
  "packageSize",
  "layer",
  "actions",
];

export const FLOORING_ASSEMBLY_LIBRARY_COLUMN_LABELS: Record<FlooringAssemblyLibraryColumnKey, string> = {
  code: "\u041a\u043e\u0434",
  title: "\u041d\u0430\u0437\u0432.",
  section: "\u041e\u0442\u0434.",
  kind: "\u0422\u0438\u043f",
  formula: "\u0424\u043e\u0440\u043c.",
  unit: "\u0415\u0434.",
  price: "\u0426\u0435\u043d\u0430",
  consumption: "\u0420\u0430\u0441\u0445.",
  packageSize: "\u0424\u0430\u0441.",
  layer: "\u0421\u043b\u043e\u0439",
  actions: "",
};

export const FLOORING_ASSEMBLY_LIBRARY_COLUMN_TITLES: Partial<Record<FlooringAssemblyLibraryColumnKey, string>> = {
  title: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
  section: "\u041e\u0442\u0434\u0435\u043b",
  formula: "\u0424\u043e\u0440\u043c\u0443\u043b\u0430",
  consumption: "\u0420\u0430\u0441\u0445\u043e\u0434",
  packageSize: "\u0424\u0430\u0441\u043e\u0432\u043a\u0430 / \u0431\u0430\u0437\u0430",
  actions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
};

export const FLOORING_ASSEMBLY_LIBRARY_COLUMN_CLASS: Record<FlooringAssemblyLibraryColumnKey, string> = {
  code: "ce-col-id",
  title: "ce-col-title",
  section: "ce-col-select",
  kind: "ce-col-select",
  formula: "ce-col-formula",
  unit: "ce-col-select",
  price: "ce-col-num",
  consumption: "ce-col-num",
  packageSize: "ce-col-num",
  layer: "ce-col-num",
  actions: "ce-col-actions",
};

export const FLOORING_ASSEMBLY_LIBRARY_DEFAULT_COLUMNS: Record<
  FlooringAssemblyLibraryColumnKey,
  CatalogTableColumnState
> = {
  code: { align: "left", width: 11 },
  title: { align: "left", width: 22 },
  section: { align: "left", width: 10 },
  kind: { align: "left", width: 7 },
  formula: { align: "center", width: 9 },
  unit: { align: "center", width: 5 },
  price: { align: "right", width: 8 },
  consumption: { align: "right", width: 8 },
  packageSize: { align: "right", width: 7 },
  layer: { align: "right", width: 5 },
  actions: { align: "center", width: 8 },
};

export const FLOORING_ASSEMBLY_LIBRARY_MIN_COLUMN_WIDTH: Record<FlooringAssemblyLibraryColumnKey, number> = {
  code: 8,
  title: 14,
  section: 7,
  kind: 5,
  formula: 6,
  unit: 4,
  price: 6,
  consumption: 6,
  packageSize: 5,
  layer: 4,
  actions: 6,
};
