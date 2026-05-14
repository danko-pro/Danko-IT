import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "../../../shared/controls";
import { formatMoney, MetricChip } from "../shared";
import type { CalculatorCeilingRoom, CalculatorProjectCeilingItem } from "./model";
import type { ProjectCeilingItemPayload } from "./payload";
import {
  buildInitialCeilingItemFormState,
  buildProjectCeilingItemPayload,
  calculateCeilingTotals,
  quantitySourceOptions,
  type CeilingItemFormState,
} from "./utils";

type CeilingItemFormProps = {
  projectId: number;
  rooms: CalculatorCeilingRoom[];
  initialItem?: CalculatorProjectCeilingItem;
  submitLabel: string;
  busy: boolean;
  surface?: "panel" | "embedded";
  onSubmit: (payload: ProjectCeilingItemPayload) => Promise<void>;
  onCancel: () => void;
};

export function CeilingItemForm(props: CeilingItemFormProps) {
  const [state, setState] = useState<CeilingItemFormState>(() => buildInitialCeilingItemFormState(props.initialItem));
  const previewTotals = calculateCeilingTotals(state);
  const canSubmit = Boolean(state.title.trim() && state.unit.trim());
  const formClassName =
    props.surface === "embedded"
      ? "flooring-techmap-form ceilings-item-form"
      : "subpanel calculator-stage-section p-3 flooring-techmap-form ceilings-item-form";

  function updateField(field: keyof CeilingItemFormState, value: string | boolean) {
    setState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    await props.onSubmit(buildProjectCeilingItemPayload(props.projectId, state));
  }

  return (
    <form className={formClassName} onSubmit={(event) => void handleSubmit(event)}>
      <div className="flooring-techmap-form-body">
        <CeilingFormStep title="1. Позиция" note="Название, категория и единица измерения">
          <div className="ceilings-form-grid ceilings-form-grid-main">
            <CeilingTextField
              disabled={props.busy}
              label="Название позиции"
              value={state.title}
              onChange={(value) => updateField("title", value)}
            />
            <CeilingTextField
              disabled={props.busy}
              label="Категория"
              value={state.category}
              onChange={(value) => updateField("category", value)}
            />
            <CeilingTextField
              disabled={props.busy}
              label="Единица"
              value={state.unit}
              onChange={(value) => updateField("unit", value)}
            />
          </div>
        </CeilingFormStep>

        <CeilingFormStep title="2. Количество и помещение" note="Источник количества и привязка к комнате">
          <div className="ceilings-form-grid ceilings-form-grid-main">
            <CeilingSelectField
              disabled={props.busy}
              label="Источник кол-ва"
              options={quantitySourceOptions}
              value={state.quantitySource}
              onChange={(value) => updateField("quantitySource", value)}
            />
            <CeilingNumberField
              disabled={props.busy}
              label="Кол-во"
              value={state.quantity}
              onChange={(value) => updateField("quantity", value)}
            />
            <CeilingSelectField
              disabled={props.busy}
              label="Помещение"
              options={[
                { value: "", label: "Без привязки" },
                ...props.rooms.map((room) => ({
                  value: String(room.room_id),
                  label: room.room_name || `Помещение #${room.room_id}`,
                })),
              ]}
              value={state.roomId}
              onChange={(value) => updateField("roomId", value)}
            />
          </div>
        </CeilingFormStep>

        <CeilingFormStep title="3. Ставки" note="Работы, материалы, оборудование, расходники и коэффициент">
          <div className="ceilings-form-grid ceilings-form-grid-rates">
            <CeilingNumberField
              disabled={props.busy}
              label="Работа цена"
              value={state.workPrice}
              onChange={(value) => updateField("workPrice", value)}
            />
            <CeilingNumberField
              disabled={props.busy}
              label="Материал цена"
              value={state.materialPrice}
              onChange={(value) => updateField("materialPrice", value)}
            />
            <CeilingNumberField
              disabled={props.busy}
              label="Оборуд. цена"
              value={state.equipmentPrice}
              onChange={(value) => updateField("equipmentPrice", value)}
            />
            <CeilingNumberField
              disabled={props.busy}
              label="Расходники цена"
              value={state.consumablesPrice}
              onChange={(value) => updateField("consumablesPrice", value)}
            />
            <CeilingNumberField
              disabled={props.busy}
              label="Коэффициент"
              value={state.priceFactor}
              onChange={(value) => updateField("priceFactor", value)}
            />
          </div>
        </CeilingFormStep>

        <CeilingFormStep title="4. Примечание и итог" note="Предпросмотр перед сохранением">
          <label className="flooring-techmap-toggle ceilings-form-toggle">
            <input
              checked={state.isEnabled}
              disabled={props.busy}
              type="checkbox"
              onChange={(event) => updateField("isEnabled", event.target.checked)}
            />
            <span>
              <strong>Включить в итоги</strong>
            </span>
          </label>

          <CeilingTextAreaField
            disabled={props.busy}
            label="Примечание"
            value={state.note}
            onChange={(value) => updateField("note", value)}
          />

          <div className="warmfloor-summary-strip">
            <MetricChip label="Работы" value={formatMoney(previewTotals.work_total)} />
            <MetricChip label="Материалы" value={formatMoney(previewTotals.material_total)} />
            <MetricChip label="Оборудование" value={formatMoney(previewTotals.equipment_total)} />
            <MetricChip label="Расходники" value={formatMoney(previewTotals.consumables_total)} />
          </div>

          <div className="warmfloor-estimate-total ceilings-form-total">
            <span>Итого позиции</span>
            <strong>{formatMoney(previewTotals.total)}</strong>
          </div>
        </CeilingFormStep>

        <div className="flooring-techmap-actions">
          <Button disabled={props.busy} type="button" variant="secondary" onClick={props.onCancel}>
            Отмена
          </Button>
          <Button disabled={props.busy || !canSubmit} type="submit">
            {props.busy ? "Сохраняю..." : props.submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CeilingFormStep(props: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flooring-techmap-step">
      <div className="flooring-techmap-step-head">
        <strong>{props.title}</strong>
        <span>{props.note}</span>
      </div>
      {props.children}
    </section>
  );
}

function CeilingTextField(props: { disabled: boolean; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <CeilingFieldShell label={props.label}>
      <input
        className="text-input text-input-compact"
        disabled={props.disabled}
        type="text"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </CeilingFieldShell>
  );
}

function CeilingNumberField(props: { disabled: boolean; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <CeilingFieldShell label={props.label}>
      <input
        className="text-input text-input-compact"
        disabled={props.disabled}
        min="0"
        step="0.01"
        type="number"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </CeilingFieldShell>
  );
}

function CeilingSelectField(props: {
  disabled: boolean;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <CeilingFieldShell label={props.label}>
      <select
        className="text-input text-input-compact text-input-select-with-help"
        disabled={props.disabled}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </CeilingFieldShell>
  );
}

function CeilingTextAreaField(props: {
  disabled: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <CeilingFieldShell label={props.label}>
      <textarea
        className="text-input text-input-compact ceilings-note-input"
        disabled={props.disabled}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </CeilingFieldShell>
  );
}

function CeilingFieldShell(props: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="field-label field-label-compact">{props.label}</div>
      <div className="field-control-shell">{props.children}</div>
    </label>
  );
}
