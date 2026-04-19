import { FlooringStageCatalogsPanel } from "./calculator-flooring-stage-catalogs";
import { FlooringStageRoomsPanel } from "./calculator-flooring-stage-rooms";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

export function FlooringStageEditorColumn(props: FlooringStageReadyProps) {
  return (
    <div className="space-y-3">
      <FlooringStageRoomsPanel {...props} />
      <FlooringStageCatalogsPanel {...props} />
    </div>
  );
}
