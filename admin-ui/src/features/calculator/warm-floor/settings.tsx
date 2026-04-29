import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import { formatMoney, materialItemsTotal } from "./";
import type { WarmFloorEditState, WarmFloorMaterialItem } from "./";

type WarmFloorSettingsProps = {
  warmFloorState: WarmFloorEditState;
  setWarmFloorState: Dispatch<SetStateAction<WarmFloorEditState>>;
};

type TextFieldKey =
  | "work_price_per_m2"
  | "pipe_m_per_m2"
  | "max_contour_area_m2"
  | "small_zone_area_m2"
  | "manifold_work_price"
  | "pump_work_price"
  | "pipe_price_per_m"
  | "pipe_material_title"
  | "pump_rooms_threshold"
  | "pump_contours_threshold";

const CALC_FIELDS: Array<{ key: TextFieldKey; label: string }> = [
  { key: "pipe_m_per_m2", label: "Расход трубы на 1 м², м.п." },
  { key: "max_contour_area_m2", label: "Макс. площадь контура, м²" },
  { key: "small_zone_area_m2", label: "Порог малой зоны, м²" },
  { key: "pump_rooms_threshold", label: "Насос от помещений" },
  { key: "pump_contours_threshold", label: "Насос от контуров" },
];

const WORK_FIELDS: Array<{ key: TextFieldKey; label: string }> = [
  { key: "work_price_per_m2", label: "Укладка ТП за 1 м², ₽" },
  { key: "manifold_work_price", label: "Монтаж гребёнки, ₽" },
  { key: "pump_work_price", label: "Монтаж насосного узла, ₽" },
];

export function WarmFloorSettingsPanel(props: WarmFloorSettingsProps) {
  const { warmFloorState, setWarmFloorState } = props;

  function updateField(key: TextFieldKey, value: string) {
    setWarmFloorState((current) => ({ ...current, [key]: value }));
  }

  function updateMaterialItem(
    listKey: "manifold_material_items" | "pump_material_items" | "consumable_material_items",
    index: number,
    patch: Partial<WarmFloorMaterialItem>,
  ) {
    setWarmFloorState((current) => ({
      ...current,
      [listKey]: current[listKey].map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function addConsumableItem() {
    setWarmFloorState((current) => ({
      ...current,
      consumable_material_items: [
        ...current.consumable_material_items,
        { title: "Новая позиция расходников", unit: "компл.", quantity: 1, amount: 0 },
      ],
    }));
  }

  function removeConsumableItem(index: number) {
    setWarmFloorState((current) => ({
      ...current,
      consumable_material_items: current.consumable_material_items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3 warmfloor-settings-panel">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Глобальные параметры</div>
          <div className="calculator-stage-section-title">Тёплый пол: расчёт, работы и материалы</div>
        </div>
        <div className="calculator-stage-section-note">
          Верхний уровень отвечает за расчёт. Состав узлов спрятан внутри раскрываемых групп и попадает в смету.
        </div>
      </div>

      <div className="warmfloor-settings-groups">
        <SettingsGroup title="Расчёт" note="Нормы и пороги системы">
          {CALC_FIELDS.map((field) => (
            <SettingsRow key={field.key} label={field.label} value={warmFloorState[field.key]} onChange={(value) => updateField(field.key, value)} />
          ))}
        </SettingsGroup>

        <SettingsGroup title="Работы" note="Ставки работ по системе">
          {WORK_FIELDS.map((field) => (
            <SettingsRow key={field.key} label={field.label} value={warmFloorState[field.key]} onChange={(value) => updateField(field.key, value)} />
          ))}
        </SettingsGroup>

        <SettingsGroup title="Материалы" note="Труба и цена за метр">
          <SettingsRow label="Наименование трубы" value={warmFloorState.pipe_material_title} onChange={(value) => updateField("pipe_material_title", value)} />
          <SettingsRow label="Цена трубы за 1 м.п., ₽" value={warmFloorState.pipe_price_per_m} onChange={(value) => updateField("pipe_price_per_m", value)} />
        </SettingsGroup>

        <MaterialGroup
          title="Расходники"
          total={materialItemsTotal(warmFloorState.consumable_material_items)}
          items={warmFloorState.consumable_material_items}
          onChange={(index, patch) => updateMaterialItem("consumable_material_items", index, patch)}
          onAdd={addConsumableItem}
          onRemove={removeConsumableItem}
        />

        <MaterialGroup
          title="Узел гребёнки"
          total={materialItemsTotal(warmFloorState.manifold_material_items)}
          items={warmFloorState.manifold_material_items}
          onChange={(index, patch) => updateMaterialItem("manifold_material_items", index, patch)}
        />

        <MaterialGroup
          title="Насосный узел"
          total={materialItemsTotal(warmFloorState.pump_material_items)}
          items={warmFloorState.pump_material_items}
          onChange={(index, patch) => updateMaterialItem("pump_material_items", index, patch)}
        />
      </div>
    </div>
  );
}

function SettingsGroup(props: { title: string; note: string; children: ReactNode }) {
  return (
    <details className="warmfloor-settings-group" open>
      <summary>
        <span>{props.title}</span>
        <small>{props.note}</small>
      </summary>
      <div className="warmfloor-settings-group-body">{props.children}</div>
    </details>
  );
}

function SettingsRow(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="warmfloor-settings-row">
      <span>{props.label}</span>
      <input className="text-input" value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

function MaterialGroup(props: {
  title: string;
  total: number;
  items: WarmFloorMaterialItem[];
  onChange: (index: number, patch: Partial<WarmFloorMaterialItem>) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}) {
  const [removingIndexes, setRemovingIndexes] = useState<Set<number>>(() => new Set());

  function handleRemove(index: number) {
    setRemovingIndexes((current) => new Set(current).add(index));
    window.setTimeout(() => {
      props.onRemove?.(index);
      setRemovingIndexes((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
    }, 180);
  }

  return (
    <details className="warmfloor-settings-group">
      <summary>
        <span>{props.title}</span>
        <small>{props.items.length} позиции · {formatMoney(props.total)}</small>
      </summary>
      <div className="warmfloor-settings-group-body">
        {props.items.map((item, index) => (
          <div className={`warmfloor-material-row-shell${removingIndexes.has(index) ? " warmfloor-material-row-removing" : ""}`} key={index}>
            <div className="warmfloor-material-row">
              <input className="text-input" value={item.title} onChange={(event) => props.onChange(index, { title: event.target.value })} />
              <input className="text-input" value={item.unit} onChange={(event) => props.onChange(index, { unit: event.target.value })} />
              <input className="text-input" value={String(item.quantity)} onChange={(event) => props.onChange(index, { quantity: Number(event.target.value) || 0 })} />
              <input className="text-input" value={String(item.amount)} onChange={(event) => props.onChange(index, { amount: Number(event.target.value) || 0 })} />
              {props.onRemove ? (
                <button className="warmfloor-material-remove" type="button" onClick={() => handleRemove(index)}>
                  ×
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {props.onAdd ? (
          <button className="calculator-nav-add warmfloor-material-add" type="button" onClick={props.onAdd}>
            + Добавить позицию
          </button>
        ) : null}
      </div>
    </details>
  );
}
