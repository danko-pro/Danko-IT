import { Button, TextField, emptyWallFinishPreparationState } from "./";
import { WallFinishTechmapHeader, WallFinishTechmapStep, wallFinishPreparationToState } from "./";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStagePreparationCatalogProps = Pick<
  WallFinishStageReadyProps,
  | "wallFinishDetail"
  | "wallFinishPreparationState"
  | "setWallFinishPreparationState"
  | "busyKey"
  | "submitWallFinishPreparation"
>;

export function WallFinishStagePreparationCatalog(props: WallFinishStagePreparationCatalogProps) {
  const {
    wallFinishDetail,
    wallFinishPreparationState,
    setWallFinishPreparationState,
    busyKey,
    submitWallFinishPreparation,
  } = props;

  return (
    <div className="flooring-techmap-form">
      <WallFinishTechmapHeader
        title="Сохраненные подготовки"
        note={`${wallFinishDetail.preparations.length} позиций`}
        activeTitle={wallFinishPreparationState.title}
        items={wallFinishDetail.preparations}
        addLabel="Добавить подготовку"
        onSelect={(item) => setWallFinishPreparationState(wallFinishPreparationToState(item))}
        onCreate={() => setWallFinishPreparationState(emptyWallFinishPreparationState)}
      />

      <div className="flooring-techmap-form-body">
        <WallFinishTechmapStep title="1. База подготовки" note="Название технологического пункта">
          <div className="flooring-techmap-title-row">
            <TextField
              label="Название подготовки"
              size="compact"
              value={wallFinishPreparationState.title}
              onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, title: value }))}
              placeholder="Например, шпаклевание под покраску"
            />
          </div>
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="2. Ставки" note="Работы и материалы по площади">
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Работа, ₽/м²"
              size="compact"
              value={wallFinishPreparationState.labor_price_per_m2}
              onChange={(value) =>
                setWallFinishPreparationState((current) => ({ ...current, labor_price_per_m2: value }))
              }
            />
            <TextField
              label="Материал, ₽/м²"
              size="compact"
              value={wallFinishPreparationState.material_price_per_m2}
              onChange={(value) =>
                setWallFinishPreparationState((current) => ({ ...current, material_price_per_m2: value }))
              }
            />
          </div>
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="3. Расходники подготовки" note="Дополнительный расход на м²">
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
                value={wallFinishPreparationState.primer_consumption_per_m2}
                onChange={(value) =>
                  setWallFinishPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
                }
              />
              <TextField
                label="Ед."
                size="compact"
                value={wallFinishPreparationState.primer_unit}
                onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, primer_unit: value }))}
              />
              <TextField
                label="Цена"
                size="compact"
                value={wallFinishPreparationState.primer_price_per_unit}
                onChange={(value) =>
                  setWallFinishPreparationState((current) => ({ ...current, primer_price_per_unit: value }))
                }
              />
              <span className="flooring-techmap-consumable-lock" aria-hidden="true" />
            </div>
          </div>
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="4. Примечание" note="Уточнение для сметы">
          <TextField
            label="Комментарий"
            size="compact"
            value={wallFinishPreparationState.note}
            onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, note: value }))}
            placeholder="Например, только мокрые зоны"
          />
        </WallFinishTechmapStep>

        <div className="flooring-techmap-actions">
          <Button
            type="button"
            disabled={busyKey === "calculator-wall-finish-preparation-create"}
            onClick={() => void submitWallFinishPreparation()}
          >
            {busyKey === "calculator-wall-finish-preparation-create" ? "Сохраняю..." : "Добавить пункт"}
          </Button>
        </div>
      </div>
    </div>
  );
}
