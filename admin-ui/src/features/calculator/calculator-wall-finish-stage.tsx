import { CalculatorStageShell } from "./calculator-stage-shell";
import { WallFinishStageEditorColumn } from "./calculator-wall-finish-stage-editor";
import { WallFinishStageSummaryColumn } from "./calculator-wall-finish-stage-summary";
import type { WallFinishStageSectionProps } from "./calculator-wall-finish-stage-types";

export type { WallFinishStageReadyProps, WallFinishStageSectionProps } from "./calculator-wall-finish-stage-types";

// Keep the stage shell stable while the editor and summary columns evolve separately.
export function WallFinishStageSection(props: WallFinishStageSectionProps) {
  const {
    projectDetail,
    wallFinishDetail,
    wallFinishPreview,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
  } = props;

  return (
    <CalculatorStageShell
      className="flooring-stage"
      eyebrow="Отделка стен"
      title="Финишные покрытия, подготовка и расходники"
      settingsOpen={wallFinishSettingsOpen}
      setSettingsOpen={setWallFinishSettingsOpen}
      isReady={Boolean(projectDetail && wallFinishDetail && wallFinishPreview)}
    >
      {projectDetail && wallFinishDetail && wallFinishPreview ? (
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <WallFinishStageEditorColumn
              {...props}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
            <WallFinishStageSummaryColumn
              {...props}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
          </div>
        </div>
      ) : null}
    </CalculatorStageShell>
  );
}
