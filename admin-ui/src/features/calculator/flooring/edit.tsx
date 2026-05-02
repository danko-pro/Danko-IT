import { FlooringStageRoomsPanel } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringStageEditorColumn(
  props: FlooringStageReadyProps & {
    openFlooringRoomPanel: () => void;
    openFlooringSummaryPanel: () => void;
  },
) {
  return (
    <div className="space-y-3">
      <FlooringStageRoomsPanel {...props} />
    </div>
  );
}
