import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { FlooringCoveringDraft, FlooringLayoutDraft, FlooringPreparationDraft } from "./api/flooring-types";

type CatalogFormProps = {
  title: string;
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  children: ReactNode;
};

function CatalogForm({ title, mode, submitting, onSubmit, onCancel, children }: CatalogFormProps) {
  const submitLabel =
    mode === "edit"
      ? submitting
        ? "Запись в БД…"
        : "Сохранить в БД"
      : submitting
        ? "Запись в БД…"
        : "Создать в БД";

  return (
    <form
      className="ce-flooring-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="ce-flooring-form-head">
        <strong>{title}</strong>
        <div className="ce-toolbar-group">
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
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="ce-flooring-field">
      <span className="ce-flooring-field-label">{label}</span>
      {children}
    </label>
  );
}

export type FlooringCoveringEditFormProps = {
  draft: FlooringCoveringDraft;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onDraftChange: Dispatch<SetStateAction<FlooringCoveringDraft>>;
  onNumberChange: (field: keyof FlooringCoveringDraft, value: string) => void;
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
    <CatalogForm title="Редактировать покрытие" mode="edit" submitting={submitting} onSubmit={onSubmit} onCancel={onCancel}>
      <div className="ce-flooring-form-fields">
        <FormField label="Название">
          <input
            className="ce-input"
            value={draft.title}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Керамогранит"
          />
        </FormField>
        <FormField label="Материал ₽/м²">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            value={draft.materialPricePerM2 || ""}
            onChange={(event) => onNumberChange("materialPricePerM2", event.target.value)}
          />
        </FormField>
        <FormField label="Отход %">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            value={draft.baseWastePercent || ""}
            onChange={(event) => onNumberChange("baseWastePercent", event.target.value)}
          />
        </FormField>
        <FormField label="Инструмент ₽/м²">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            value={draft.instrumentPricePerM2 || ""}
            onChange={(event) => onNumberChange("instrumentPricePerM2", event.target.value)}
          />
        </FormField>
        <FormField label="Нужен плинтус">
          <select
            className="ce-input"
            value={draft.needsPlinth ? "1" : "0"}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, needsPlinth: event.target.value === "1" }))}
          >
            <option value="1">Да</option>
            <option value="0">Нет</option>
          </select>
        </FormField>
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
  onNumberChange: (field: keyof FlooringPreparationDraft, value: string) => void;
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
    <CatalogForm title="Редактировать подготовку" mode="edit" submitting={submitting} onSubmit={onSubmit} onCancel={onCancel}>
      <div className="ce-flooring-form-fields">
        <FormField label="Название">
          <input
            className="ce-input"
            value={draft.title}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Грунтование"
          />
        </FormField>
        <FormField label="Работа ₽/м²">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            value={draft.laborPricePerM2 || ""}
            onChange={(event) => onNumberChange("laborPricePerM2", event.target.value)}
          />
        </FormField>
        <FormField label="Материал ₽/м²">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            value={draft.materialPricePerM2 || ""}
            onChange={(event) => onNumberChange("materialPricePerM2", event.target.value)}
          />
        </FormField>
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
  onNumberChange: (field: keyof FlooringLayoutDraft, value: string) => void;
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
    <CatalogForm title="Редактировать укладку" mode="edit" submitting={submitting} onSubmit={onSubmit} onCancel={onCancel}>
      <div className="ce-flooring-form-fields">
        <FormField label="Название">
          <input
            className="ce-input"
            value={draft.title}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Прямая"
          />
        </FormField>
        <FormField label="Работа ₽/м²">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            min={0}
            value={draft.laborPricePerM2 || ""}
            onChange={(event) => onNumberChange("laborPricePerM2", event.target.value)}
          />
        </FormField>
        <FormField label="Коэф. работы">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            min={0}
            value={draft.laborFactor || ""}
            onChange={(event) => onNumberChange("laborFactor", event.target.value)}
          />
        </FormField>
        <FormField label="Доп. отход %">
          <input
            className="ce-input ce-num"
            type="number"
            step="0.01"
            value={draft.additionalWastePercent || ""}
            onChange={(event) => onNumberChange("additionalWastePercent", event.target.value)}
          />
        </FormField>
      </div>
    </CatalogForm>
  );
}
