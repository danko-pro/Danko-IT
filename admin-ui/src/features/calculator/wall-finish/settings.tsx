import type { ReactNode } from "react";

import { Button } from "./";
import type { WallFinishStageReadyProps } from "./";

export function WallFinishSettingsPanel(
  props: Pick<WallFinishStageReadyProps, "wallFinishState" | "setWallFinishState" | "resetWallFinishState">,
) {
  const { wallFinishState, setWallFinishState, resetWallFinishState } = props;

  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3 warmfloor-settings-panel">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Глобальные параметры</div>
          <div className="calculator-stage-section-title">Отделка стен: расчет, работы и объектовые правила</div>
        </div>
        <div className="calculator-stage-section-note">
          Верхний уровень отвечает за правила расчета и общие ставки. Отделка, подготовка и монтаж выбираются в карточке
          помещения.
        </div>
      </div>

      <div className="warmfloor-settings-groups">
        <SettingsGroup title="Расчет" note="Глобальные включатели блока">
          <ToggleRow
            label="Считать подготовку"
            checked={wallFinishState.include_preparation}
            onChange={(checked) => setWallFinishState((current) => ({ ...current, include_preparation: checked }))}
          />
          <ToggleRow
            label="Считать демонтаж"
            checked={wallFinishState.include_demolition}
            onChange={(checked) => setWallFinishState((current) => ({ ...current, include_demolition: checked }))}
          />
        </SettingsGroup>

        <SettingsGroup title="Работы" note="Ставки работ по объекту">
          <SettingsRow
            label="Демонтаж, ₽/м²"
            value={wallFinishState.demolition_price_per_m2}
            onChange={(value) => setWallFinishState((current) => ({ ...current, demolition_price_per_m2: value }))}
          />
        </SettingsGroup>
      </div>

      <div className="calculator-stage-action-row">
        <Button type="button" variant="secondary" onClick={resetWallFinishState}>
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
