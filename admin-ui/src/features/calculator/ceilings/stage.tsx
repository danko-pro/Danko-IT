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
import type { ProjectCeilingItemPayload } from "./payload";
import type {
  CalculatorCeilingRoom,
  CalculatorCeilingSpecificationItem,
  CalculatorProjectCeilingItem,
} from "./model";

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
  { value: "manual", label: "Р’СЂСѓС‡РЅСѓСЋ" },
  { value: "room_area", label: "РџРѕ РїР»РѕС‰Р°РґРё" },
  { value: "room_perimeter", label: "РџРѕ РїРµСЂРёРјРµС‚СЂСѓ" },
  { value: "pieces", label: "РЁС‚СѓРєРё" },
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
      eyebrow="РџРѕС‚РѕР»РєРё"
      title="РџРѕС‚РѕР»РѕС‡РЅС‹Р№ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂ"
      isReady={Boolean(props.projectDetail)}
    >
      {!ceilings || !projectId ? (
        <CalculatorStageEmptyState>РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ РѕР±СЉРµРєС‚ РєР°Р»СЊРєСѓР»СЏС‚РѕСЂР°.</CalculatorStageEmptyState>
      ) : (
        <div className="space-y-4">
          <section className="subpanel calculator-stage-section warmfloor-summary-panel flooring-summary-panel p-3">
            <CalculatorStageSectionHeader
              kicker="РЎРІРѕРґРєР°"
              title="РџРѕС‚РѕР»РєРё РїРѕ РѕР±СЉРµРєС‚Сѓ"
              note={configPackageCode ? `РџР°РєРµС‚: ${configPackageCode}` : "РџР°РєРµС‚ РїРѕС‚РѕР»РєРѕРІ РЅРµ РІС‹Р±СЂР°РЅ"}
              actions={
                <Button type="button" onClick={() => setCreateFormOpen((current) => !current)}>
                  {createFormOpen ? "РЎРєСЂС‹С‚СЊ С„РѕСЂРјСѓ" : "Р”РѕР±Р°РІРёС‚СЊ РїРѕР·РёС†РёСЋ"}
                </Button>
              }
            />
            {summary ? (
              <>
                <div className="warmfloor-summary-total">
                  <div>
                    <div className="warmfloor-summary-label">РС‚РѕРіРѕ РїРѕ РїРѕС‚РѕР»РєР°Рј</div>
                    <div className="warmfloor-summary-value">{formatMoney(summary.grand_total)}</div>
                  </div>
                  <div className="warmfloor-summary-rate">
                    {summary.enabled_items_count} / {summary.items_count} РїРѕР·РёС†РёР№ РІРєР»СЋС‡РµРЅРѕ
                  </div>
                </div>
                <div className="warmfloor-summary-strip">
                  <MetricChip label="Р Р°Р±РѕС‚С‹" value={formatMoney(summary.work_total)} />
                  <MetricChip label="РњР°С‚РµСЂРёР°Р»С‹" value={formatMoney(summary.material_total)} />
                  <MetricChip label="РћР±РѕСЂСѓРґРѕРІР°РЅРёРµ" value={formatMoney(summary.equipment_total)} />
                  <MetricChip label="Р Р°СЃС…РѕРґРЅРёРєРё" value={formatMoney(summary.consumables_total)} />
                </div>
              </>
            ) : null}
            {!hasCeilingData ? (
              <CalculatorStageEmptyState>
                <div className="space-y-3">
                  <div>РџРѕС‚РѕР»РѕС‡РЅС‹Рµ РїРѕР·РёС†РёРё РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅС‹.</div>
                  <Button type="button" onClick={() => setCreateFormOpen(true)}>
                    Р”РѕР±Р°РІРёС‚СЊ РїРѕР·РёС†РёСЋ
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
              submitLabel="РЎРѕР·РґР°С‚СЊ РїРѕР·РёС†РёСЋ"
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
        kicker="РџРѕРјРµС‰РµРЅРёСЏ"
        title="РџРѕС‚РѕР»РѕС‡РЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё РїРѕ РєРѕРјРЅР°С‚Р°Рј"
        note={`${props.rooms.length} РїРѕРјРµС‰РµРЅРёР№`}
      />
      {props.rooms.length ? (
        <div className="warmfloor-estimate-list">
          {props.rooms.map((room) => (
            <article className="warmfloor-estimate-row-shell" key={room.room_id}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{room.is_enabled ? "Р’РєР»СЋС‡РµРЅРѕ" : "Р’С‹РєР»СЋС‡РµРЅРѕ"}</span>
                  <span>{room.room_name || `РџРѕРјРµС‰РµРЅРёРµ #${room.room_id}`}</span>
                </div>
                <div className="warmfloor-estimate-meta">
                  <span>{formatArea(room.ceiling_area_m2 ?? room.base_ceiling_area_m2 ?? 0)}</span>
                  <span>{formatMeters(room.perimeter_m ?? room.base_perimeter_m ?? 0)}</span>
                  <span>{room.package_code_snapshot || "РџР°РєРµС‚ РЅРµ Р·Р°РґР°РЅ"}</span>
                </div>
              </div>
              {room.note ? <div className="warmfloor-estimate-children">{room.note}</div> : null}
            </article>
          ))}
        </div>
      ) : (
        <CalculatorStageEmptyState>РџРѕ РїРѕС‚РѕР»РєР°Рј РїРѕРєР° РЅРµС‚ РЅР°СЃС‚СЂРѕРµРє РїРѕРјРµС‰РµРЅРёР№.</CalculatorStageEmptyState>
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
      <CalculatorStageSectionHeader kicker="РџРѕР·РёС†РёРё" title="РџРѕС‚РѕР»РѕС‡РЅР°СЏ РІРµРґРѕРјРѕСЃС‚СЊ" note={`${props.items.length} СЃС‚СЂРѕРє`} />
      {props.items.length ? (
        <div className="warmfloor-estimate-list">
          {props.items.map((item) => (
            <article className="warmfloor-estimate-row-shell" key={item.id}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{item.category_snapshot || "РџРѕС‚РѕР»РєРё"}</span>
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
                {!item.is_enabled ? <span>РџРѕР·РёС†РёСЏ РІС‹РєР»СЋС‡РµРЅР° РёР· РёС‚РѕРіРѕРІ.</span> : null}
                {item.note_snapshot ? <span>{item.note_snapshot}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => props.setEditingItemId(props.editingItemId === item.id ? null : item.id)}>
                  {props.editingItemId === item.id ? "Р—Р°РєСЂС‹С‚СЊ" : "РР·РјРµРЅРёС‚СЊ"}
                </Button>
                <Button
                  disabled={props.busyKey === `calculator-ceiling-item-delete-${item.id}`}
                  type="button"
                  variant="secondary"
                  onClick={() => void props.onDeleteProjectCeilingItem(item.id)}
                >
                  РЈРґР°Р»РёС‚СЊ
                </Button>
              </div>
              {props.editingItemId === item.id ? (
                <div className="mt-3">
                  <CeilingItemForm
                    busy={props.busyKey === `calculator-ceiling-item-save-${item.id}`}
                    initialItem={item}
                    projectId={props.projectId}
                    rooms={props.rooms}
                    submitLabel="РЎРѕС…СЂР°РЅРёС‚СЊ"
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
        <CalculatorStageEmptyState>РџРѕС‚РѕР»РѕС‡РЅС‹Рµ РїРѕР·РёС†РёРё РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅС‹.</CalculatorStageEmptyState>
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
        <CeilingTextField label="РќР°Р·РІР°РЅРёРµ РїРѕР·РёС†РёРё" value={state.title} onChange={(value) => updateField("title", value)} />
        <CeilingTextField label="РљР°С‚РµРіРѕСЂРёСЏ" value={state.category} onChange={(value) => updateField("category", value)} />
        <CeilingTextField label="Р•РґРёРЅРёС†Р°" value={state.unit} onChange={(value) => updateField("unit", value)} />
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">РСЃС‚РѕС‡РЅРёРє РєРѕР»-РІР°</span>
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
        <CeilingNumberField label="РљРѕР»-РІРѕ" value={state.quantity} onChange={(value) => updateField("quantity", value)} />
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">РџРѕРјРµС‰РµРЅРёРµ</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
            disabled={props.busy}
            value={state.roomId}
            onChange={(event) => updateField("roomId", event.target.value)}
          >
            <option value="">Р‘РµР· РїСЂРёРІСЏР·РєРё</option>
            {props.rooms.map((room) => (
              <option key={room.room_id} value={String(room.room_id)}>
                {room.room_name || `РџРѕРјРµС‰РµРЅРёРµ #${room.room_id}`}
              </option>
            ))}
          </select>
        </label>
        <CeilingNumberField label="Р Р°Р±РѕС‚Р° С†РµРЅР°" value={state.workPrice} onChange={(value) => updateField("workPrice", value)} />
        <CeilingNumberField label="РњР°С‚РµСЂРёР°Р» С†РµРЅР°" value={state.materialPrice} onChange={(value) => updateField("materialPrice", value)} />
        <CeilingNumberField label="РћР±РѕСЂСѓРґ. С†РµРЅР°" value={state.equipmentPrice} onChange={(value) => updateField("equipmentPrice", value)} />
        <CeilingNumberField label="Р Р°СЃС…РѕРґРЅРёРєРё С†РµРЅР°" value={state.consumablesPrice} onChange={(value) => updateField("consumablesPrice", value)} />
        <CeilingNumberField label="РљРѕСЌС„С„РёС†РёРµРЅС‚" value={state.priceFactor} onChange={(value) => updateField("priceFactor", value)} />
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-200">
          <input checked={state.isEnabled} disabled={props.busy} type="checkbox" onChange={(event) => updateField("isEnabled", event.target.checked)} />
          Р’РєР»СЋС‡РёС‚СЊ РІ РёС‚РѕРіРё
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">РџСЂРёРјРµС‡Р°РЅРёРµ</span>
        <textarea
          className="min-h-20 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-50 outline-none"
          disabled={props.busy}
          value={state.note}
          onChange={(event) => updateField("note", event.target.value)}
        />
      </label>

      <div className="warmfloor-summary-strip">
        <MetricChip label="Р Р°Р±РѕС‚С‹" value={formatMoney(previewTotals.work_total)} />
        <MetricChip label="РњР°С‚РµСЂРёР°Р»С‹" value={formatMoney(previewTotals.material_total)} />
        <MetricChip label="РћР±РѕСЂСѓРґРѕРІР°РЅРёРµ" value={formatMoney(previewTotals.equipment_total)} />
        <MetricChip label="РС‚РѕРі" value={formatMoney(previewTotals.total)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={props.busy} type="button" variant="secondary" onClick={props.onCancel}>
          РћС‚РјРµРЅР°
        </Button>
        <Button disabled={props.busy || !canSubmit} type="submit">
          {props.busy ? "РЎРѕС…СЂР°РЅСЏСЋ..." : props.submitLabel}
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
        kicker="РЎРїРµС†РёС„РёРєР°С†РёСЏ"
        title="РЎРіСЂСѓРїРїРёСЂРѕРІР°РЅРЅС‹Рµ РїРѕС‚РѕР»РѕС‡РЅС‹Рµ РїРѕР·РёС†РёРё"
        note={`${props.specification.length} РіСЂСѓРїРї`}
      />
      {props.specification.length ? (
        <div className="warmfloor-estimate-list">
          {props.specification.map((item) => (
            <article className="warmfloor-estimate-row-shell" key={`${item.category}-${item.title}-${item.unit}`}>
              <div className="warmfloor-estimate-row">
                <div className="warmfloor-estimate-main">
                  <span className="warmfloor-estimate-kind">{item.category || "РџРѕС‚РѕР»РєРё"}</span>
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
        <CalculatorStageEmptyState>РЎРїРµС†РёС„РёРєР°С†РёСЏ РїРѕ РїРѕС‚РѕР»РєР°Рј РїРѕРєР° РїСѓСЃС‚Р°СЏ.</CalculatorStageEmptyState>
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
      <span>Р Р°Р±РѕС‚С‹: {formatMoney(props.item.work_total)}</span>
      <span>РњР°С‚РµСЂРёР°Р»С‹: {formatMoney(props.item.material_total)}</span>
      <span>РћР±РѕСЂСѓРґРѕРІР°РЅРёРµ: {formatMoney(props.item.equipment_total)}</span>
      <span>Р Р°СЃС…РѕРґРЅРёРєРё: {formatMoney(props.item.consumables_total)}</span>
    </>
  );
}

function buildInitialCeilingItemFormState(item?: CalculatorProjectCeilingItem): CeilingItemFormState {
  return {
    title: item?.title_snapshot ?? "",
    category: item?.category_snapshot ?? "РџРѕС‚РѕР»РєРё",
    unit: item?.unit_snapshot ?? "РјВІ",
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
