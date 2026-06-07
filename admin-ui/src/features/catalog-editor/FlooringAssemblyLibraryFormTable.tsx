import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { FlooringAssemblyItemDraft } from "./api/flooring-types";
import { CatalogDecimalInput } from "./CatalogDecimalInput";
import {
  FLOORING_ASSEMBLY_FORMULAS,
  FLOORING_ASSEMBLY_LIBRARY_SECTIONS,
  getAssemblyFormulaCompactLabel,
  getAssemblyFormulaLabel,
  getAssemblyKindLabel,
  getFlooringAssemblyLibrarySectionLabel,
  inferDefaultFormula,
  type CoveringAssemblyRowKind,
  type FlooringAssemblyFormula,
  type FlooringAssemblyLibrarySection,
} from "./flooring-assembly";
import {
  FlooringAssemblyLibraryColgroup,
  FlooringAssemblyLibraryHeader,
} from "./FlooringAssemblyLibraryCatalogTable";
import type { FlooringAssemblyLibraryColumnControls } from "./FlooringAssemblyLibraryColumns";

const ASSEMBLY_ROW_KINDS: CoveringAssemblyRowKind[] = ["work", "material", "consumable", "tool"];

export type FlooringAssemblyLibraryNumberField = "price" | "consumptionPerM2" | "packageSize" | "layerMm";

export type FlooringAssemblyLibraryFormTableProps = {
  assemblyDraft: FlooringAssemblyItemDraft;
  editingAssemblyId: number | null;
  creatingAssembly: boolean;
  savingAssembly: boolean;
  controls: FlooringAssemblyLibraryColumnControls;
  onCancelAssemblyEdit: () => void;
  onSubmitAssemblyItem: () => void;
  onAssemblyDraftChange: Dispatch<SetStateAction<FlooringAssemblyItemDraft>>;
  onAssemblyNumberChange: (field: FlooringAssemblyLibraryNumberField, value: number | null) => void;
};

const MODE_LABEL = "\u0420\u0435\u0436\u0438\u043c";
const EDITING_LABEL = "\u0420\u0435\u0434.";
const NEW_LABEL = "\u041d\u043e\u0432.";
const CANCEL_LABEL = "\u041e\u0442\u043c.";
const SAVE_LABEL = "\u0421\u043e\u0445\u0440.";
const CREATE_LABEL = "\u0421\u043e\u0437\u0434.";
const CANCEL_TITLE = "\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c";
const SAVE_TITLE = "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c";
const CREATE_TITLE = "\u0421\u043e\u0437\u0434\u0430\u0442\u044c";
const TITLE_PLACEHOLDER = "\u041a\u043b\u0435\u0439 \u043f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439";

