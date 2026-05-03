import { WallFinishStageRoomsPanel } from "./";
import type { WallFinishStageReadyProps } from "./";

export function WallFinishStageEditorColumn(
  props: WallFinishStageReadyProps & {
    openWallFinishRoomPanel: () => void;
    openWallFinishSummaryPanel: () => void;
  },
) {
  return (
    <div className="space-y-3">
      <WallFinishStageRoomsPanel {...props} />
    </div>
  );
}
