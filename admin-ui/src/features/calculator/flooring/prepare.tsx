import type { ReactNode } from "react";

import { AddButton } from "../../../shared/controls";
import { Button, TextField, emptyFlooringPreparationState } from "./";
import { preparationToState } from "./catalog-state";
import type { CalculatorFlooringPreparation, FlooringStageReadyProps } from "./";

type FlooringStagePreparationCatalogProps = Pick<
  FlooringStageReadyProps,
  | "flooringDetail"
  | "flooringPreparationState"
  | "setFlooringPreparationState"
  | "busyKey"
  | "submitFlooringPreparation"
> & {
  open?: boolean;
};

export function FlooringStagePreparationCatalog(props: FlooringStagePreparationCatalogProps) {
  const {
    flooringDetail,
    flooringPreparationState,
    setFlooringPreparationState,
    busyKey,
    submitFlooringPreparation,
  } = props;

  return (
    <div className="flooring-techmap-form">
      <TechmapHeader
        title="Сохраненные подготовки"
        note={`${flooringDetail.preparations.length} позиций`}
        activeTitle={flooringPreparationState.title}
        items={flooringDetail.preparations}
        onSelect={(item) => setFlooringPreparationState(preparationToState(item))}
        onCreate={() => setFlooringPreparationState(emptyFlooringPreparationState)}
      />

      <div className="flooring-techmap-form-body">
        <TechmapStep title="1. База подготовки" note="Название технологического пункта">
          <div className="flooring-techmap-title-row">
            <TextField
              label="Название подготовки"
              size="compact"
              value={flooringPreparationState.title}
              onChange={(value) => setFlooringPreparationState((current) => ({ ...current, title: value }))}
              placeholder="Например, гидроизоляция"
              tooltip="Название пункта подготовки. Оно будет доступно в карточке помещения и попадет в смету."
            />
          </div>
        </TechmapStep>

        <TechmapStep title="2. Ставки" note="Работы и материалы по площади">
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Работа, ₽/м²"
              size="compact"
              value={flooringPreparationState.labor_price_per_m2}
              onChange={(value) =>
                setFlooringPreparationState((current) => ({ ...current, labor_price_per_m2: value }))
              }
              tooltip="Стоимость работ по этому пункту подготовки за квадратный метр помещения."
            />
            <TextField
              label="Материал, ₽/м²"
              size="compact"
              value={flooringPreparationState.material_price_per_m2}
              onChange={(value) =>
                setFlooringPreparationState((current) => ({ ...current, material_price_per_m2: value }))
              }
              tooltip="Материал подготовки одной общей ставкой за квадратный метр."
            />
          </div>
        </TechmapStep>

        <TechmapStep title="3. Расходники подготовки" note="Дополнительный расход на м²">
          <div className="flooring-techmap-consumable-list">
            <div className="flooring-techmap-consumable-head">
              <span>Позиция</span>
              <span>Расход</span>
              <span>Ед.</span>
              <span>Цена</span>
              <span />
            </div>
            <div className="flooring-techmap-consumable-row">
              <strong>Грунтовка</strong>
              <TextField
                label="Расход"
                size="compact"
                value={flooringPreparationState.primer_consumption_per_m2}
                onChange={(value) =>
                  setFlooringPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
                }
                tooltip="Расход грунтовки на квадратный метр подготовки."
              />
              <TextField
                label="Ед."
                size="compact"
                value={flooringPreparationState.primer_unit}
                onChange={(value) => setFlooringPreparationState((current) => ({ ...current, primer_unit: value }))}
                tooltip="Единица измерения расходника: л, кг, шт."
              />
              <TextField
                label="Цена"
                size="compact"
                value={flooringPreparationState.primer_price_per_unit}
                onChange={(value) =>
                  setFlooringPreparationState((current) => ({ ...current, primer_price_per_unit: value }))
                }
                tooltip="Цена за одну единицу расходника."
              />
              <span className="flooring-techmap-consumable-lock" aria-hidden="true" />
            </div>
          </div>
        </TechmapStep>

        <TechmapStep title="4. Примечание" note="Уточнение для сметы">
          <TextField
            label="Комментарий"
            size="compact"
            value={flooringPreparationState.note}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, note: value }))}
            placeholder="Например, только мокрые зоны"
            tooltip="Короткое уточнение для выбранного технологического пункта."
          />
        </TechmapStep>

        <div className="flooring-techmap-actions">
          <Button
            type="button"
            disabled={busyKey === "calculator-flooring-preparation-create"}
            onClick={() => void submitFlooringPreparation()}
          >
            {busyKey === "calculator-flooring-preparation-create" ? "Сохраняю..." : "Добавить пункт"}
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
  items: CalculatorFlooringPreparation[];
  onSelect: (item: CalculatorFlooringPreparation) => void;
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
          aria-label="Добавить подготовку"
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
