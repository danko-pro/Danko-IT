import { WallFinishStageCatalogsPanel } from "./";
import { WallFinishStageRoomsPanel } from "./";
import type { WallFinishStageReadyProps } from "./";

export function WallFinishStageEditorColumn(props: WallFinishStageReadyProps) {
  return (
    <div className="space-y-3">
      <WallFinishStageRoomsPanel {...props} />
      <WallFinishStageCatalogsPanel {...props} />
    </div>
  );
}
