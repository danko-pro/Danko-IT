import { Button, TextField, emptyWallFinishCoveringState } from "./";
import { WallFinishTechmapHeader, WallFinishTechmapStep, wallFinishCoveringToState } from "./";
import { WallFinishCoveringConsumablesEditor } from "./covering-consumables";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStageCoveringCatalogProps = Pick<
  WallFinishStageReadyProps,
  | "wallFinishDetail"
  | "wallFinishCoveringState"
  | "setWallFinishCoveringState"
  | "busyKey"
  | "submitWallFinishCovering"
>;

export function WallFinishStageCoveringCatalog(props: WallFinishStageCoveringCatalogProps) {
  const {
    wallFinishDetail,
    wallFinishCoveringState,
    setWallFinishCoveringState,
    busyKey,
    submitWallFinishCovering,
  } = props;

  return (
    <div className="flooring-techmap-form">
      <WallFinishTechmapHeader
        title="Сохраненные отделки"
        note={`${wallFinishDetail.coverings.length} позиций`}
        activeTitle={wallFinishCoveringState.title}
        items={wallFinishDetail.coverings}
        addLabel="Добавить отделку"
        onSelect={(item) => setWallFinishCoveringState(wallFinishCoveringToState(item))}
        onCreate={() => setWallFinishCoveringState(emptyWallFinishCoveringState)}
      />

      <div className="flooring-techmap-form-body">
        <WallFinishTechmapStep title="1. База отделки" note="Название, ставки и запас">
          <div className="flooring-techmap-title-row">
            <TextField
              label="Название отделки"
              size="compact"
              value={wallFinishCoveringState.title}
              onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, title: value }))}
              placeholder="Например, обои флизелиновые"
            />
          </div>
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Материал, ₽/м²"
              size="compact"
              value={wallFinishCoveringState.material_price_per_m2}
              onChange={(value) =>
                setWallFinishCoveringState((current) => ({ ...current, material_price_per_m2: value }))
              }
            />
            <TextField
              label="Работа, ₽/м²"
              size="compact"
              value={wallFinishCoveringState.labor_price_per_m2}
              onChange={(value) =>
                setWallFinishCoveringState((current) => ({ ...current, labor_price_per_m2: value }))
              }
            />
            <TextField
              label="Базовый запас, %"
              size="compact"
              value={wallFinishCoveringState.base_waste_percent}
              onChange={(value) =>
                setWallFinishCoveringState((current) => ({ ...current, base_waste_percent: value }))
              }
            />
          </div>
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="2. Расходники отделки" note="Заполняются только нужные позиции">
          <WallFinishCoveringConsumablesEditor
            state={wallFinishCoveringState}
            onChange={setWallFinishCoveringState}
          />
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="3. Инструмент и примечание" note="Дополнительная ставка и уточнение для сметы">
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Инструмент, ₽/м²"
              size="compact"
              value={wallFinishCoveringState.instrument_price_per_m2}
              onChange={(value) =>
                setWallFinishCoveringState((current) => ({ ...current, instrument_price_per_m2: value }))
              }
            />
            <TextField
              label="Комментарий"
              size="compact"
              value={wallFinishCoveringState.note}
              onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, note: value }))}
              placeholder="Короткое описание технологии"
            />
          </div>
        </WallFinishTechmapStep>

        <div className="flooring-techmap-actions">
          <Button
            type="button"
            disabled={busyKey === "calculator-wall-finish-covering-create"}
            onClick={() => void submitWallFinishCovering()}
          >
            {busyKey === "calculator-wall-finish-covering-create" ? "Сохраняю..." : "Добавить отделку"}
          </Button>
        </div>
      </div>
    </div>
  );
}
