import type { Dispatch, SetStateAction } from "react";

import type { FlooringAssemblyItemDraft, FlooringAssemblyItemDto } from "./api/flooring-types";
import {
  FLOORING_ASSEMBLY_LIBRARY_DEFAULT_COLUMNS,
  FLOORING_ASSEMBLY_LIBRARY_MIN_COLUMN_WIDTH,
} from "./FlooringAssemblyLibraryColumns";
import { FlooringAssemblyLibraryCatalogTable } from "./FlooringAssemblyLibraryCatalogTable";
import {
  FlooringAssemblyLibraryFormTable,
  type FlooringAssemblyLibraryNumberField,
} from "./FlooringAssemblyLibraryFormTable";
import { useCatalogTableColumns } from "./useCatalogTableColumns";

export type FlooringAssemblyLibraryPanelProps = {
  assemblyCatalog: FlooringAssemblyItemDto[];
  assemblyDraft: FlooringAssemblyItemDraft;
  editingAssemblyId: number | null;
  creatingAssembly: boolean;
  savingAssembly: boolean;
  onBeginEditAssemblyItem: (item: FlooringAssemblyItemDto) => void;
  onDeleteAssemblyItem: (item: FlooringAssemblyItemDto) => void;
  onCancelAssemblyEdit: () => void;
  onSubmitAssemblyItem: () => void;
  onAssemblyDraftChange: Dispatch<SetStateAction<FlooringAssemblyItemDraft>>;
  onAssemblyNumberChange: (field: FlooringAssemblyLibraryNumberField, value: number | null) => void;
  formatMoney: (value: number) => string;
};

const TITLE = "\u0411\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430 \u043a\u0443\u0431\u0438\u043a\u043e\u0432";

export function FlooringAssemblyLibraryPanel({
  assemblyCatalog,
  assemblyDraft,
  editingAssemblyId,
  creatingAssembly,
  savingAssembly,
  onBeginEditAssemblyItem,
  onDeleteAssemblyItem,
  onCancelAssemblyEdit,
  onSubmitAssemblyItem,
  onAssemblyDraftChange,
  onAssemblyNumberChange,
  formatMoney,
}: FlooringAssemblyLibraryPanelProps) {
  const controls = useCatalogTableColumns({
    defaultColumns: FLOORING_ASSEMBLY_LIBRARY_DEFAULT_COLUMNS,
    minColumnWidths: FLOORING_ASSEMBLY_LIBRARY_MIN_COLUMN_WIDTH,
  });

  return (
    <section className="ce-flooring-section">
      <h3 className="ce-flooring-section-title">{TITLE}</h3>
      <FlooringAssemblyLibraryCatalogTable
        assemblyCatalog={assemblyCatalog}
        controls={controls}
        onBeginEditAssemblyItem={onBeginEditAssemblyItem}
        onDeleteAssemblyItem={onDeleteAssemblyItem}
        formatMoney={formatMoney}
      />
      <FlooringAssemblyLibraryFormTable
        assemblyDraft={assemblyDraft}
        editingAssemblyId={editingAssemblyId}
        creatingAssembly={creatingAssembly}
        savingAssembly={savingAssembly}
        controls={controls}
        onCancelAssemblyEdit={onCancelAssemblyEdit}
        onSubmitAssemblyItem={onSubmitAssemblyItem}
        onAssemblyDraftChange={onAssemblyDraftChange}
        onAssemblyNumberChange={onAssemblyNumberChange}
      />
    </section>
  );
}
