import { CalculatorStageShell } from "./";
import { WallFinishStageEditorColumn } from "./";
import { WallFinishStageSummaryColumn } from "./";
import type { WallFinishStageSectionProps } from "./";

export type { WallFinishStageReadyProps, WallFinishStageSectionProps } from "./";

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
