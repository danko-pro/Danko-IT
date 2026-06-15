import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { FlooringCoveringDraft, FlooringLayoutDraft, FlooringPreparationDraft } from "./api/flooring-types";
import { consumablePricePerM2, normalizeNum } from "./api/flooring-mappers";
import { CatalogDecimalInput } from "./CatalogDecimalInput";
import { FlooringConsumablesTable } from "./FlooringConsumablesTable";

type CatalogFormProps = {
  title: string;
  editingLabel?: string;
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  extraActions?: ReactNode;
  children: ReactNode;
};

function CatalogForm({
  title,
  editingLabel,
  mode,
  submitting,
  onSubmit,
  onCancel,
  extraActions,
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
          {extraActions}
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

type FormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

function FormField({ label, children, className }: FormFieldProps) {
  return (
    <label className={`ce-flooring-form-field${className ? ` ${className}` : ""}`}>
      <span className="ce-flooring-form-field-label">{label}</span>
      {children}
    </label>
  );
}

function coveringDraftConsumablesPerM2(draft: FlooringCoveringDraft): number {
  const standard =
    consumablePricePerM2(draft.glueConsumptionPerM2, draft.gluePricePerUnit) +
    consumablePricePerM2(draft.primerConsumptionPerM2, draft.primerPricePerUnit) +
    consumablePricePerM2(draft.svpConsumptionPerM2, draft.svpPricePerUnit) +
    consumablePricePerM2(draft.groutConsumptionPerM2, draft.groutPricePerUnit) +
    normalizeNum(draft.instrumentPricePerM2);
  const custom = draft.customConsumables.reduce(
    (sum, item) => sum + consumablePricePerM2(item.consumptionPerM2, item.pricePerUnit),
    0,
  );
  return standard + custom;
}

function CoveringFormSummaryStrip({
  draft,
  formatMoney,
  formatPercent,
}: {
  draft: FlooringCoveringDraft;
  formatMoney: (value: number) => string;
  formatPercent: (value: number) => string;
}) {
  const material = normalizeNum(draft.materialPricePerM2);
  const consumables = coveringDraftConsumablesPerM2(draft);
  const total = material + consumables;

  return (
    <div className="ce-flooring-form-summary-strip">
      <span className="ce-flooring-form-summary-chip">
        Материал <strong>{formatMoney(material)} ₽/м²</strong>
      </span>
      <span className="ce-flooring-form-summary-chip">
        Отход <strong>{formatPercent(draft.baseWastePercent)}</strong>
      </span>
      <span className="ce-flooring-form-summary-chip">
        Расходники <strong>{formatMoney(consumables)} ₽/м²</strong>
      </span>
      <span className="ce-flooring-form-summary-chip ce-flooring-form-summary-total">
        Итого <strong>{formatMoney(total)} ₽/м²</strong>
      </span>
    </div>
  );
}

export type FlooringCoveringEditFormProps = {
  draft: FlooringCoveringDraft;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDraftChange: Dispatch<SetStateAction<FlooringCoveringDraft>>;
  onNumberChange: (field: keyof FlooringCoveringDraft, value: number) => void;
  formatMoney: (value: number) => string;
  formatPercent: (value: number) => string;
  extraActions?: ReactNode;
};

export function FlooringCoveringEditForm({
  draft,
  submitting,
  onSubmit,
  onCancel,
  onDraftChange,
  onNumberChange,
  formatMoney,
  formatPercent,
  extraActions,
}: FlooringCoveringEditFormProps) {
  const hasCustomConsumables = draft.customConsumables.length > 0;

  return (
    <CatalogForm
      title="Редактировать покрытие"
      editingLabel={draft.title}
      mode="edit"
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
      extraActions={extraActions}
    >
      <CoveringFormSummaryStrip draft={draft} formatMoney={formatMoney} formatPercent={formatPercent} />

      <div className="ce-flooring-form-grid">
        <FormField label="Название" className="ce-flooring-form-field-span-2">
          <input
            className="ce-cell-input ce-flooring-form-control"
            value={draft.title}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Керамогранит"
          />
        </FormField>
        <FormField label="Материал ₽/м²">
          <CatalogDecimalInput
            className="ce-cell-input ce-num ce-flooring-form-control"
            value={draft.materialPricePerM2}
            onCommit={(value) => onNumberChange("materialPricePerM2", value ?? 0)}
          />
        </FormField>
        <FormField label="Отход %">
          <CatalogDecimalInput
            className="ce-cell-input ce-num ce-flooring-form-control"
            value={draft.baseWastePercent}
            onCommit={(value) => onNumberChange("baseWastePercent", value ?? 0)}
          />
        </FormField>
        <FormField label="Подложка">
          <select
            className="ce-cell-input ce-cell-select ce-flooring-form-control"
            value={draft.underlayMode}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, underlayMode: event.target.value }))}
          >
            <option value="none">Нет</option>
            <option value="required">Нужна</option>
            <option value="optional">Опционально</option>
          </select>
        </FormField>
        <FormField label="Подложка расход/м²">
          <CatalogDecimalInput
            className="ce-cell-input ce-num ce-flooring-form-control"
            value={draft.underlayConsumptionPerM2}
            onCommit={(value) => onNumberChange("underlayConsumptionPerM2", value ?? 0)}
          />
        </FormField>
        <FormField label="Нужен плинтус">
          <select
            className="ce-cell-input ce-cell-select ce-flooring-form-control"
            value={draft.needsPlinth ? "1" : "0"}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, needsPlinth: event.target.value === "1" }))}
          >
            <option value="1">Да</option>
            <option value="0">Нет</option>
          </select>
        </FormField>
        <FormField label="Инструмент ₽/м²">
          <CatalogDecimalInput
            className="ce-cell-input ce-num ce-flooring-form-control"
            value={draft.instrumentPricePerM2}
            onCommit={(value) => onNumberChange("instrumentPricePerM2", value ?? 0)}
          />
        </FormField>
      </div>

      <FlooringConsumablesTable
        rows={[
          {
            label: "Клей",
            consumption: draft.glueConsumptionPerM2,
            unit: draft.glueUnit,
            pricePerUnit: draft.gluePricePerUnit,
            onConsumptionCommit: (value) => onNumberChange("glueConsumptionPerM2", value),
            onUnitChange: (value) => onDraftChange((prev) => ({ ...prev, glueUnit: value })),
            onPriceCommit: (value) => onNumberChange("gluePricePerUnit", value),
          },
          {
            label: "Грунт",
            consumption: draft.primerConsumptionPerM2,
            unit: draft.primerUnit,
            pricePerUnit: draft.primerPricePerUnit,
            onConsumptionCommit: (value) => onNumberChange("primerConsumptionPerM2", value),
            onUnitChange: (value) => onDraftChange((prev) => ({ ...prev, primerUnit: value })),
            onPriceCommit: (value) => onNumberChange("primerPricePerUnit", value),
          },
          {
            label: "СВП",
            consumption: draft.svpConsumptionPerM2,
            unit: draft.svpUnit,
            pricePerUnit: draft.svpPricePerUnit,
            onConsumptionCommit: (value) => onNumberChange("svpConsumptionPerM2", value),
            onUnitChange: (value) => onDraftChange((prev) => ({ ...prev, svpUnit: value })),
            onPriceCommit: (value) => onNumberChange("svpPricePerUnit", value),
          },
          {
            label: "Затирка",
            consumption: draft.groutConsumptionPerM2,
            unit: draft.groutUnit,
            pricePerUnit: draft.groutPricePerUnit,
            onConsumptionCommit: (value) => onNumberChange("groutConsumptionPerM2", value),
            onUnitChange: (value) => onDraftChange((prev) => ({ ...prev, groutUnit: value })),
            onPriceCommit: (value) => onNumberChange("groutPricePerUnit", value),
          },
        ]}
      />

      <details className="ce-flooring-custom-consumables" open={hasCustomConsumables}>
        <summary className="ce-flooring-custom-consumables-summary">
          Доп. расходники
          {!hasCustomConsumables ? <span className="ce-flooring-custom-consumables-empty-hint"> — нет</span> : null}
        </summary>
        {hasCustomConsumables ? (
          <div className="ce-table-wrap ce-flooring-table-wrap ce-flooring-consumables-table-wrap">
            <table className="ce-table ce-flooring-table ce-flooring-consumables-table">
              <thead>
                <tr>
                  <th>Доп. расходник</th>
                  <th className="ce-col-num">Расход/м²</th>
                  <th>Ед.</th>
                  <th className="ce-col-num">₽/ед.</th>
                  <th className="ce-col-actions">Действие</th>
                </tr>
              </thead>
              <tbody>
                {draft.customConsumables.map((item, index) => (
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
                    <td className="ce-num">
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
                    <td className="ce-num">
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
                    <td className="ce-col-actions">
                      <button
                        type="button"
                        className="ce-row-delete"
                        onClick={() =>
                          onDraftChange((prev) => ({
                            ...prev,
                            customConsumables: prev.customConsumables.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          }))
                        }
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </details>
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

      <div className="ce-flooring-form-note-wrap ce-flooring-form-note-wide">
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
  extraActions?: ReactNode;
};

export function FlooringPreparationEditForm({
  draft,
  submitting,
  onSubmit,
  onCancel,
  onDraftChange,
  onNumberChange,
  extraActions,
}: FlooringPreparationEditFormProps) {
  return (
    <CatalogForm
      title="Редактировать подготовку"
      editingLabel={draft.title}
      mode="edit"
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
      extraActions={extraActions}
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
  extraActions?: ReactNode;
};

export function FlooringLayoutEditForm({
  draft,
  submitting,
  onSubmit,
  onCancel,
  onDraftChange,
  onNumberChange,
  extraActions,
}: FlooringLayoutEditFormProps) {
  return (
    <CatalogForm
      title="Редактировать укладку"
      editingLabel={draft.title}
      mode="edit"
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
      extraActions={extraActions}
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
