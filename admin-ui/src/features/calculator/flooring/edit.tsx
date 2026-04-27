import { FlooringStageCatalogsPanel } from "./";
import { FlooringStageRoomsPanel } from "./";
import type { FlooringStageReadyProps } from "./";

export function FlooringStageEditorColumn(props: FlooringStageReadyProps) {
  return (
    <div className="space-y-3">
      <FlooringStageRoomsPanel {...props} />
      <FlooringStageCatalogsPanel {...props} />
    </div>
  );
}
