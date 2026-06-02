import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { FlooringCoveringDraft, FlooringLayoutDraft, FlooringPreparationDraft } from "./api/flooring-types";
import { CatalogDecimalInput } from "./CatalogDecimalInput";

type CatalogFormProps = {
  title: string;
  editingLabel?: string;
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  children: ReactNode;
};

function CatalogForm({
  title,
  editingLabel,
  mode,
  submitting,
  onSubmit,
  onCancel,
  children,
}: CatalogFormProps) {
  const submitLabel =
    mode === "edit"
      ? submitting
        ? "Запись в БД…"
        : "Сохранить в БД"
      : submitting
        ? "Запись в БД…"
        : "Создать в БД";

  const headTitle =
    editingLabel && editingLabel.trim().length > 0 ? `${title} — «${editingLabel.trim()}»` : title;

  return (
    <form
      className="ce-flooring-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="ce-flooring-form-head">
        <div className="ce-flooring-form-head-copy">
          <strong>{headTitle}</strong>
        </div>
        <div className="ce-toolbar-group ce-flooring-form-toolbar">
          {mode === "edit" && onCancel ? (
            <button type="button" className="ce-btn ce-btn-sm" disabled={submitting} onClick={onCancel}>
              Отмена
            </button>
          ) : null}
          <button type="submit" className="ce-btn ce-btn-primary ce-btn-sm" disabled={submitting}>
            {submitLabel}
          </button>
        </div>
      </div>
      <div className="ce-flooring-form-content">{children}</div>
    </form>
  );
}

export type FlooringCoveringEditFormProps = {
  draft: FlooringCoveringDraft;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDraftChange: Dispatch<SetStateAction<FlooringCoveringDraft>>;
  onNumberChange: (field: keyof FlooringCoveringDraft, value: number) => void;
};

