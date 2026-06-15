import type { CatalogItem } from "./plumbing-seed";
import type { PlumbingLibraryColumnKey } from "./PlumbingLibraryColumns";
import { PlumbingLibraryRow } from "./PlumbingLibraryRow";

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
    <PlumbingLibraryRow
      key={item.id}
      item={item}
      columnClass={columnClass}
      onUpdateItem={onUpdateItem}
      onUpdateNumber={onUpdateNumber}
      onRemoveItem={onRemoveItem}
    />
  ));
}
