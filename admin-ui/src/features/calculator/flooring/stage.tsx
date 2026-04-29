import { useState } from "react";

import { Button, CalculatorStageRightPanelLayout, CalculatorStageShell } from "./";
import { FlooringStageEditorColumn } from "./";
import { FlooringStageSummaryColumn } from "./";
import type { FlooringStageSectionProps } from "./";

export type { FlooringStageReadyProps, FlooringStageSectionProps } from "./";

export function FlooringStageSection(props: FlooringStageSectionProps) {
  const { projectDetail, flooringDetail, flooringPreview, flooringSettingsOpen, setFlooringSettingsOpen } = props;
  const [summaryOpen, setSummaryOpen] = useState(true);

  return (
    <CalculatorStageShell
      className="flooring-stage"
      eyebrow="Напольные покрытия"
      title="Покрытия, подготовка, раскладка и расходники"
      settingsOpen={flooringSettingsOpen}
      setSettingsOpen={setFlooringSettingsOpen}
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
      isReady={Boolean(projectDetail && flooringDetail && flooringPreview)}
    >
      {projectDetail && flooringDetail && flooringPreview ? (
        <CalculatorStageRightPanelLayout
          panelOpen={summaryOpen}
          main={
            <FlooringStageEditorColumn
              {...props}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
            />
          }
          panel={
            <FlooringStageSummaryColumn
              {...props}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
            />
          }
        />
      ) : null}
    </CalculatorStageShell>
  );
}
