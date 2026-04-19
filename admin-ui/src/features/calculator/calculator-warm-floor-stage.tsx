import { CalculatorStageShell } from "./calculator-stage-shell";
import { WarmFloorStageEditorColumn } from "./calculator-warm-floor-stage-editor";
import { WarmFloorStageSummaryColumn } from "./calculator-warm-floor-stage-summary";
import type { WarmFloorStageReadyProps, WarmFloorStageSectionProps } from "./calculator-warm-floor-stage-types";

export type { WarmFloorStageReadyProps, WarmFloorStageSectionProps } from "./calculator-warm-floor-stage-types";

export function WarmFloorStageSection(props: WarmFloorStageSectionProps) {
  const { projectDetail, warmFloorPreview, warmFloorSettingsOpen, setWarmFloorSettingsOpen, handleWarmFloorSubmit } =
    props;

  return (
    <CalculatorStageShell
      className="warmfloor-stage"
      eyebrow="Тёплый пол"
      title="Контуры, труба и коллекторная часть"
      settingsOpen={warmFloorSettingsOpen}
      setSettingsOpen={setWarmFloorSettingsOpen}
      isReady={Boolean(projectDetail && warmFloorPreview)}
    >
      {projectDetail && warmFloorPreview ? (
        <form className="space-y-3" onSubmit={(event) => void handleWarmFloorSubmit(event)}>
          <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
            <WarmFloorStageEditorColumn
              {...(props as WarmFloorStageReadyProps)}
              projectDetail={projectDetail}
              warmFloorPreview={warmFloorPreview}
            />
            <WarmFloorStageSummaryColumn
              {...(props as WarmFloorStageReadyProps)}
              projectDetail={projectDetail}
              warmFloorPreview={warmFloorPreview}
            />
          </div>
        </form>
      ) : null}
    </CalculatorStageShell>
  );
}
