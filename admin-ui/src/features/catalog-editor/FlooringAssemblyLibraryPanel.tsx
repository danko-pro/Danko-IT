import type { Dispatch, FormEvent, SetStateAction } from "react";

import { normalizeNum } from "./api/flooring-mappers";
import type { FlooringAssemblyItemDraft, FlooringAssemblyItemDto } from "./api/flooring-types";
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

const ASSEMBLY_ROW_KINDS: CoveringAssemblyRowKind[] = ["work", "material", "consumable", "tool"];

type AssemblyNumberField = "price" | "consumptionPerM2" | "packageSize" | "layerMm";

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
  onAssemblyNumberChange: (field: AssemblyNumberField, value: number | null) => void;
  formatMoney: (value: number) => string;
};

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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitAssemblyItem();
  }

  return (
    <section className="ce-flooring-section">
      <h3 className="ce-flooring-section-title">Библиотека кубиков</h3>
      <div className="ce-table-wrap ce-flooring-table-wrap">
        <table className="ce-table ce-flooring-table">
          <thead>
            <tr>
              <th className="ce-col-id">Код</th>
              <th className="ce-col-title">Название</th>
              <th>Отдел</th>
              <th>Тип</th>
              <th>Формула</th>
              <th>Ед.</th>
              <th className="ce-col-num">Цена</th>
              <th className="ce-col-num">Расход</th>
              <th className="ce-col-num">Фас./база</th>
              <th className="ce-col-num">Слой</th>
              <th className="ce-col-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            {assemblyCatalog.length === 0 ? (
              <tr>
                <td colSpan={11} className="ce-empty">
                  Кубики ещё не добавлены.
                </td>
              </tr>
            ) : (
              assemblyCatalog.map((item) => (
                <tr key={item.id}>
                  <td className="ce-col-id ce-mono ce-readonly">{item.source_code}</td>
                  <td className="ce-readonly">{item.title}</td>
                  <td className="ce-readonly" title={getFlooringAssemblyLibrarySectionLabel(item.section)}>
                    {getFlooringAssemblyLibrarySectionLabel(item.section)}
                  </td>
                  <td className="ce-readonly" title={getAssemblyKindLabel(item.kind)}>
                    {getAssemblyKindLabel(item.kind)}
                  </td>
                  <td
                    className="ce-readonly"
                    title={getAssemblyFormulaLabel(item.formula)}
                  >
                    {getAssemblyFormulaCompactLabel(item.formula)}
                  </td>
                  <td className="ce-readonly">{item.unit}</td>
                  <td className="ce-num ce-readonly">{formatMoney(normalizeNum(item.price))}</td>
                  <td className="ce-num ce-readonly">{normalizeNum(item.consumption_per_m2)}</td>
                  <td className="ce-num ce-readonly">{item.package_size ?? "—"}</td>
                  <td className="ce-num ce-readonly">{item.layer_mm ?? "—"}</td>
                  <td className="ce-col-actions">
                    <div className="ce-row-actions">
                      <button
                        type="button"
                        className="ce-row-action"
                        title="Редактировать"
                        onClick={() => onBeginEditAssemblyItem(item)}
                      >
                        Изм.
                      </button>
                      <button
                        type="button"
                        className="ce-row-action ce-row-action-danger"
                        title="Удалить"
                        onClick={() => onDeleteAssemblyItem(item)}
                      >
                        Удал.
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form className="ce-flooring-library-form" onSubmit={handleSubmit}>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Режим</th>
                <th className="ce-col-title">Название</th>
                <th>Отдел</th>
                <th>Тип</th>
                <th>Формула</th>
                <th>Ед.</th>
                <th className="ce-col-num">Цена</th>
                <th className="ce-col-num">Расход</th>
                <th className="ce-col-num">Фас./база</th>
                <th className="ce-col-num">Слой</th>
                <th className="ce-col-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="ce-readonly">{editingAssemblyId ? "Редактирование" : "Новый кубик"}</td>
                <td>
                  <input
                    className="ce-cell-input"
                    value={assemblyDraft.title}
                    onChange={(event) => onAssemblyDraftChange((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Клей плиточный"
                  />
                </td>
                <td>
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
                <td>
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
                <td>
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
                <td>
                  <input
                    className="ce-cell-input"
                    value={assemblyDraft.unit}
                    onChange={(event) => onAssemblyDraftChange((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                </td>
                <td className="ce-num">
                  <CatalogDecimalInput
                    className="ce-cell-input ce-num"
                    value={assemblyDraft.price}
                    onCommit={(value) => onAssemblyNumberChange("price", value)}
                  />
                </td>
                <td className="ce-num">
                  <CatalogDecimalInput
                    className="ce-cell-input ce-num"
                    value={assemblyDraft.consumptionPerM2}
                    onCommit={(value) => onAssemblyNumberChange("consumptionPerM2", value)}
                  />
                </td>
                <td className="ce-num">
                  <CatalogDecimalInput
                    className="ce-cell-input ce-num"
                    nullable
                    value={assemblyDraft.packageSize}
                    onCommit={(value) => onAssemblyNumberChange("packageSize", value)}
                  />
                </td>
                <td className="ce-num">
                  <CatalogDecimalInput
                    className="ce-cell-input ce-num"
                    nullable
                    value={assemblyDraft.layerMm}
                    onCommit={(value) => onAssemblyNumberChange("layerMm", value)}
                  />
                </td>
                <td className="ce-col-actions">
                  <div className="ce-row-actions">
                    {editingAssemblyId ? (
                      <button
                        type="button"
                        className="ce-row-action"
                        disabled={savingAssembly}
                        title="Отменить"
                        onClick={onCancelAssemblyEdit}
                      >
                        Отм.
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="ce-row-action ce-row-action-primary"
                      disabled={editingAssemblyId ? savingAssembly : creatingAssembly}
                      title={editingAssemblyId ? "Сохранить" : "Создать"}
                    >
                      {editingAssemblyId
                        ? savingAssembly
                          ? "…"
                          : "Сохр."
                        : creatingAssembly
                          ? "…"
                          : "Созд."}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </form>
    </section>
  );
}