export function FlooringAssemblyLibraryFormTable({
  assemblyDraft,
  editingAssemblyId,
  creatingAssembly,
  savingAssembly,
  controls,
  onCancelAssemblyEdit,
  onSubmitAssemblyItem,
  onAssemblyDraftChange,
  onAssemblyNumberChange,
}: FlooringAssemblyLibraryFormTableProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitAssemblyItem();
  }

  return (
    <form className="ce-flooring-library-form" onSubmit={handleSubmit}>
      <div className="ce-table-wrap ce-catalog-library-table-wrap ce-flooring-table-wrap ce-flooring-library-table-wrap">
        <table className="ce-table ce-catalog-library-table ce-flooring-table ce-flooring-library-table">
          <FlooringAssemblyLibraryColgroup controls={controls} />
          <FlooringAssemblyLibraryHeader controls={controls} codeLabel={MODE_LABEL} />
          <tbody>
            <tr>
              <td className={controls.columnClass("code", "ce-readonly")}>
                {editingAssemblyId ? EDITING_LABEL : NEW_LABEL}
              </td>
              <td className={controls.columnClass("title")}>
                <input
                  className="ce-cell-input"
                  value={assemblyDraft.title}
                  onChange={(event) => onAssemblyDraftChange((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder={TITLE_PLACEHOLDER}
                />
              </td>
              <td className={controls.columnClass("section")}>
                <select
                  className="ce-cell-input ce-cell-select"
                  value={assemblyDraft.section}
                  onChange={(event) =>
                    onAssemblyDraftChange((prev) => ({
                      ...prev,
                      section: event.target.value as FlooringAssemblyLibrarySection,
                    }))
                  }
                >
                  {FLOORING_ASSEMBLY_LIBRARY_SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      {getFlooringAssemblyLibrarySectionLabel(section)}
                    </option>
                  ))}
                </select>
              </td>
              <td className={controls.columnClass("kind")}>
                <select
                  className="ce-cell-input ce-cell-select"
                  value={assemblyDraft.kind}
                  onChange={(event) => {
                    const kind = event.target.value as CoveringAssemblyRowKind;
                    onAssemblyDraftChange((prev) => ({
                      ...prev,
                      kind,
                      formula: inferDefaultFormula(kind, { title: prev.title }),
                    }));
                  }}
                >
                  {ASSEMBLY_ROW_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {getAssemblyKindLabel(kind)}
                    </option>
                  ))}
                </select>
              </td>
              <td className={controls.columnClass("formula")}>
                <select
                  className="ce-cell-input ce-cell-select ce-cell-formula"
                  value={assemblyDraft.formula}
                  title={getAssemblyFormulaLabel(assemblyDraft.formula)}
                  onChange={(event) =>
                    onAssemblyDraftChange((prev) => ({
                      ...prev,
                      formula: event.target.value as FlooringAssemblyFormula,
                    }))
                  }
                >
                  {FLOORING_ASSEMBLY_FORMULAS.map((formula) => (
                    <option key={formula} value={formula} title={getAssemblyFormulaLabel(formula)}>
                      {getAssemblyFormulaCompactLabel(formula)}
                    </option>
                  ))}
                </select>
              </td>
              <td className={controls.columnClass("unit")}>
                <input
                  className="ce-cell-input"
                  value={assemblyDraft.unit}
                  onChange={(event) => onAssemblyDraftChange((prev) => ({ ...prev, unit: event.target.value }))}
                />
              </td>
              <td className={controls.columnClass("price", "ce-num")}>
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={assemblyDraft.price}
                  onCommit={(value) => onAssemblyNumberChange("price", value)}
                />
              </td>
              <td className={controls.columnClass("consumption", "ce-num")}>
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={assemblyDraft.consumptionPerM2}
                  onCommit={(value) => onAssemblyNumberChange("consumptionPerM2", value)}
                />
              </td>
              <td className={controls.columnClass("packageSize", "ce-num")}>
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  nullable
                  value={assemblyDraft.packageSize}
                  onCommit={(value) => onAssemblyNumberChange("packageSize", value)}
                />
              </td>
              <td className={controls.columnClass("layer", "ce-num")}>
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  nullable
                  value={assemblyDraft.layerMm}
                  onCommit={(value) => onAssemblyNumberChange("layerMm", value)}
                />
              </td>
              <td className={controls.columnClass("actions", "ce-col-actions")}>
                <div className="ce-row-actions">
                  {editingAssemblyId ? (
                    <button
                      type="button"
                      className="ce-row-action"
                      disabled={savingAssembly}
                      title={CANCEL_TITLE}
                      onClick={onCancelAssemblyEdit}
                    >
                      {CANCEL_LABEL}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="ce-row-action ce-row-action-primary"
                    disabled={editingAssemblyId ? savingAssembly : creatingAssembly}
                    title={editingAssemblyId ? SAVE_TITLE : CREATE_TITLE}
                  >
                    {editingAssemblyId
                      ? savingAssembly
                        ? "..."
                        : SAVE_LABEL
                      : creatingAssembly
                        ? "..."
                        : CREATE_LABEL}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </form>
  );
}
