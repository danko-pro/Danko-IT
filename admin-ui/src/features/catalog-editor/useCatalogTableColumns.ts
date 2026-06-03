import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

export type CatalogTableColumnAlign = "left" | "center" | "right";

export type CatalogTableColumnState = {
  align: CatalogTableColumnAlign;
  width: number;
};

export type CatalogTableColumns<TColumnKey extends string> = Record<TColumnKey, CatalogTableColumnState>;

export type UseCatalogTableColumnsOptions<TColumnKey extends string> = {
  defaultColumns: CatalogTableColumns<TColumnKey>;
  minColumnWidths: Record<TColumnKey, number>;
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

export function useCatalogTableColumns<TColumnKey extends string>({
  defaultColumns,
  minColumnWidths,
}: UseCatalogTableColumnsOptions<TColumnKey>) {
  const [columns, setColumns] = useState(() => ({ ...defaultColumns }));

  function cycleColumnAlign(columnKey: TColumnKey) {
    setColumns((current) => ({
      ...current,
      [columnKey]: { ...current[columnKey], align: nextAlign(current[columnKey].align) },
    }));
  }

  function beginColumnResize(
    columnKey: TColumnKey,
    nextColumnKey: TColumnKey,
    event: ReactMouseEvent<HTMLSpanElement>,
  ) {
    event.preventDefault();

    const startX = event.clientX;
    const startColumnWidth = columns[columnKey].width;
    const startNextColumnWidth = columns[nextColumnKey].width;
    const totalWidth = startColumnWidth + startNextColumnWidth;
    const tableWidth = event.currentTarget.closest("table")?.getBoundingClientRect().width ?? 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPercent = ((moveEvent.clientX - startX) / tableWidth) * 100;
      const nextWidth = Math.max(
        minColumnWidths[columnKey],
        Math.min(totalWidth - minColumnWidths[nextColumnKey], startColumnWidth + deltaPercent),
      );

      setColumns((current) => ({
        ...current,
        [columnKey]: { ...current[columnKey], width: nextWidth },
        [nextColumnKey]: { ...current[nextColumnKey], width: totalWidth - nextWidth },
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
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
