import { WallFinishStageCoveringCatalog } from "./";
import { WallFinishStageLayoutCatalog } from "./";
import { WallFinishStagePreparationCatalog } from "./";
import type { WallFinishStageReadyProps } from "./";

export function WallFinishStageCatalogsPanel(props: WallFinishStageReadyProps) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Справочники</div>
          <div className="calculator-stage-section-title">Каталоги отделки стен</div>
        </div>
        <div className="calculator-stage-section-note">
          База покрытий, подготовок и способов монтажа, которая используется при сборке расчёта по комнатам.
        </div>
      </div>

      <WallFinishStageCoveringCatalog
        wallFinishDetail={props.wallFinishDetail}
        wallFinishCoveringState={props.wallFinishCoveringState}
        setWallFinishCoveringState={props.setWallFinishCoveringState}
        busyKey={props.busyKey}
        submitWallFinishCovering={props.submitWallFinishCovering}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <WallFinishStagePreparationCatalog
          wallFinishDetail={props.wallFinishDetail}
          wallFinishPreparationState={props.wallFinishPreparationState}
          setWallFinishPreparationState={props.setWallFinishPreparationState}
          busyKey={props.busyKey}
          submitWallFinishPreparation={props.submitWallFinishPreparation}
        />
        <WallFinishStageLayoutCatalog
          wallFinishDetail={props.wallFinishDetail}
          wallFinishLayoutState={props.wallFinishLayoutState}
          setWallFinishLayoutState={props.setWallFinishLayoutState}
          busyKey={props.busyKey}
          submitWallFinishLayout={props.submitWallFinishLayout}
        />
      </div>
    </div>
  );
}
