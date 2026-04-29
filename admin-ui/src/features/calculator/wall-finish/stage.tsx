import { useState } from "react";

import { Button, CalculatorStageRightPanelLayout, CalculatorStageShell } from "./";
import { WallFinishStageEditorColumn } from "./";
import { WallFinishStageSummaryColumn } from "./";
import type { WallFinishStageSectionProps } from "./";

export type { WallFinishStageReadyProps, WallFinishStageSectionProps } from "./";

export function WallFinishStageSection(props: WallFinishStageSectionProps) {
  const {
    projectDetail,
    wallFinishDetail,
    wallFinishPreview,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
  } = props;
  const [summaryOpen, setSummaryOpen] = useState(true);

  return (
    <CalculatorStageShell
      className="wallfinish-stage"
      eyebrow="Отделка стен"
      title="Финишные покрытия, подготовка и расходники"
      settingsOpen={wallFinishSettingsOpen}
      setSettingsOpen={setWallFinishSettingsOpen}
      actions={
        <Button
          type="button"
          variant="secondary"
          className={summaryOpen ? "calculator-stage-settings calculator-stage-settings-active" : "calculator-stage-settings"}
          onClick={() => setSummaryOpen((current) => !current)}
        >
          Сводка
        </Button>
      }
      isReady={Boolean(projectDetail && wallFinishDetail && wallFinishPreview)}
    >
      {projectDetail && wallFinishDetail && wallFinishPreview ? (
        <CalculatorStageRightPanelLayout
          panelOpen={summaryOpen}
          main={
            <WallFinishStageEditorColumn
              {...props}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
          }
          panel={
            <WallFinishStageSummaryColumn
              {...props}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
          }
        />
      ) : null}
    </CalculatorStageShell>
  );
}
