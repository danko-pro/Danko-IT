import { FlooringStageCoveringCatalog } from "./calculator-flooring-stage-covering-catalog";
import { FlooringStageLayoutCatalog } from "./calculator-flooring-stage-layout-catalog";
import { FlooringStagePreparationCatalog } from "./calculator-flooring-stage-preparation-catalog";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

// Оркестратор catalog-блока flooring stage.
// Собирает секции материалов, подготовки и layout-настроек в один совместимый panel-компонент.

export function FlooringStageCatalogsPanel(props: FlooringStageReadyProps) {
  return (
    <>
      <div className="section-separator">
        <span>РљР°С‚Р°Р»РѕРіРё Рё РїР°СЂР°РјРµС‚СЂС‹ РїРѕРєСЂС‹С‚РёР№</span>
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
          flooringPreparationState={props.flooringPreparationState}
          setFlooringPreparationState={props.setFlooringPreparationState}
          busyKey={props.busyKey}
          submitFlooringPreparation={props.submitFlooringPreparation}
        />
        <FlooringStageLayoutCatalog
          flooringLayoutState={props.flooringLayoutState}
          setFlooringLayoutState={props.setFlooringLayoutState}
          busyKey={props.busyKey}
          submitFlooringLayout={props.submitFlooringLayout}
        />
      </div>
    </>
  );
}
