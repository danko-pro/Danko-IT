import { useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

import { readCatalogStoredValue, writeCatalogStoredValue } from "./useCatalogPersistedState";

export type CatalogTableColumnAlign = "left" | "center" | "right";

export type CatalogTableColumnState = {
  align: CatalogTableColumnAlign;
  width: number;
};

export type CatalogTableColumns<TColumnKey extends string> = Record<TColumnKey, CatalogTableColumnState>;

export type UseCatalogTableColumnsOptions<TColumnKey extends string> = {
  defaultColumns: CatalogTableColumns<TColumnKey>;
  minColumnWidths: Record<TColumnKey, number>;
  storageKey?: string;
};

export const CATALOG_TABLE_ALIGN_ICON: Record<CatalogTableColumnAlign, string> = {
  left: "⇤",
  center: "↔",
  right: "⇥",
};

const ALIGN_ORDER: CatalogTableColumnAlign[] = ["left", "center", "right"];

function nextAlign(current: CatalogTableColumnAlign): CatalogTableColumnAlign {
  return ALIGN_ORDER[(ALIGN_ORDER.indexOf(current) + 1) % ALIGN_ORDER.length];
}

function isColumnAlign(value: unknown): value is CatalogTableColumnAlign {
  return typeof value === "string" && ALIGN_ORDER.includes(value as CatalogTableColumnAlign);
}

function readStoredColumns<TColumnKey extends string>(
  storageKey: string | undefined,
  defaultColumns: CatalogTableColumns<TColumnKey>,
  minColumnWidths: Record<TColumnKey, number>,
): CatalogTableColumns<TColumnKey> {
  const parsed: Partial<Record<TColumnKey, Partial<CatalogTableColumnState>>> = storageKey
    ? readCatalogStoredValue<Partial<Record<TColumnKey, Partial<CatalogTableColumnState>>>>(storageKey, {})
    : {};
  const merged = { ...defaultColumns };

  for (const columnKey of Object.keys(defaultColumns) as TColumnKey[]) {
    const stored = parsed[columnKey];
    merged[columnKey] = {
      align: isColumnAlign(stored?.align) ? stored.align : defaultColumns[columnKey].align,
      width:
        typeof stored?.width === "number" && Number.isFinite(stored.width)
          ? Math.max(minColumnWidths[columnKey], stored.width)
          : defaultColumns[columnKey].width,
    };
  }

  return merged;
}

export function useCatalogTableColumns<TColumnKey extends string>({
  defaultColumns,
  minColumnWidths,
  storageKey,
}: UseCatalogTableColumnsOptions<TColumnKey>) {
  const [columns, setColumns] = useState(() => readStoredColumns(storageKey, defaultColumns, minColumnWidths));
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  function persistColumns(nextColumns: CatalogTableColumns<TColumnKey>) {
    if (storageKey) {
      writeCatalogStoredValue(storageKey, nextColumns);
    }
  }

  function cycleColumnAlign(columnKey: TColumnKey) {
    const next = {
      ...columnsRef.current,
      [columnKey]: {
        ...columnsRef.current[columnKey],
        align: nextAlign(columnsRef.current[columnKey].align),
      },
    };
    columnsRef.current = next;
    setColumns(next);
    persistColumns(next);
  }

  function beginColumnResize(
    columnKey: TColumnKey,
    nextColumnKey: TColumnKey,
    event: ReactMouseEvent<HTMLSpanElement>,
  ) {
    event.preventDefault();

    const startX = event.clientX;
    const startColumnWidth = columnsRef.current[columnKey].width;
    const startNextColumnWidth = columnsRef.current[nextColumnKey].width;
    const totalWidth = startColumnWidth + startNextColumnWidth;
    const tableWidth = event.currentTarget.closest("table")?.getBoundingClientRect().width ?? 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPercent = ((moveEvent.clientX - startX) / tableWidth) * 100;
      const nextWidth = Math.max(
        minColumnWidths[columnKey],
        Math.min(totalWidth - minColumnWidths[nextColumnKey], startColumnWidth + deltaPercent),
      );

      const next = {
        ...columnsRef.current,
        [columnKey]: { ...columnsRef.current[columnKey], width: nextWidth },
        [nextColumnKey]: { ...columnsRef.current[nextColumnKey], width: totalWidth - nextWidth },
      };
      columnsRef.current = next;
      setColumns(next);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      persistColumns(columnsRef.current);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  }

  function columnStyle(columnKey: TColumnKey): CSSProperties {
    return { width: `${columns[columnKey].width}%` };
  }

  function columnClass(columnKey: TColumnKey, className = ""): string {
    return `ce-managed-table-cell is-align-${columns[columnKey].align}${className ? ` ${className}` : ""}`;
  }

  return {
    columns,
    beginColumnResize,
    columnClass,
    columnStyle,
    cycleColumnAlign,
  };
}
