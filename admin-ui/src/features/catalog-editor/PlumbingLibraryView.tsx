import { CatalogLibraryPanel, type CatalogLibraryMetric } from "./CatalogLibraryPanel";
import { CatalogManagedTableHeaderCell } from "./CatalogManagedTableHeaderCell";
import {
  PLUMBING_LIBRARY_COLUMN_CLASS,
  PLUMBING_LIBRARY_COLUMN_LABELS,
  PLUMBING_LIBRARY_COLUMN_TITLES,
  PLUMBING_LIBRARY_COLUMNS,
  PLUMBING_LIBRARY_DEFAULT_COLUMNS,
  PLUMBING_LIBRARY_MIN_COLUMN_WIDTH,
} from "./PlumbingLibraryColumns";
import { PlumbingLibraryRows } from "./PlumbingLibraryRows";
import { formatMoney } from "./plumbing-catalog-model";
import { CATALOG_GROUPS, type CatalogGroup, type CatalogItem } from "./plumbing-seed";
import { useCatalogTableColumns } from "./useCatalogTableColumns";

export type PlumbingLibraryViewProps = {
  filteredItems: CatalogItem[];
  totalCount: number;
  search: string;
  groupFilter: "all" | CatalogGroup;
  libraryTotals: { base: number; withCoef: number };
  onSearch: (value: string) => void;
  onGroupFilter: (value: "all" | CatalogGroup) => void;
  onAddItem: () => void;
  onUpdateItem: (id: string, patch: Partial<CatalogItem>) => void;
  onUpdateNumber: (id: string, field: keyof CatalogItem, value: string) => void;
  onRemoveItem: (id: string) => void;
};

const TITLE = "\u0411\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430 \u043f\u043e\u0437\u0438\u0446\u0438\u0439";
const SEARCH_PLACEHOLDER =
  "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044e, id, \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u044e...";
const ALL_GROUPS_LABEL = "\u0412\u0441\u0435 \u0433\u0440\u0443\u043f\u043f\u044b";
const ADD_ITEM_LABEL =
  "+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u044e";
const EMPTY_LABEL =
  "\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e \u043f\u043e \u0442\u0435\u043a\u0443\u0449\u0435\u043c\u0443 \u0444\u0438\u043b\u044c\u0442\u0440\u0443.";
const SHOWN_LABEL = "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e";
const FROM_LABEL = "\u0438\u0437";
const ITEMS_LABEL = "\u043f\u043e\u0437\u0438\u0446\u0438\u0439";
const BASE_LABEL = "\u0411\u0430\u0437\u0430";
const WITH_COEF_LABEL = "\u0421 \u043a\u043e\u044d\u0444.";

export function PlumbingLibraryView(props: PlumbingLibraryViewProps) {
  const { filteredItems } = props;
  const { columns, beginColumnResize, columnClass, columnStyle, cycleColumnAlign } = useCatalogTableColumns({
    defaultColumns: PLUMBING_LIBRARY_DEFAULT_COLUMNS,
    minColumnWidths: PLUMBING_LIBRARY_MIN_COLUMN_WIDTH,
    storageKey: "plumbing:library-columns",
  });
  const metrics: CatalogLibraryMetric[] = [
    { label: SHOWN_LABEL, value: `${filteredItems.length} ${FROM_LABEL} ${props.totalCount} ${ITEMS_LABEL}` },
    { label: BASE_LABEL, value: `${formatMoney(props.libraryTotals.base)} \u20bd`, tone: "success" },
    { label: WITH_COEF_LABEL, value: `${formatMoney(props.libraryTotals.withCoef)} \u20bd`, tone: "success" },
  ];

  return (
    <CatalogLibraryPanel
      title={TITLE}
      toolbar={<PlumbingLibraryToolbar {...props} />}
      metrics={metrics}
      className="ce-plumbing-library"
    >
      <div className="ce-table-wrap ce-catalog-library-table-wrap ce-plumbing-library-table-wrap">
        <table className="ce-table ce-catalog-library-table ce-plumbing-library-table">
          <colgroup>
            {PLUMBING_LIBRARY_COLUMNS.map((columnKey) => (
              <col key={columnKey} className={`ce-library-col-${columnKey}`} style={columnStyle(columnKey)} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {PLUMBING_LIBRARY_COLUMNS.map((columnKey, index) => {
                const nextColumnKey = PLUMBING_LIBRARY_COLUMNS[index + 1];
                const canEditColumn = columnKey !== "actions";

                return (
                  <CatalogManagedTableHeaderCell
                    key={columnKey}
                    columnKey={columnKey}
                    nextColumnKey={nextColumnKey}
                    label={PLUMBING_LIBRARY_COLUMN_LABELS[columnKey]}
                    title={PLUMBING_LIBRARY_COLUMN_TITLES[columnKey]}
                    columns={columns}
                    columnClass={columnClass}
                    className={PLUMBING_LIBRARY_COLUMN_CLASS[columnKey]}
                    canAlign={canEditColumn}
                    canResize={canEditColumn && nextColumnKey !== "actions"}
                    onCycleAlign={cycleColumnAlign}
                    onBeginResize={beginColumnResize}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={PLUMBING_LIBRARY_COLUMNS.length} className="ce-empty">
                  {EMPTY_LABEL}
                </td>
              </tr>
            ) : (
              <PlumbingLibraryRows
                items={filteredItems}
                columnClass={columnClass}
                onUpdateItem={props.onUpdateItem}
                onUpdateNumber={props.onUpdateNumber}
                onRemoveItem={props.onRemoveItem}
              />
            )}
          </tbody>
        </table>
      </div>
    </CatalogLibraryPanel>
  );
}

function PlumbingLibraryToolbar({
  search,
  groupFilter,
  onSearch,
  onGroupFilter,
  onAddItem,
}: PlumbingLibraryViewProps) {
  return (
    <>
      <input
        type="search"
        className="ce-input ce-search"
        placeholder={SEARCH_PLACEHOLDER}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
      <select
        className="ce-input"
        value={groupFilter}
        onChange={(event) => onGroupFilter(event.target.value as "all" | CatalogGroup)}
      >
        <option value="all">{ALL_GROUPS_LABEL}</option>
        {CATALOG_GROUPS.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
      <button type="button" className="ce-btn ce-btn-primary" onClick={onAddItem}>
        {ADD_ITEM_LABEL}
      </button>
    </>
  );
}
