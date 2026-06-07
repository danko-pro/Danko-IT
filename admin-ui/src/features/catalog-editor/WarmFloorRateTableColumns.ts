import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import type { CatalogTableColumnState, CatalogTableColumns } from "./useCatalogTableColumns";

export type WarmFloorRateColumnKey = "label" | "unit" | "value";

export type WarmFloorRateColumnControls = {
  columns: CatalogTableColumns<WarmFloorRateColumnKey>;
  beginColumnResize: (
    columnKey: WarmFloorRateColumnKey,
    nextColumnKey: WarmFloorRateColumnKey,
    event: ReactMouseEvent<HTMLSpanElement>,
  ) => void;
  columnClass: (columnKey: WarmFloorRateColumnKey, className?: string) => string;
  columnStyle: (columnKey: WarmFloorRateColumnKey) => CSSProperties;
  cycleColumnAlign: (columnKey: WarmFloorRateColumnKey) => void;
};

export const WARM_FLOOR_RATE_COLUMNS: WarmFloorRateColumnKey[] = ["label", "unit", "value"];

export const WARM_FLOOR_RATE_COLUMN_LABELS: Record<WarmFloorRateColumnKey, string> = {
  label: "Тариф",
  unit: "Ед.",
  value: "Знач.",
};

export const WARM_FLOOR_RATE_COLUMN_TITLES: Record<WarmFloorRateColumnKey, string> = {
  label: "Название тарифа",
  unit: "Единица",
  value: "Значение",
};

export const WARM_FLOOR_RATE_COLUMN_CLASS: Record<WarmFloorRateColumnKey, string> = {
  label: "ce-col-title",
  unit: "ce-col-select",
  value: "ce-col-num",
};

export const WARM_FLOOR_RATE_DEFAULT_COLUMNS: Record<WarmFloorRateColumnKey, CatalogTableColumnState> = {
  label: { align: "left", width: 62 },
  unit: { align: "center", width: 13 },
  value: { align: "right", width: 25 },
};

export const WARM_FLOOR_RATE_MIN_COLUMN_WIDTH: Record<WarmFloorRateColumnKey, number> = {
  label: 35,
  unit: 10,
  value: 18,
};
