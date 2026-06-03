import type { MouseEvent as ReactMouseEvent } from "react";

import {
  CATALOG_TABLE_ALIGN_ICON,
  type CatalogTableColumns,
} from "./useCatalogTableColumns";

export type CatalogManagedTableHeaderCellProps<TColumnKey extends string> = {
  columnKey: TColumnKey;
  nextColumnKey?: TColumnKey;
  label: string;
  columns: CatalogTableColumns<TColumnKey>;
  columnClass: (columnKey: TColumnKey, className?: string) => string;
  onCycleAlign: (columnKey: TColumnKey) => void;
  onBeginResize: (
    columnKey: TColumnKey,
    nextColumnKey: TColumnKey,
    event: ReactMouseEvent<HTMLSpanElement>,
  ) => void;
  canAlign?: boolean;
  canResize?: boolean;
  className?: string;
  title?: string;
};

export function CatalogManagedTableHeaderCell<TColumnKey extends string>({
  columnKey,
  nextColumnKey,
  label,
  columns,
  columnClass,
  onCycleAlign,
  onBeginResize,
  canAlign = true,
  canResize,
  className = "",
  title,
}: CatalogManagedTableHeaderCellProps<TColumnKey>) {
  const resizeEnabled = canResize ?? Boolean(nextColumnKey);

  return (
    <th
      className={columnClass(columnKey, `ce-managed-table-header-cell${className ? ` ${className}` : ""}`)}
      aria-label={label ? undefined : title}
      title={title}
    >
      <span className="ce-managed-table-header-inner">
        <span className="ce-managed-table-header-label">{label}</span>
        {canAlign ? (
          <span className="ce-managed-table-header-tools">
            <button
              type="button"
              className="ce-managed-table-header-tool"
              title="Сменить выравнивание"
              onClick={() => onCycleAlign(columnKey)}
            >
              {CATALOG_TABLE_ALIGN_ICON[columns[columnKey].align]}
            </button>
          </span>
        ) : null}
        {resizeEnabled && nextColumnKey ? (
          <span
            className="ce-managed-table-column-resizer"
            aria-hidden="true"
            onMouseDown={(event) => onBeginResize(columnKey, nextColumnKey, event)}
          />
        ) : null}
      </span>
    </th>
  );
}
