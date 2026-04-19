import { WallFinishStageCatalogsPanel } from "./calculator-wall-finish-stage-catalogs";
import { WallFinishStageRoomsPanel } from "./calculator-wall-finish-stage-rooms";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

export function WallFinishStageEditorColumn(props: WallFinishStageReadyProps) {
  return (
    <div className="space-y-3">
      <WallFinishStageRoomsPanel {...props} />
      <WallFinishStageCatalogsPanel {...props} />
    </div>
  );
}
