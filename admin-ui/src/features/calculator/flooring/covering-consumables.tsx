import { AddButton, DeleteButton } from "../../../shared/controls";
import type { FlooringCoveringCreateState } from "./";

type CoveringConsumableKey = keyof Pick<
  FlooringCoveringCreateState,
  | "glue_consumption_per_m2"
  | "glue_unit"
  | "glue_price_per_unit"
  | "primer_consumption_per_m2"
  | "primer_unit"
  | "primer_price_per_unit"
  | "svp_consumption_per_m2"
  | "svp_unit"
  | "svp_price_per_unit"
  | "grout_consumption_per_m2"
  | "grout_unit"
  | "grout_price_per_unit"
>;

type CoveringConsumablesEditorProps = {
  state: FlooringCoveringCreateState;
  onChange: (updater: (current: FlooringCoveringCreateState) => FlooringCoveringCreateState) => void;
};

const FIXED_CONSUMABLE_GROUPS: Array<{
  title: string;
  consumptionKey: CoveringConsumableKey;
  unitKey: CoveringConsumableKey;
  priceKey: CoveringConsumableKey;
}> = [
  { title: "Клей", consumptionKey: "glue_consumption_per_m2", unitKey: "glue_unit", priceKey: "glue_price_per_unit" },
  { title: "Грунт", consumptionKey: "primer_consumption_per_m2", unitKey: "primer_unit", priceKey: "primer_price_per_unit" },
  { title: "СВП", consumptionKey: "svp_consumption_per_m2", unitKey: "svp_unit", priceKey: "svp_price_per_unit" },
  { title: "Затирка", consumptionKey: "grout_consumption_per_m2", unitKey: "grout_unit", priceKey: "grout_price_per_unit" },
];

export function CoveringConsumablesEditor(props: CoveringConsumablesEditorProps) {
  const { state, onChange } = props;

  return (
    <div className="flooring-techmap-consumable-list">
      <div className="flooring-techmap-consumable-head">
        <span>Позиция</span>
        <span>Расход</span>
        <span>Ед.</span>
        <span>Цена</span>
        <span />
      </div>
      {FIXED_CONSUMABLE_GROUPS.map((group) => (
        <div key={group.title} className="flooring-techmap-consumable-row">
          <strong>{group.title}</strong>
          <input className="text-input text-input-compact" value={state[group.consumptionKey]} onChange={(event) => updateFixed(onChange, group.consumptionKey, event.target.value)} />
          <input className="text-input text-input-compact" value={state[group.unitKey]} onChange={(event) => updateFixed(onChange, group.unitKey, event.target.value)} />
          <input className="text-input text-input-compact" value={state[group.priceKey]} onChange={(event) => updateFixed(onChange, group.priceKey, event.target.value)} />
          <span className="flooring-techmap-consumable-lock" aria-hidden="true" />
        </div>
      ))}

      {state.custom_consumables.map((item) => (
        <div className="flooring-techmap-consumable-row flooring-techmap-consumable-row-custom" key={item.id}>
          <input className="text-input text-input-compact" value={item.title} onChange={(event) => updateCustomConsumable(onChange, item.id, { title: event.target.value })} placeholder="Название" />
          <input className="text-input text-input-compact" value={item.consumption_per_m2} onChange={(event) => updateCustomConsumable(onChange, item.id, { consumption_per_m2: event.target.value })} placeholder="0" />
          <input className="text-input text-input-compact" value={item.unit} onChange={(event) => updateCustomConsumable(onChange, item.id, { unit: event.target.value })} placeholder="шт" />
          <input className="text-input text-input-compact" value={item.price_per_unit} onChange={(event) => updateCustomConsumable(onChange, item.id, { price_per_unit: event.target.value })} placeholder="0" />
          <DeleteButton
            className="warmfloor-material-remove"
            aria-label={`Удалить позицию ${item.title || "без названия"}`}
            onClick={() => removeCustomConsumable(onChange, item.id)}
          >
            ×
          </DeleteButton>
        </div>
      ))}

      <AddButton className="calculator-nav-add warmfloor-material-add" onClick={() => addCustomConsumable(onChange)}>
        Добавить позицию
      </AddButton>
    </div>
  );
}

function updateFixed(propsOnChange: CoveringConsumablesEditorProps["onChange"], key: CoveringConsumableKey, value: string) {
  propsOnChange((current) => ({ ...current, [key]: value }));
}

function addCustomConsumable(propsOnChange: CoveringConsumablesEditorProps["onChange"]) {
  propsOnChange((current) => ({
    ...current,
    custom_consumables: [
      ...current.custom_consumables,
      { id: `${Date.now()}`, title: "", consumption_per_m2: "", unit: "шт", price_per_unit: "" },
    ],
  }));
}

function updateCustomConsumable(
  propsOnChange: CoveringConsumablesEditorProps["onChange"],
  id: string,
  patch: Partial<FlooringCoveringCreateState["custom_consumables"][number]>,
) {
  propsOnChange((current) => ({
    ...current,
    custom_consumables: current.custom_consumables.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function removeCustomConsumable(propsOnChange: CoveringConsumablesEditorProps["onChange"], id: string) {
  propsOnChange((current) => ({
    ...current,
    custom_consumables: current.custom_consumables.filter((item) => item.id !== id),
  }));
}
