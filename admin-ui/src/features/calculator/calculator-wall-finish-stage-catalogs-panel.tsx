import { WallFinishStageCoveringCatalog } from "./calculator-wall-finish-stage-covering-catalog";
import { WallFinishStageLayoutCatalog } from "./calculator-wall-finish-stage-layout-catalog";
import { WallFinishStagePreparationCatalog } from "./calculator-wall-finish-stage-preparation-catalog";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

// Оркестратор catalog-блока wall finish stage.
// Собирает материалы отделки, подготовку стен и способы монтажа в один совместимый panel-компонент.

export function WallFinishStageCatalogsPanel(props: WallFinishStageReadyProps) {
  return (
    <>
      <div className="section-separator">
        <span>РљР°С‚Р°Р»РѕРіРё Рё РїР°СЂР°РјРµС‚СЂС‹ РѕС‚РґРµР»РєРё</span>
      </div>

      <WallFinishStageCoveringCatalog
        wallFinishCoveringState={props.wallFinishCoveringState}
        setWallFinishCoveringState={props.setWallFinishCoveringState}
        busyKey={props.busyKey}
        submitWallFinishCovering={props.submitWallFinishCovering}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <WallFinishStagePreparationCatalog
          wallFinishPreparationState={props.wallFinishPreparationState}
          setWallFinishPreparationState={props.setWallFinishPreparationState}
          busyKey={props.busyKey}
          submitWallFinishPreparation={props.submitWallFinishPreparation}
        />
        <WallFinishStageLayoutCatalog
          wallFinishLayoutState={props.wallFinishLayoutState}
          setWallFinishLayoutState={props.setWallFinishLayoutState}
          busyKey={props.busyKey}
          submitWallFinishLayout={props.submitWallFinishLayout}
        />
      </div>
    </>
  );
}
