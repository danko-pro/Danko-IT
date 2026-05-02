import type { ReactNode } from "react";

import { Button } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringSettingsPanel(
  props: Pick<FlooringStageReadyProps, "flooringState" | "setFlooringState" | "resetFlooringState">,
) {
  const { flooringState, setFlooringState, resetFlooringState } = props;

  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3 warmfloor-settings-panel">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Глобальные параметры</div>
          <div className="calculator-stage-section-title">
            Напольные покрытия: расчёт, работы и объектовые расходы
          </div>
        </div>
        <div className="calculator-stage-section-note">
          Верхний уровень отвечает за правила расчёта, общие ставки и быстрые объектовые строки. Покрытие,
          подготовка и укладка выбираются в карточке помещения.
        </div>
      </div>

      <div className="warmfloor-settings-groups">
        <SettingsGroup title="Расчёт" note="Глобальные включатели блока">
          <ToggleRow
            label="Считать демонтаж"
            checked={flooringState.include_demolition}
            onChange={(checked) => setFlooringState((current) => ({ ...current, include_demolition: checked }))}
          />
          <ToggleRow
            label="Считать подготовку"
            checked={flooringState.include_preparation}
            onChange={(checked) =>
              setFlooringState((current) => ({ ...current, include_preparation: checked, default_preparation_id: "" }))
            }
          />
          <ToggleRow
            label="Считать подложку"
            checked={flooringState.include_underlay}
            onChange={(checked) => setFlooringState((current) => ({ ...current, include_underlay: checked }))}
          />
          <ToggleRow
            label="Считать плинтус"
            checked={flooringState.include_plinth}
            onChange={(checked) => setFlooringState((current) => ({ ...current, include_plinth: checked }))}
          />
        </SettingsGroup>

        <SettingsGroup title="Работы" note="Ставки работ по объекту">
          <SettingsRow
            label="Демонтаж, ₽/м²"
            value={flooringState.demolition_price_per_m2}
            onChange={(value) => setFlooringState((current) => ({ ...current, demolition_price_per_m2: value }))}
          />
          <SettingsRow
            label="Монтаж плинтуса, ₽/м.п."
            value={flooringState.plinth_install_price_per_m}
            onChange={(value) => setFlooringState((current) => ({ ...current, plinth_install_price_per_m: value }))}
          />
        </SettingsGroup>

        <SettingsGroup title="Материалы" note="Общие цены расходников">
          <SettingsRow
            label="Подложка, ₽/м²"
            value={flooringState.underlay_price_per_m2}
            onChange={(value) => setFlooringState((current) => ({ ...current, underlay_price_per_m2: value }))}
          />
          <SettingsRow
            label="Плинтус материал, ₽/м.п."
            value={flooringState.plinth_material_price_per_m}
            onChange={(value) =>
              setFlooringState((current) => ({ ...current, plinth_material_price_per_m: value }))
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Объектовые расходы" note={`${flooringState.threshold_profile_count || "0"} порожков`}>
          <SettingsRow
            label="Порожки, шт"
            value={flooringState.threshold_profile_count}
            onChange={(value) => setFlooringState((current) => ({ ...current, threshold_profile_count: value }))}
          />
          <SettingsRow
            label="Порожек, ₽/шт"
            value={flooringState.threshold_profile_price}
            onChange={(value) => setFlooringState((current) => ({ ...current, threshold_profile_price: value }))}
          />
        </SettingsGroup>

        <SettingsGroup title="Быстрые строки" note={`${flooringState.global_items.length} позиций`}>
          {flooringState.global_items.map((item) => (
            <div className="flooring-global-item-row" key={item.id}>
              <div className="flooring-global-item-title">
                <input
                  className="text-input"
                  value={item.title}
                  onChange={(event) => updateGlobalItem(props, item.id, { title: event.target.value })}
                  placeholder="Название"
                />
                <button type="button" className="warmfloor-material-remove" onClick={() => removeGlobalItem(props, item.id)}>
                  ×
                </button>
              </div>
              <div className="flooring-global-item-controls">
                <select
                  className="text-input"
                  value={item.kind}
                  onChange={(event) => updateGlobalItem(props, item.id, { kind: event.target.value as typeof item.kind })}
                >
                  <option value="work">Работы</option>
                  <option value="material">Материал</option>
                  <option value="consumable">Расходник</option>
                </select>
                <select
                  className="text-input"
                  value={item.mode}
                  onChange={(event) => updateGlobalItem(props, item.id, { mode: event.target.value as typeof item.mode })}
                >
                  <option value="fixed">Сумма</option>
                  <option value="area">₽/м²</option>
                  <option value="perimeter">₽/м.п.</option>
                  <option value="quantity">₽/шт</option>
                </select>
                <input
                  className="text-input"
                  value={item.rate}
                  onChange={(event) => updateGlobalItem(props, item.id, { rate: event.target.value })}
                  placeholder="Ставка"
                />
                <input
                  className="text-input"
                  value={item.quantity}
                  disabled={item.mode !== "quantity"}
                  onChange={(event) => updateGlobalItem(props, item.id, { quantity: event.target.value })}
                  placeholder="Кол-во"
                />
              </div>
            </div>
          ))}
          <button type="button" className="calculator-nav-add warmfloor-material-add" onClick={() => addGlobalItem(props)}>
            + Добавить строку
          </button>
        </SettingsGroup>
      </div>

      <div className="calculator-stage-action-row">
        <Button type="button" variant="secondary" onClick={resetFlooringState}>
          Сбросить правки
        </Button>
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

function ToggleRow(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="warmfloor-settings-row flooring-settings-toggle-row">
      <span>{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
    </label>
  );
}

type GlobalItemPatch = Partial<FlooringStageReadyProps["flooringState"]["global_items"][number]>;

function addGlobalItem(props: Pick<FlooringStageReadyProps, "setFlooringState">) {
  props.setFlooringState((current) => ({
    ...current,
    global_items: [
      ...current.global_items,
      { id: `${Date.now()}`, kind: "work", title: "", mode: "fixed", rate: "", quantity: "1", enabled: true },
    ],
  }));
}

function updateGlobalItem(
  props: Pick<FlooringStageReadyProps, "setFlooringState">,
  id: string,
  patch: GlobalItemPatch,
) {
  props.setFlooringState((current) => ({
    ...current,
    global_items: current.global_items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function removeGlobalItem(props: Pick<FlooringStageReadyProps, "setFlooringState">, id: string) {
  props.setFlooringState((current) => ({
    ...current,
    global_items: current.global_items.filter((item) => item.id !== id),
  }));
}
