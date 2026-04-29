import { useState } from "react";

import { Button, CalculatorStageRightPanelLayout, CalculatorStageShell } from "./";
import { WarmFloorStageEditorColumn } from "./";
import { WarmFloorStageSummaryColumn } from "./";
import type { WarmFloorStageReadyProps, WarmFloorStageSectionProps } from "./";

export type { WarmFloorStageReadyProps, WarmFloorStageSectionProps } from "./";

type WarmFloorPanelMode = "settings" | "summary" | "estimate";

export function WarmFloorStageSection(props: WarmFloorStageSectionProps) {
  const { projectDetail, warmFloorPreview, warmFloorSettingsOpen, setWarmFloorSettingsOpen } = props;
  const [panelMode, setPanelMode] = useState<WarmFloorPanelMode>(warmFloorSettingsOpen ? "settings" : "summary");

  function selectPanelMode(nextMode: WarmFloorPanelMode) {
    setPanelMode(nextMode);
    setWarmFloorSettingsOpen(nextMode === "settings");
  }

  return (
    <CalculatorStageShell
      className="warmfloor-stage"
      eyebrow="Тёплый пол"
      title="Контуры, труба и коллекторная часть"
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            className={
              panelMode === "settings"
                ? "calculator-stage-settings calculator-stage-settings-active"
                : "calculator-stage-settings"
            }
            onClick={() => selectPanelMode("settings")}
          >
            Параметры
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={
              panelMode === "summary"
                ? "calculator-stage-settings calculator-stage-settings-active"
                : "calculator-stage-settings"
            }
            onClick={() => selectPanelMode("summary")}
          >
            Сводка
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={
              panelMode === "estimate"
                ? "calculator-stage-settings calculator-stage-settings-active"
                : "calculator-stage-settings"
            }
            onClick={() => selectPanelMode("estimate")}
          >
            Смета
          </Button>
        </>
      }
      isReady={Boolean(projectDetail && warmFloorPreview)}
    >
      {projectDetail && warmFloorPreview ? (
        <CalculatorStageRightPanelLayout
          panelOpen={true}
          main={
            <WarmFloorStageEditorColumn
              {...(props as WarmFloorStageReadyProps)}
              projectDetail={projectDetail}
              warmFloorPreview={warmFloorPreview}
            />
          }
          panel={
            <WarmFloorStageSummaryColumn
              {...(props as WarmFloorStageReadyProps)}
              projectDetail={projectDetail}
              panelMode={panelMode}
              warmFloorPreview={warmFloorPreview}
            />
          }
        />
      ) : null}
    </CalculatorStageShell>
  );
}
