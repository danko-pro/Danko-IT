import { normalizeNum } from "./api/flooring-mappers";
import type { FlooringAssemblyItemDto } from "./api/flooring-types";
import { CatalogManagedTableHeaderCell } from "./CatalogManagedTableHeaderCell";
import {
  FLOORING_ASSEMBLY_LIBRARY_COLUMN_CLASS,
  FLOORING_ASSEMBLY_LIBRARY_COLUMN_LABELS,
  FLOORING_ASSEMBLY_LIBRARY_COLUMN_TITLES,
  FLOORING_ASSEMBLY_LIBRARY_COLUMNS,
  type FlooringAssemblyLibraryColumnControls,
} from "./FlooringAssemblyLibraryColumns";
import {
  getAssemblyFormulaCompactLabel,
  getAssemblyFormulaLabel,
  getAssemblyKindLabel,
  getFlooringAssemblyLibrarySectionLabel,
} from "./flooring-assembly";

export type FlooringAssemblyLibraryCatalogTableProps = {
  assemblyCatalog: FlooringAssemblyItemDto[];
  controls: FlooringAssemblyLibraryColumnControls;
  onBeginEditAssemblyItem: (item: FlooringAssemblyItemDto) => void;
  onDeleteAssemblyItem: (item: FlooringAssemblyItemDto) => void;
  formatMoney: (value: number) => string;
};

const EMPTY_LABEL = "\u041a\u0443\u0431\u0438\u043a\u0438 \u0435\u0449\u0435 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u044b.";
const EDIT_LABEL = "\u0418\u0437\u043c.";
const DELETE_LABEL = "\u0423\u0434\u0430\u043b.";
const EDIT_TITLE = "\u0420\u0435\u0434\u0430\u043a\u0442.";
const DELETE_TITLE = "\u0423\u0434\u0430\u043b\u0438\u0442\u044c";

export function FlooringAssemblyLibraryCatalogTable({
  assemblyCatalog,
  controls,
  onBeginEditAssemblyItem,
  onDeleteAssemblyItem,
  formatMoney,
}: FlooringAssemblyLibraryCatalogTableProps) {
  return (
    <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-library-table-wrap">
      <table className="ce-table ce-flooring-table ce-flooring-library-table">
        <FlooringAssemblyLibraryColgroup controls={controls} />
        <FlooringAssemblyLibraryHeader controls={controls} />
        <tbody>
          {assemblyCatalog.length === 0 ? (
            <tr>
              <td colSpan={FLOORING_ASSEMBLY_LIBRARY_COLUMNS.length} className="ce-empty">
                {EMPTY_LABEL}
              </td>
            </tr>
          ) : (
            assemblyCatalog.map((item) => (
              <tr key={item.id}>
                <td className={controls.columnClass("code", "ce-col-id ce-mono ce-readonly")}>{item.source_code}</td>
                <td className={controls.columnClass("title", "ce-readonly")}>{item.title}</td>
                <td
                  className={controls.columnClass("section", "ce-readonly")}
                  title={getFlooringAssemblyLibrarySectionLabel(item.section)}
                >
                  {getFlooringAssemblyLibrarySectionLabel(item.section)}
                </td>
                <td className={controls.columnClass("kind", "ce-readonly")} title={getAssemblyKindLabel(item.kind)}>
                  {getAssemblyKindLabel(item.kind)}
                </td>
                <td
                  className={controls.columnClass("formula", "ce-readonly")}
                  title={getAssemblyFormulaLabel(item.formula)}
                >
                  {getAssemblyFormulaCompactLabel(item.formula)}
                </td>
                <td className={controls.columnClass("unit", "ce-readonly")}>{item.unit}</td>
                <td className={controls.columnClass("price", "ce-num ce-readonly")}>
                  {formatMoney(normalizeNum(item.price))}
                </td>
                <td className={controls.columnClass("consumption", "ce-num ce-readonly")}>
                  {normalizeNum(item.consumption_per_m2)}
                </td>
                <td className={controls.columnClass("packageSize", "ce-num ce-readonly")}>
                  {item.package_size ?? "\u2014"}
                </td>
                <td className={controls.columnClass("layer", "ce-num ce-readonly")}>{item.layer_mm ?? "\u2014"}</td>
                <td className={controls.columnClass("actions", "ce-col-actions")}>
                  <div className="ce-row-actions">
                    <button
                      type="button"
                      className="ce-row-action"
                      title={EDIT_TITLE}
                      onClick={() => onBeginEditAssemblyItem(item)}
                    >
                      {EDIT_LABEL}
                    </button>
                    <button
                      type="button"
                      className="ce-row-action ce-row-action-danger"
                      title={DELETE_TITLE}
                      onClick={() => onDeleteAssemblyItem(item)}
                    >
                      {DELETE_LABEL}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FlooringAssemblyLibraryColgroup({
  controls,
}: {
  controls: FlooringAssemblyLibraryColumnControls;
}) {
  return (
    <colgroup>
      {FLOORING_ASSEMBLY_LIBRARY_COLUMNS.map((columnKey) => (
        <col key={columnKey} className={`ce-flooring-library-col-${columnKey}`} style={controls.columnStyle(columnKey)} />
      ))}
    </colgroup>
  );
}

export function FlooringAssemblyLibraryHeader({
  controls,
  codeLabel = FLOORING_ASSEMBLY_LIBRARY_COLUMN_LABELS.code,
}: {
  controls: FlooringAssemblyLibraryColumnControls;
  codeLabel?: string;
}) {
  return (
    <thead>
      <tr>
        {FLOORING_ASSEMBLY_LIBRARY_COLUMNS.map((columnKey, index) => {
          const nextColumnKey = FLOORING_ASSEMBLY_LIBRARY_COLUMNS[index + 1];
          const canEditColumn = columnKey !== "actions";

          return (
            <CatalogManagedTableHeaderCell
              key={columnKey}
              columnKey={columnKey}
              nextColumnKey={nextColumnKey}
              label={columnKey === "code" ? codeLabel : FLOORING_ASSEMBLY_LIBRARY_COLUMN_LABELS[columnKey]}
              title={FLOORING_ASSEMBLY_LIBRARY_COLUMN_TITLES[columnKey]}
              columns={controls.columns}
              columnClass={controls.columnClass}
              className={FLOORING_ASSEMBLY_LIBRARY_COLUMN_CLASS[columnKey]}
              canAlign={canEditColumn}
              canResize={canEditColumn && nextColumnKey !== "actions"}
              onCycleAlign={controls.cycleColumnAlign}
              onBeginResize={controls.beginColumnResize}
            />
          );
        })}
      </tr>
    </thead>
  );
}
