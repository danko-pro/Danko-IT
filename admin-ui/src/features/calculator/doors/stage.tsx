import { DoorsWorkbenchStage } from "../doors-workbench";
import type { DoorsStageSectionProps } from "./types";

export type { DoorsStageReadyProps, DoorsStageSectionProps } from "./types";

export function DoorsStageSection(props: DoorsStageSectionProps) {
  return <DoorsWorkbenchStage {...props} />;
}
