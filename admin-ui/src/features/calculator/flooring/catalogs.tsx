import { FlooringStageCoveringCatalog } from "./";
import { FlooringStageLayoutCatalog } from "./";
import { FlooringStagePreparationCatalog } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringStageCatalogsPanel(props: FlooringStageReadyProps) {
  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Справочники</div>
          <div className="calculator-stage-section-title">Каталоги и параметры покрытий</div>
        </div>
        <div className="calculator-stage-section-note">
          База материалов, подготовок и схем укладки, из которых затем собираются комнаты в расчёте.
        </div>
      </div>

      <FlooringStageCoveringCatalog
        flooringDetail={props.flooringDetail}
        flooringCoveringState={props.flooringCoveringState}
        setFlooringCoveringState={props.setFlooringCoveringState}
        busyKey={props.busyKey}
        submitFlooringCovering={props.submitFlooringCovering}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <FlooringStagePreparationCatalog
          flooringDetail={props.flooringDetail}
          flooringPreparationState={props.flooringPreparationState}
          setFlooringPreparationState={props.setFlooringPreparationState}
          busyKey={props.busyKey}
          submitFlooringPreparation={props.submitFlooringPreparation}
        />
        <FlooringStageLayoutCatalog
          flooringDetail={props.flooringDetail}
          flooringLayoutState={props.flooringLayoutState}
          setFlooringLayoutState={props.setFlooringLayoutState}
          busyKey={props.busyKey}
          submitFlooringLayout={props.submitFlooringLayout}
        />
      </div>
    </div>
  );
}
