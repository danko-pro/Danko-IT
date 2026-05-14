import { useState, type FormEvent } from "react";

import { Button } from "../../../shared/controls";
import type { CalculatorProjectDetail } from "../model/types";
import {
  CalculatorStageEmptyState,
  CalculatorStageSectionHeader,
  formatArea,
  formatMeters,
  formatMoney,
  MetricChip,
  trimFloat,
} from "../shared";
import { CalculatorStageShell } from "../stage/shell";
import type {
  CalculatorCeilingRoom,
  CalculatorCeilingSpecificationItem,
  CalculatorProjectCeilingItem,
} from "./model";
import type { ProjectCeilingItemPayload } from "./payload";

type CeilingItemFormState = {
  title: string;
  category: string;
  unit: string;
  quantity: string;
  quantitySource: string;
  roomId: string;
  workPrice: string;
  materialPrice: string;
  equipmentPrice: string;
  consumablesPrice: string;
  priceFactor: string;
  note: string;
  isEnabled: boolean;
};

export type CeilingsStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  busyKey: string | null;
  onCreateProjectCeilingItem: (projectId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onUpdateProjectCeilingItem: (itemId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onDeleteProjectCeilingItem: (itemId: number) => Promise<void>;
};

const quantitySourceOptions = [
  { value: "manual", label: "Вручную" },
  { value: "room_area", label: "По площади" },
  { value: "room_perimeter", label: "По периметру" },
  { value: "pieces", label: "Штуки" },
];

export function CeilingsStageSection(props: CeilingsStageSectionProps) {
  const ceilings = props.projectDetail?.ceilings ?? null;
  const summary = ceilings?.summary;
  const hasCeilingData = Boolean(ceilings && (ceilings.items.length > 0 || ceilings.rooms.length > 0));
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const projectId = props.projectDetail?.project.id ?? null;
  const configPackageCode = ceilings?.config?.default_package_code ?? ceilings?.config?.package_code ?? null;

  return (
    <CalculatorStageShell
      className="ceilings-stage"
      eyebrow="Потолки"
      title="Потолочный калькулятор"
      isReady={Boolean(props.projectDetail)}
    >
      {!ceilings || !projectId ? (
        <CalculatorStageEmptyState>Сначала выберите объект калькулятора.</CalculatorStageEmptyState>
      ) : (
        <div className="space-y-4">
          <section className="subpanel calculator-stage-section warmfloor-summary-panel flooring-summary-panel p-3">
            <CalculatorStageSectionHeader
              kicker="Сводка"
              title="Потолки по объекту"
              note={configPackageCode ? `Пакет: ${configPackageCode}` : "Пакет потолков не выбран"}
              actions={
                <Button type="button" onClick={() => setCreateFormOpen((current) => !current)}>
                  {createFormOpen ? "Скрыть форму" : "Добавить позицию"}
                </Button>
              }
            />
            {summary ? (
              <>
                <div className="warmfloor-summary-total">
                  <div>
                    <div className="warmfloor-summary-label">Итого по потолкам</div>
                    <div className="warmfloor-summary-value">{formatMoney(summary.grand_total)}</div>
                  </div>
                  <div className="warmfloor-summary-rate">
                    {summary.enabled_items_count} / {summary.items_count} позиций включено
                  </div>
                </div>
                <div className="warmfloor-summary-strip">
                  <MetricChip label="Работы" value={formatMoney(summary.work_total)} />
                  <MetricChip label="Материалы" value={formatMoney(summary.material_total)} />
                  <MetricChip label="Оборудование" value={formatMoney(summary.equipment_total)} />
                  <MetricChip label="Расходники" value={formatMoney(summary.consumables_total)} />
                </div>
              </>
            ) : null}
            {!hasCeilingData ? (
              <CalculatorStageEmptyState>
                <div className="space-y-3">
                  <div>Потолочные позиции пока не добавлены.</div>
                  <Button type="button" onClick={() => setCreateFormOpen(true)}>
                    Добавить позицию
                  </Button>
                </div>
              </CalculatorStageEmptyState>
            ) : null}
          </section>

          {createFormOpen ? (
            <CeilingItemForm
              busy={props.busyKey === `calculator-ceiling-item-create-${projectId}`}
              projectId={projectId}
              rooms={ceilings.rooms}
              submitLabel="Создать позицию"
              onCancel={() => setCreateFormOpen(false)}
              onSubmit={async (payload) => {
                await props.onCreateProjectCeilingItem(projectId, payload);
                setCreateFormOpen(false);
              }}
            />
          ) : null}

          <CeilingRoomsList rooms={ceilings.rooms} />
          <CeilingItemsList
            busyKey={props.busyKey}
            editingItemId={editingItemId}
            items={ceilings.items}
            projectId={projectId}
            rooms={ceilings.rooms}
            setEditingItemId={setEditingItemId}
            onDeleteProjectCeilingItem={props.onDeleteProjectCeilingItem}
            onUpdateProjectCeilingItem={props.onUpdateProjectCeilingItem}
          />
          <CeilingSpecificationList specification={ceilings.specification} />
        </div>
      )}
    </CalculatorStageShell>
  );
}

function CeilingRoomsList(props: { rooms: CalculatorCeilingRoom[] }) {
  return (
    <section className="subpanel calculator-stage-section p-3">
      <CalculatorStageSectionHeader
        kicker="Помещения"
        title="Потолочные настройки по комнатам"
        note={`${props.rooms.length} помещений`}
      />
      {props.rooms.length ? (
        <div className="warmfloor-estimate-list">
          {props.rooms.map((room) => (
            <article className="warmfloor-estimate-row-shell" key={room.room_id}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{room.is_enabled ? "Включено" : "Выключено"}</span>
                  <span>{room.room_name || `Помещение #${room.room_id}`}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>{formatArea(room.ceiling_area_m2 ?? room.base_ceiling_area_m2 ?? 0)}</span>
                  <span>{formatMeters(room.perimeter_m ?? room.base_perimeter_m ?? 0)}</span>
                  <span>{room.package_code_snapshot || "Пакет не задан"}</span>
                </div>
              </div>
              {room.note ? <div className="warmfloor-estimate-children">{room.note}</div> : null}
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>По потолкам пока нет настроек помещений.</CalculatorStageEmptyState>
      )}
    </section>
  );
}

function CeilingItemsList(props: {
  items: CalculatorProjectCeilingItem[];
  rooms: CalculatorCeilingRoom[];
  projectId: number;
  editingItemId: number | null;
  busyKey: string | null;
  setEditingItemId: (itemId: number | null) => void;
  onUpdateProjectCeilingItem: (itemId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onDeleteProjectCeilingItem: (itemId: number) => Promise<void>;
}) {
  return (
    <section className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader kicker="Позиции" title="Потолочная ведомость" note={`${props.items.length} строк`} />
      {props.items.length ? (
        <div className="warmfloor-estimate-list">
          {props.items.map((item) => (
            <article className="warmfloor-estimate-row-shell" key={item.id}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{item.category_snapshot || "Потолки"}</span>
                  <span>{item.title_snapshot}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>
                    {trimFloat(item.quantity)} {item.unit_snapshot}
                  </span>
                  <span>{formatMoney(item.total)}</span>
                </div>
              </div>
              <div className="warmfloor-estimate-children">
                <CeilingMoneyBreakdown item={item} />
                {!item.is_enabled ? <span>Позиция выключена из итогов.</span> : null}
                {item.note_snapshot ? <span>{item.note_snapshot}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => props.setEditingItemId(props.editingItemId === item.id ? null : item.id)}>
                  {props.editingItemId === item.id ? "Закрыть" : "Изменить"}
                </Button>
                <Button
                  disabled={props.busyKey === `calculator-ceiling-item-delete-${item.id}`}
                  type="button"
                  variant="secondary"
                  onClick={() => void props.onDeleteProjectCeilingItem(item.id)}
                >
                  Удалить
                </Button>
              </div>
              {props.editingItemId === item.id ? (
                <div className="mt-3">
                  <CeilingItemForm
                    busy={props.busyKey === `calculator-ceiling-item-save-${item.id}`}
                    initialItem={item}
                    projectId={props.projectId}
                    rooms={props.rooms}
                    submitLabel="Сохранить"
                    onCancel={() => props.setEditingItemId(null)}
                    onSubmit={async (payload) => {
                      await props.onUpdateProjectCeilingItem(item.id, { ...payload, project_id: props.projectId });
                      props.setEditingItemId(null);
                    }}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>Потолочные позиции пока не добавлены.</CalculatorStageEmptyState>
      )}
    </section>
  );
}

function CeilingItemForm(props: {
  projectId: number;
  rooms: CalculatorCeilingRoom[];
  initialItem?: CalculatorProjectCeilingItem;
  submitLabel: string;
  busy: boolean;
  onSubmit: (payload: ProjectCeilingItemPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState<CeilingItemFormState>(() => buildInitialCeilingItemFormState(props.initialItem));
  const previewTotals = calculateCeilingTotals(state);
  const canSubmit = Boolean(state.title.trim() && state.unit.trim());

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
    <form className="subpanel calculator-stage-section p-3 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
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

function CeilingSpecificationList(props: { specification: CalculatorCeilingSpecificationItem[] }) {
  return (
    <section className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader
        kicker="Спецификация"
        title="Сгруппированные потолочные позиции"
        note={`${props.specification.length} групп`}
      />
      {props.specification.length ? (
        <div className="warmfloor-estimate-list">
          {props.specification.map((item) => (
            <article className="warmfloor-estimate-row-shell" key={`${item.category}-${item.title}-${item.unit}`}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{item.category || "Потолки"}</span>
                  <span>{item.title}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>
                    {trimFloat(item.quantity)} {item.unit}
                  </span>
                  <span>{formatMoney(item.total)}</span>
                </div>
              </div>
              <div className="warmfloor-estimate-children">
                <CeilingMoneyBreakdown item={item} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>Спецификация по потолкам пока пустая.</CalculatorStageEmptyState>
      )}
    </section>
  );
}

function CeilingMoneyBreakdown(props: {
  item: Pick<
    CalculatorProjectCeilingItem | CalculatorCeilingSpecificationItem,
    "work_total" | "material_total" | "equipment_total" | "consumables_total"
  >;
}) {
  return (
    <>
      <span>Работы: {formatMoney(props.item.work_total)}</span>
      <span>Материалы: {formatMoney(props.item.material_total)}</span>
      <span>Оборудование: {formatMoney(props.item.equipment_total)}</span>
      <span>Расходники: {formatMoney(props.item.consumables_total)}</span>
    </>
  );
}

function buildInitialCeilingItemFormState(item?: CalculatorProjectCeilingItem): CeilingItemFormState {
  return {
    title: item?.title_snapshot ?? "",
    category: item?.category_snapshot ?? "Потолки",
    unit: item?.unit_snapshot ?? "м²",
    quantity: item ? String(item.quantity) : "1",
    quantitySource: item?.quantity_source ?? "manual",
    roomId: item?.room_id ? String(item.room_id) : "",
    workPrice: item ? String(item.work_price_snapshot) : "0",
    materialPrice: item ? String(item.material_price_snapshot) : "0",
    equipmentPrice: item ? String(item.equipment_price_snapshot) : "0",
    consumablesPrice: item ? String(item.consumables_price_snapshot) : "0",
    priceFactor: item ? String(item.price_factor_snapshot) : "1",
    note: item?.note_snapshot ?? "",
    isEnabled: item?.is_enabled ?? true,
  };
}

function buildProjectCeilingItemPayload(projectId: number, state: CeilingItemFormState): ProjectCeilingItemPayload {
  const totals = calculateCeilingTotals(state);
  return {
    project_id: projectId,
    room_id: state.roomId ? Number.parseInt(state.roomId, 10) : null,
    source_catalog_item_id: null,
    source_code_snapshot: null,
    title_snapshot: state.title.trim(),
    category_snapshot: state.category.trim() || null,
    unit_snapshot: state.unit.trim(),
    quantity: toNonNegativeNumber(state.quantity),
    quantity_source: state.quantitySource || "manual",
    quantity_formula_snapshot: null,
    work_price_snapshot: toNonNegativeNumber(state.workPrice),
    material_price_snapshot: toNonNegativeNumber(state.materialPrice),
    equipment_price_snapshot: toNonNegativeNumber(state.equipmentPrice),
    consumables_price_snapshot: toNonNegativeNumber(state.consumablesPrice),
    price_factor_snapshot: toNonNegativeNumber(state.priceFactor, 1),
    work_total: totals.work_total,
    material_total: totals.material_total,
    equipment_total: totals.equipment_total,
    consumables_total: totals.consumables_total,
    total: totals.total,
    note_snapshot: state.note.trim() || null,
    is_enabled: state.isEnabled,
    sort_order: 100,
  };
}

function calculateCeilingTotals(state: CeilingItemFormState) {
  const quantity = toNonNegativeNumber(state.quantity);
  const factor = toNonNegativeNumber(state.priceFactor, 1);
  const work_total = quantity * toNonNegativeNumber(state.workPrice) * factor;
  const material_total = quantity * toNonNegativeNumber(state.materialPrice) * factor;
  const equipment_total = quantity * toNonNegativeNumber(state.equipmentPrice) * factor;
  const consumables_total = quantity * toNonNegativeNumber(state.consumablesPrice) * factor;
  return {
    work_total,
    material_total,
    equipment_total,
    consumables_total,
    total: work_total + material_total + equipment_total + consumables_total,
  };
}

function toNonNegativeNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}
