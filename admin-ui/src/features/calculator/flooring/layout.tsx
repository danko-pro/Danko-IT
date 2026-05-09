import type { ReactNode } from "react";

import { AddButton } from "../../../shared/controls";
import { Button, TextField, emptyFlooringLayoutState } from "./";
import { layoutToState } from "./catalog-state";
import type { CalculatorFlooringLayout, FlooringStageReadyProps } from "./";

type FlooringStageLayoutCatalogProps = Pick<
  FlooringStageReadyProps,
  "flooringDetail" | "flooringLayoutState" | "setFlooringLayoutState" | "busyKey" | "submitFlooringLayout"
> & {
  open?: boolean;
};

export function FlooringStageLayoutCatalog(props: FlooringStageLayoutCatalogProps) {
  const { flooringDetail, flooringLayoutState, setFlooringLayoutState, busyKey, submitFlooringLayout } = props;

  return (
    <div className="flooring-techmap-form">
      <TechmapHeader
        title="Сохраненные способы укладки"
        note={`${flooringDetail.layouts.length} позиций`}
        activeTitle={flooringLayoutState.title}
        items={flooringDetail.layouts}
        onSelect={(item) => setFlooringLayoutState(layoutToState(item))}
        onCreate={() => setFlooringLayoutState(emptyFlooringLayoutState)}
      />

      <div className="flooring-techmap-form-body">
        <TechmapStep title="1. Схема укладки" note="Название способа">
          <div className="flooring-techmap-title-row">
            <TextField
              label="Название укладки"
              size="compact"
              value={flooringLayoutState.title}
              onChange={(value) => setFlooringLayoutState((current) => ({ ...current, title: value }))}
              placeholder="Например, диагональ"
              tooltip="Название способа укладки. Оно будет доступно в карточке помещения и попадет в смету."
            />
          </div>
        </TechmapStep>

        <TechmapStep title="2. Коэффициенты" note="Влияние на работу и закупку">
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Коэфф. к работе"
              size="compact"
              value={flooringLayoutState.labor_multiplier}
              onChange={(value) => setFlooringLayoutState((current) => ({ ...current, labor_multiplier: value }))}
              tooltip="Множитель ставки работы. Например, 1.2 увеличит работу на 20%."
            />
            <TextField
              label="Доп. запас, %"
              size="compact"
              value={flooringLayoutState.extra_waste_percent}
              onChange={(value) => setFlooringLayoutState((current) => ({ ...current, extra_waste_percent: value }))}
              tooltip="Дополнительный процент к закупочной площади из-за раскладки или подрезки."
            />
          </div>
        </TechmapStep>

        <TechmapStep title="3. Примечание" note="Уточнение для сметы">
          <TextField
            label="Комментарий"
            size="compact"
            value={flooringLayoutState.note}
            onChange={(value) => setFlooringLayoutState((current) => ({ ...current, note: value }))}
            placeholder="Например, сложный рисунок"
            tooltip="Короткое уточнение для выбранного способа укладки."
          />
        </TechmapStep>

        <div className="flooring-techmap-actions">
          <Button
            type="button"
            disabled={busyKey === "calculator-flooring-layout-create"}
            onClick={() => void submitFlooringLayout()}
          >
            {busyKey === "calculator-flooring-layout-create" ? "Сохраняю..." : "Добавить укладку"}
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
  items: CalculatorFlooringLayout[];
  onSelect: (item: CalculatorFlooringLayout) => void;
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
          aria-label="Добавить укладку"
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