export function FlooringCoveringEditForm({
  draft,
  submitting,
  onSubmit,
  onCancel,
  onDraftChange,
  onNumberChange,
}: FlooringCoveringEditFormProps) {
  return (
    <CatalogForm
      title="Редактировать покрытие"
      editingLabel={draft.title}
      mode="edit"
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-form-table-wrap">
        <table className="ce-table ce-flooring-table ce-flooring-form-table">
          <thead>
            <tr>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-num">Материал ₽/м²</th>
              <th className="ce-col-num">Отход %</th>
              <th>Подложка</th>
              <th className="ce-col-num">Подложка расход/м²</th>
              <th>Нужен плинтус</th>
              <th className="ce-col-num">Инструмент ₽/м²</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.title}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Керамогранит"
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.materialPricePerM2}
                  onCommit={(value) => onNumberChange("materialPricePerM2", value ?? 0)}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.baseWastePercent}
                  onCommit={(value) => onNumberChange("baseWastePercent", value ?? 0)}
                />
              </td>
              <td>
                <select
                  className="ce-cell-input ce-cell-select"
                  value={draft.underlayMode}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, underlayMode: event.target.value }))}
                >
                  <option value="none">Нет</option>
                  <option value="required">Нужна</option>
                  <option value="optional">Опционально</option>
                </select>
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.underlayConsumptionPerM2}
                  onCommit={(value) => onNumberChange("underlayConsumptionPerM2", value ?? 0)}
                />
              </td>
              <td>
                <select
                  className="ce-cell-input ce-cell-select"
                  value={draft.needsPlinth ? "1" : "0"}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, needsPlinth: event.target.value === "1" }))}
                >
                  <option value="1">Да</option>
                  <option value="0">Нет</option>
                </select>
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.instrumentPricePerM2}
                  onCommit={(value) => onNumberChange("instrumentPricePerM2", value ?? 0)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-form-table-wrap">
        <table className="ce-table ce-flooring-table ce-flooring-form-table">
          <thead>
            <tr>
              <th className="ce-col-title">Расходник</th>
              <th className="ce-col-num">Расход/м²</th>
              <th>Ед.</th>
              <th className="ce-col-num">₽/ед.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="ce-readonly">Клей</td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.glueConsumptionPerM2}
                  onCommit={(value) => onNumberChange("glueConsumptionPerM2", value ?? 0)}
                />
              </td>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.glueUnit}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, glueUnit: event.target.value }))}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.gluePricePerUnit}
                  onCommit={(value) => onNumberChange("gluePricePerUnit", value ?? 0)}
                />
              </td>
            </tr>
            <tr>
              <td className="ce-readonly">Грунт</td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.primerConsumptionPerM2}
                  onCommit={(value) => onNumberChange("primerConsumptionPerM2", value ?? 0)}
                />
              </td>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.primerUnit}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, primerUnit: event.target.value }))}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.primerPricePerUnit}
                  onCommit={(value) => onNumberChange("primerPricePerUnit", value ?? 0)}
                />
              </td>
            </tr>
            <tr>
              <td className="ce-readonly">СВП</td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.svpConsumptionPerM2}
                  onCommit={(value) => onNumberChange("svpConsumptionPerM2", value ?? 0)}
                />
              </td>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.svpUnit}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, svpUnit: event.target.value }))}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.svpPricePerUnit}
                  onCommit={(value) => onNumberChange("svpPricePerUnit", value ?? 0)}
                />
              </td>
            </tr>
            <tr>
              <td className="ce-readonly">Затирка</td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.groutConsumptionPerM2}
                  onCommit={(value) => onNumberChange("groutConsumptionPerM2", value ?? 0)}
                />
              </td>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.groutUnit}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, groutUnit: event.target.value }))}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.groutPricePerUnit}
                  onCommit={(value) => onNumberChange("groutPricePerUnit", value ?? 0)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-form-table-wrap">
        <table className="ce-table ce-flooring-table ce-flooring-form-table">
          <thead>
            <tr>
              <th>Доп. расходник</th>
              <th>Расход/м²</th>
              <th>Ед.</th>
              <th>Цена/ед.</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {draft.customConsumables.length === 0 ? (
              <tr>
                <td colSpan={5} className="ce-empty">
                  Дополнительных расходников нет.
                </td>
              </tr>
            ) : (
              draft.customConsumables.map((item, index) => (
                <tr key={`${item.title}-${index}`}>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={item.title}
                      onChange={(event) =>
                        onDraftChange((prev) => ({
                          ...prev,
                          customConsumables: prev.customConsumables.map((current, currentIndex) =>
                            currentIndex === index ? { ...current, title: event.target.value } : current,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td>
                    <CatalogDecimalInput
                      className="ce-cell-input ce-num"
                      value={item.consumptionPerM2}
                      onCommit={(value) =>
                        onDraftChange((prev) => ({
                          ...prev,
                          customConsumables: prev.customConsumables.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, consumptionPerM2: value ?? 0 }
                              : current,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={item.unit}
                      onChange={(event) =>
                        onDraftChange((prev) => ({
                          ...prev,
                          customConsumables: prev.customConsumables.map((current, currentIndex) =>
                            currentIndex === index ? { ...current, unit: event.target.value } : current,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td>
                    <CatalogDecimalInput
                      className="ce-cell-input ce-num"
                      value={item.pricePerUnit}
                      onCommit={(value) =>
                        onDraftChange((prev) => ({
                          ...prev,
                          customConsumables: prev.customConsumables.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, pricePerUnit: value ?? 0 }
                              : current,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ce-row-delete"
                      onClick={() =>
                        onDraftChange((prev) => ({
                          ...prev,
                          customConsumables: prev.customConsumables.filter((_, currentIndex) => currentIndex !== index),
                        }))
                      }
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="ce-btn ce-btn-sm"
        onClick={() =>
          onDraftChange((prev) => ({
            ...prev,
            customConsumables: [
              ...prev.customConsumables,
              { title: "", consumptionPerM2: 0, unit: "pcs", pricePerUnit: 0 },
            ],
          }))
        }
      >
        Добавить расходник
      </button>

      <div className="ce-flooring-form-note-wrap">
        <label className="ce-flooring-form-note-label">Примечание</label>
        <textarea
          className="ce-cell-input ce-flooring-form-note-input"
          value={draft.note}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, note: event.target.value }))}
        />
      </div>
    </CatalogForm>
  );
}

export type FlooringPreparationEditFormProps = {
  draft: FlooringPreparationDraft;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDraftChange: Dispatch<SetStateAction<FlooringPreparationDraft>>;
  onNumberChange: (field: keyof FlooringPreparationDraft, value: number) => void;
};

export function FlooringPreparationEditForm({
  draft,
  submitting,
  onSubmit,
  onCancel,
  onDraftChange,
  onNumberChange,
}: FlooringPreparationEditFormProps) {
  return (
    <CatalogForm
      title="Редактировать подготовку"
      editingLabel={draft.title}
      mode="edit"
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-form-table-wrap">
        <table className="ce-table ce-flooring-table ce-flooring-form-table">
          <thead>
            <tr>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-num">Работа ₽/м²</th>
              <th className="ce-col-num">Материал ₽/м²</th>
              <th className="ce-col-num">Грунт расход/м²</th>
              <th>Грунт ед.</th>
              <th className="ce-col-num">Грунт ₽/ед.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.title}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Грунтование"
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.laborPricePerM2}
                  onCommit={(value) => onNumberChange("laborPricePerM2", value ?? 0)}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.materialPricePerM2}
                  onCommit={(value) => onNumberChange("materialPricePerM2", value ?? 0)}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.primerConsumptionPerM2}
                  onCommit={(value) => onNumberChange("primerConsumptionPerM2", value ?? 0)}
                />
              </td>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.primerUnit}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, primerUnit: event.target.value }))}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.primerPricePerUnit}
                  onCommit={(value) => onNumberChange("primerPricePerUnit", value ?? 0)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ce-flooring-form-note-wrap">
        <label className="ce-flooring-form-note-label">Примечание</label>
        <textarea
          className="ce-cell-input ce-flooring-form-note-input"
          value={draft.note}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, note: event.target.value }))}
        />
      </div>
    </CatalogForm>
  );
}

export type FlooringLayoutEditFormProps = {
  draft: FlooringLayoutDraft;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDraftChange: Dispatch<SetStateAction<FlooringLayoutDraft>>;
  onNumberChange: (field: keyof FlooringLayoutDraft, value: number) => void;
};

export function FlooringLayoutEditForm({
  draft,
  submitting,
  onSubmit,
  onCancel,
  onDraftChange,
  onNumberChange,
}: FlooringLayoutEditFormProps) {
  return (
    <CatalogForm
      title="Редактировать укладку"
      editingLabel={draft.title}
      mode="edit"
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-form-table-wrap">
        <table className="ce-table ce-flooring-table ce-flooring-form-table">
          <thead>
            <tr>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-num">Работа ₽/м²</th>
              <th className="ce-col-num">Коэф. работы</th>
              <th className="ce-col-num">Доп. отход %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input
                  className="ce-cell-input"
                  value={draft.title}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Прямая"
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.laborPricePerM2}
                  onCommit={(value) => onNumberChange("laborPricePerM2", value ?? 0)}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.laborFactor}
                  onCommit={(value) => onNumberChange("laborFactor", value ?? 0)}
                />
              </td>
              <td className="ce-num">
                <CatalogDecimalInput
                  className="ce-cell-input ce-num"
                  value={draft.additionalWastePercent}
                  onCommit={(value) => onNumberChange("additionalWastePercent", value ?? 0)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ce-flooring-form-note-wrap">
        <label className="ce-flooring-form-note-label">Примечание</label>
        <textarea
          className="ce-cell-input ce-flooring-form-note-input"
          value={draft.note}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, note: event.target.value }))}
        />
      </div>
    </CatalogForm>
  );
}
