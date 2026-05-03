import { Button, TextField, emptyWallFinishLayoutState } from "./";
import { WallFinishTechmapHeader, WallFinishTechmapStep, wallFinishLayoutToState } from "./";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStageLayoutCatalogProps = Pick<
  WallFinishStageReadyProps,
  "wallFinishDetail" | "wallFinishLayoutState" | "setWallFinishLayoutState" | "busyKey" | "submitWallFinishLayout"
>;

export function WallFinishStageLayoutCatalog(props: WallFinishStageLayoutCatalogProps) {
  const { wallFinishDetail, wallFinishLayoutState, setWallFinishLayoutState, busyKey, submitWallFinishLayout } = props;

  return (
    <div className="flooring-techmap-form">
      <WallFinishTechmapHeader
        title="Сохраненные способы монтажа"
        note={`${wallFinishDetail.layouts.length} позиций`}
        activeTitle={wallFinishLayoutState.title}
        items={wallFinishDetail.layouts}
        addLabel="Добавить способ монтажа"
        onSelect={(item) => setWallFinishLayoutState(wallFinishLayoutToState(item))}
        onCreate={() => setWallFinishLayoutState(emptyWallFinishLayoutState)}
      />

      <div className="flooring-techmap-form-body">
        <WallFinishTechmapStep title="1. Способ монтажа" note="Название способа">
          <div className="flooring-techmap-title-row">
            <TextField
              label="Название монтажа"
              size="compact"
              value={wallFinishLayoutState.title}
              onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, title: value }))}
              placeholder="Например, с подбором рисунка"
            />
          </div>
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="2. Коэффициенты" note="Влияние на работу и закупку">
          <div className="flooring-techmap-grid flooring-techmap-grid-main flooring-techmap-rate-row">
            <TextField
              label="Коэфф. к работе"
              size="compact"
              value={wallFinishLayoutState.labor_multiplier}
              onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, labor_multiplier: value }))}
            />
            <TextField
              label="Доп. запас, %"
              size="compact"
              value={wallFinishLayoutState.extra_waste_percent}
              onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, extra_waste_percent: value }))}
            />
          </div>
        </WallFinishTechmapStep>

        <WallFinishTechmapStep title="3. Примечание" note="Уточнение для сметы">
          <TextField
            label="Комментарий"
            size="compact"
            value={wallFinishLayoutState.note}
            onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, note: value }))}
            placeholder="Например, сложный рисунок"
          />
        </WallFinishTechmapStep>

        <div className="flooring-techmap-actions">
          <Button
            type="button"
            disabled={busyKey === "calculator-wall-finish-layout-create"}
            onClick={() => void submitWallFinishLayout()}
          >
            {busyKey === "calculator-wall-finish-layout-create" ? "Сохраняю..." : "Добавить монтаж"}
          </Button>
        </div>
      </div>
    </div>
  );
}
