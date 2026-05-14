import { useState, type FormEvent } from "react";

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
      ? "calculator-stage-section rounded-3xl border border-white/10 bg-slate-950/20 p-3 space-y-3"
      : "subpanel calculator-stage-section p-3 space-y-3";

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
      <div className="grid gap-3 md:grid-cols-2">
        <CeilingTextField label="Название позиции" value={state.title} onChange={(value) => updateField("title", value)} />
        <CeilingTextField label="Категория" value={state.category} onChange={(value) => updateField("category", value)} />
        <CeilingTextField label="Единица" value={state.unit} onChange={(value) => updateField("unit", value)} />
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Источник кол-ва</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
            disabled={props.busy}
            value={state.quantitySource}
            onChange={(event) => updateField("quantitySource", event.target.value)}
          >
            {quantitySourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <CeilingNumberField label="Кол-во" value={state.quantity} onChange={(value) => updateField("quantity", value)} />
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Помещение</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
            disabled={props.busy}
            value={state.roomId}
            onChange={(event) => updateField("roomId", event.target.value)}
          >
            <option value="">Без привязки</option>
            {props.rooms.map((room) => (
              <option key={room.room_id} value={String(room.room_id)}>
                {room.room_name || `Помещение #${room.room_id}`}
              </option>
            ))}
          </select>
        </label>
        <CeilingNumberField label="Работа цена" value={state.workPrice} onChange={(value) => updateField("workPrice", value)} />
        <CeilingNumberField label="Материал цена" value={state.materialPrice} onChange={(value) => updateField("materialPrice", value)} />
        <CeilingNumberField label="Оборуд. цена" value={state.equipmentPrice} onChange={(value) => updateField("equipmentPrice", value)} />
        <CeilingNumberField label="Расходники цена" value={state.consumablesPrice} onChange={(value) => updateField("consumablesPrice", value)} />
        <CeilingNumberField label="Коэффициент" value={state.priceFactor} onChange={(value) => updateField("priceFactor", value)} />
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-200">
          <input checked={state.isEnabled} disabled={props.busy} type="checkbox" onChange={(event) => updateField("isEnabled", event.target.checked)} />
          Включить в итоги
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Примечание</span>
        <textarea
          className="min-h-20 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
          disabled={props.busy}
          value={state.note}
          onChange={(event) => updateField("note", event.target.value)}
        />
      </label>

      <div className="warmfloor-summary-strip">
        <MetricChip label="Работы" value={formatMoney(previewTotals.work_total)} />
        <MetricChip label="Материалы" value={formatMoney(previewTotals.material_total)} />
        <MetricChip label="Оборудование" value={formatMoney(previewTotals.equipment_total)} />
        <MetricChip label="Итог" value={formatMoney(previewTotals.total)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={props.busy} type="button" variant="secondary" onClick={props.onCancel}>
          Отмена
        </Button>
        <Button disabled={props.busy || !canSubmit} type="submit">
          {props.busy ? "Сохраняю..." : props.submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CeilingTextField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{props.label}</span>
      <input
        className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
        type="text"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function CeilingNumberField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{props.label}</span>
      <input
        className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
        min="0"
        step="0.01"
        type="number"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
