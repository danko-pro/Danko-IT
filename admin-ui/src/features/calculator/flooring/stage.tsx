import { FlooringStageEditorColumn } from "./";
import { FlooringStageSummaryColumn } from "./";
import { CalculatorStageShell } from "./";
import type { FlooringStageSectionProps } from "./";

export type { FlooringStageReadyProps, FlooringStageSectionProps } from "./";

// Keep the stage shell stable while the editor and summary columns evolve separately.
export function FlooringStageSection(props: FlooringStageSectionProps) {
  const { projectDetail, flooringDetail, flooringPreview, flooringSettingsOpen, setFlooringSettingsOpen } = props;

  return (
    <CalculatorStageShell
      className="flooring-stage"
      eyebrow="Напольные покрытия"
      title="Покрытия, подготовка, раскладка и расходники"
      settingsOpen={flooringSettingsOpen}
      setSettingsOpen={setFlooringSettingsOpen}
      isReady={Boolean(projectDetail && flooringDetail && flooringPreview)}
    >
      {projectDetail && flooringDetail && flooringPreview ? (
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <FlooringStageEditorColumn
              {...props}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
            />
            <FlooringStageSummaryColumn
              {...props}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
            />
          </div>
        </div>
      ) : null}
    </CalculatorStageShell>
  );
}
