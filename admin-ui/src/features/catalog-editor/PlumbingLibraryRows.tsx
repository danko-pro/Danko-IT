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
import type { PlumbingLibraryColumnKey } from "./PlumbingLibraryColumns";

export type PlumbingLibraryRowsProps = {
  items: CatalogItem[];
  columnClass: (columnKey: PlumbingLibraryColumnKey, className?: string) => string;
  onUpdateItem: (id: string, patch: Partial<CatalogItem>) => void;
  onUpdateNumber: (id: string, field: keyof CatalogItem, value: string) => void;
  onRemoveItem: (id: string) => void;
};

export function PlumbingLibraryRows({
  items,
  columnClass,
  onUpdateItem,
  onUpdateNumber,
  onRemoveItem,
}: PlumbingLibraryRowsProps) {
  return items.map((item) => (
    <tr key={item.id}>
      <td className={columnClass("id", "ce-col-id")}>
        <input
          className="ce-cell-input ce-mono"
          value={item.id}
          onChange={(event) => onUpdateItem(item.id, { id: event.target.value })}
        />
      </td>
      <td className={columnClass("publicTitle", "ce-col-title")}>
        <input
          className="ce-cell-input"
          value={item.publicTitle}
          onChange={(event) => onUpdateItem(item.id, { publicTitle: event.target.value })}
        />
      </td>
      <td className={columnClass("technicalTitle", "ce-col-tech")}>
        <input
          className="ce-cell-input"
          value={item.technicalTitle}
          onChange={(event) => onUpdateItem(item.id, { technicalTitle: event.target.value })}
        />
      </td>
      <td className={columnClass("category", "ce-col-select")}>
        <select
          className="ce-cell-input"
          value={item.category}
          onChange={(event) => onUpdateItem(item.id, { category: event.target.value as CatalogCategory })}
        >
          {CATALOG_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </td>
      <td className={columnClass("unit", "ce-col-select")}>
        <select
          className="ce-cell-input"
          value={item.unit}
          onChange={(event) => onUpdateItem(item.id, { unit: event.target.value as CatalogUnit })}
        >
          {CATALOG_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </td>
      <td className={columnClass("works", "ce-col-num")}>
        <input
          className="ce-cell-input ce-num"
          type="number"
          value={item.works}
          onChange={(event) => onUpdateNumber(item.id, "works", event.target.value)}
        />
      </td>
      <td className={columnClass("materials", "ce-col-num")}>
        <input
          className="ce-cell-input ce-num"
          type="number"
          value={item.materials}
          onChange={(event) => onUpdateNumber(item.id, "materials", event.target.value)}
        />
      </td>
      <td className={columnClass("equipment", "ce-col-num")}>
        <input
          className="ce-cell-input ce-num"
          type="number"
          value={item.equipment}
          onChange={(event) => onUpdateNumber(item.id, "equipment", event.target.value)}
        />
      </td>
      <td className={columnClass("consumables", "ce-col-num")}>
        <input
          className="ce-cell-input ce-num"
          type="number"
          value={item.consumables}
          onChange={(event) => onUpdateNumber(item.id, "consumables", event.target.value)}
        />
      </td>
      <td className={columnClass("coefficient", "ce-col-num")}>
        <input
          className="ce-cell-input ce-num"
          type="number"
          step="0.01"
          value={item.coefficient}
          onChange={(event) => onUpdateNumber(item.id, "coefficient", event.target.value)}
        />
      </td>
      <td className={columnClass("base", "ce-col-num ce-readonly")}>{formatMoney(baseSum(item))}</td>
      <td className={columnClass("total", "ce-col-num ce-readonly ce-total-cell")}>
        {formatMoney(itemUnitPrice(item))}
      </td>
      <td className={columnClass("group", "ce-col-select")}>
        <select
          className="ce-cell-input"
          value={item.group}
          onChange={(event) => onUpdateItem(item.id, { group: event.target.value as CatalogGroup })}
        >
          {CATALOG_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </td>
      <td className={columnClass("source", "ce-col-select")}>
        <select
          className="ce-cell-input"
          value={item.source}
          onChange={(event) => onUpdateItem(item.id, { source: event.target.value as CatalogSource })}
        >
          {CATALOG_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </td>
      <td className={columnClass("actions", "ce-col-actions")}>
        <button
          type="button"
          className="ce-row-delete"
          title="\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u044e"
          onClick={() => onRemoveItem(item.id)}
        >
          {"\u00d7"}
        </button>
      </td>
    </tr>
  ));
}
