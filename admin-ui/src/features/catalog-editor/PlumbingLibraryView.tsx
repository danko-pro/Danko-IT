import {
  CATALOG_CATEGORIES,
  CATALOG_GROUPS,
  CATALOG_SOURCES,
  CATALOG_UNITS,
  type CatalogCategory,
  type CatalogGroup,
  type CatalogItem,
  type CatalogSource,
  type CatalogUnit,
} from "./plumbing-seed";
import { baseSum, CATEGORY_LABELS, formatMoney, itemUnitPrice } from "./plumbing-catalog-model";

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

export function PlumbingLibraryView(props: PlumbingLibraryViewProps) {
  const { filteredItems } = props;
  return (
    <>
      <div className="ce-toolbar">
        <div className="ce-toolbar-group">
          <input
            type="search"
            className="ce-input ce-search"
            placeholder="Поиск по названию, id, комментарию…"
            value={props.search}
            onChange={(event) => props.onSearch(event.target.value)}
          />
          <select
            className="ce-input"
            value={props.groupFilter}
            onChange={(event) => props.onGroupFilter(event.target.value as "all" | CatalogGroup)}
          >
            <option value="all">Все группы</option>
            {CATALOG_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <div className="ce-toolbar-group">
          <button type="button" className="ce-btn ce-btn-primary" onClick={props.onAddItem}>
            + Добавить позицию в библиотеку
          </button>
        </div>
      </div>

      <div className="ce-meta">
        Показано: <strong>{filteredItems.length}</strong> из {props.totalCount} позиций · База:{" "}
        <strong>{formatMoney(props.libraryTotals.base)} ₽</strong> · С коэффициентом:{" "}
        <strong>{formatMoney(props.libraryTotals.withCoef)} ₽</strong>
      </div>

      <div className="ce-table-wrap">
        <table className="ce-table">
          <thead>
            <tr>
              <th className="ce-col-id">ID</th>
              <th className="ce-col-title">Публичное название</th>
              <th className="ce-col-tech">Тех. название / комментарий</th>
              <th className="ce-col-select">Категория</th>
              <th className="ce-col-select">Ед.</th>
              <th className="ce-col-num">Работа ₽</th>
              <th className="ce-col-num">Материал ₽</th>
              <th className="ce-col-num">Оборуд. ₽</th>
              <th className="ce-col-num">Расходн. ₽</th>
              <th className="ce-col-num">Коэф.</th>
              <th className="ce-col-num ce-col-total">База ₽</th>
              <th className="ce-col-num ce-col-total">Итого ₽</th>
              <th className="ce-col-select">Группа</th>
              <th className="ce-col-select">Источник</th>
              <th className="ce-col-actions" aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="ce-empty">
                  Ничего не найдено по текущему фильтру.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="ce-col-id">
                    <input
                      className="ce-cell-input ce-mono"
                      value={item.id}
                      onChange={(event) => props.onUpdateItem(item.id, { id: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={item.publicTitle}
                      onChange={(event) => props.onUpdateItem(item.id, { publicTitle: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={item.technicalTitle}
                      onChange={(event) => props.onUpdateItem(item.id, { technicalTitle: event.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.category}
                      onChange={(event) =>
                        props.onUpdateItem(item.id, { category: event.target.value as CatalogCategory })
                      }
                    >
                      {CATALOG_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.unit}
                      onChange={(event) => props.onUpdateItem(item.id, { unit: event.target.value as CatalogUnit })}
                    >
                      {CATALOG_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.works}
                      onChange={(event) => props.onUpdateNumber(item.id, "works", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.materials}
                      onChange={(event) => props.onUpdateNumber(item.id, "materials", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.equipment}
                      onChange={(event) => props.onUpdateNumber(item.id, "equipment", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.consumables}
                      onChange={(event) => props.onUpdateNumber(item.id, "consumables", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      step="0.01"
                      value={item.coefficient}
                      onChange={(event) => props.onUpdateNumber(item.id, "coefficient", event.target.value)}
                    />
                  </td>
                  <td className="ce-num ce-readonly">{formatMoney(baseSum(item))}</td>
                  <td className="ce-num ce-readonly ce-total-cell">{formatMoney(itemUnitPrice(item))}</td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.group}
                      onChange={(event) => props.onUpdateItem(item.id, { group: event.target.value as CatalogGroup })}
                    >
                      {CATALOG_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.source}
                      onChange={(event) => props.onUpdateItem(item.id, { source: event.target.value as CatalogSource })}
                    >
                      {CATALOG_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ce-col-actions">
                    <button
                      type="button"
                      className="ce-row-delete"
                      title="Удалить позицию"
                      onClick={() => props.onRemoveItem(item.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// =================== Превью публичной цены (snapshot/preview) ===================
