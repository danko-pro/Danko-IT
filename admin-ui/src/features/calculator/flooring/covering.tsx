import type { ReactNode } from "react";

import { AddButton } from "../../../shared/controls";
import { Button, TextField, emptyFlooringCoveringState } from "./";
import { CoveringConsumablesEditor } from "./covering-consumables";
import { coveringToState } from "./catalog-state";
import type { CalculatorFlooringCovering, FlooringStageReadyProps } from "./";

type FlooringStageCoveringCatalogProps = Pick<
  FlooringStageReadyProps,
  | "flooringDetail"
  | "flooringCoveringState"
  | "setFlooringCoveringState"
  | "busyKey"
  | "submitFlooringCovering"
> & {
  open?: boolean;
};

export function FlooringStageCoveringCatalog(props: FlooringStageCoveringCatalogProps) {
  const { flooringDetail, flooringCoveringState, setFlooringCoveringState, busyKey, submitFlooringCovering } = props;
  const underlayEnabled = flooringCoveringState.underlay_mode !== "none";

  return (
    <div className="flooring-techmap-form">
      <TechmapHeader
        title="Сохраненные покрытия"
        note={`${flooringDetail.coverings.length} позиций`}
        activeTitle={flooringCoveringState.title}
        items={flooringDetail.coverings}
        onSelect={(item) => setFlooringCoveringState(coveringToState(item))}
        onCreate={() => setFlooringCoveringState(emptyFlooringCoveringState)}
      />

      <div className="flooring-techmap-form-body">
        <TechmapStep title="1. База покрытия" note="Название, ставки и запас">
          <div className="flooring-techmap-title-row">
            <TextField
              label="Название покрытия"
              size="compact"
              value={flooringCoveringState.title}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, title: value }))}
              placeholder="Например, кварцвинил"
            />
          </div>
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Материал, ₽/м²"
              size="compact"
              value={flooringCoveringState.material_price_per_m2}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, material_price_per_m2: value }))}
            />
            <TextField
              label="Работа, ₽/м²"
              size="compact"
              value={flooringCoveringState.labor_price_per_m2}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, labor_price_per_m2: value }))}
            />
            <TextField
              label="Базовый запас, %"
              size="compact"
              value={flooringCoveringState.base_waste_percent}
              onChange={(value) => setFlooringCoveringState((current) => ({ ...current, base_waste_percent: value }))}
            />
          </div>
        </TechmapStep>

        <TechmapStep title="2. Подложка" note="Параметры, связанные с выбранным покрытием">
          <div className="flooring-techmap-grid flooring-techmap-grid-main">
            <label className="flooring-techmap-toggle">
              <input
                type="checkbox"
                checked={underlayEnabled}
                onChange={(event) =>
                  setFlooringCoveringState((current) => ({
                    ...current,
                    underlay_mode: event.target.checked ? "required" : "none",
                  }))
                }
              />
              <span>
                <strong>Подложка включена</strong>
                <span>{underlayEnabled ? "Будет считаться в покрытии" : "Не участвует в расчете"}</span>
              </span>
            </label>
            {underlayEnabled ? (
              <TextField
                label="Расход подложки"
                size="compact"
                value={flooringCoveringState.underlay_consumption_per_m2}
                onChange={(value) =>
                  setFlooringCoveringState((current) => ({ ...current, underlay_consumption_per_m2: value }))
                }
              />
            ) : null}
          </div>
        </TechmapStep>

        <TechmapStep title="3. Расходники покрытия" note="Заполняются только нужные позиции">
          <CoveringConsumablesEditor state={flooringCoveringState} onChange={setFlooringCoveringState} />
        </TechmapStep>

        <TechmapStep title="4. Примечание" note="Уточнение для сметы">
          <TextField
            label="Комментарий"
            size="compact"
            value={flooringCoveringState.note}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, note: value }))}
            placeholder="Например, клеевой кварцвинил / плитка 600x600"
          />
        </TechmapStep>

        <div className="flooring-techmap-actions">
          <Button
            type="button"
            disabled={busyKey === "calculator-flooring-covering-create"}
            onClick={() => void submitFlooringCovering()}
          >
            {busyKey === "calculator-flooring-covering-create" ? "Сохраняю..." : "Добавить покрытие"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TechmapHeader(props: {
  title: string;
  note: string;
  activeTitle: string;
  items: CalculatorFlooringCovering[];
  onSelect: (item: CalculatorFlooringCovering) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flooring-techmap-form-head">
      <div>
        <strong>{props.title}</strong>
        <span>{props.note}</span>
      </div>
      <div className="flooring-techmap-chip-list">
        {props.items.slice(0, 8).map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.title === props.activeTitle ? "flooring-techmap-chip-active" : undefined}
            onClick={() => props.onSelect(item)}
          >
            {item.title}
          </button>
        ))}
        <AddButton
          className="flooring-techmap-chip-add"
          aria-label="Добавить покрытие"
          children={null}
          onClick={props.onCreate}
        />
      </div>
    </div>
  );
}

function TechmapStep(props: { title: string; note: string; children: ReactNode }) {
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
