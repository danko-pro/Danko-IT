import { useState } from "react";

import { Button, CalculatorStageRightPanelLayout, CalculatorStageShell } from "./";
import { FlooringStageEditorColumn } from "./";
import { FlooringStageSummaryColumn } from "./";
import type { FlooringStageReadyProps, FlooringStageSectionProps } from "./";

export type { FlooringStageReadyProps, FlooringStageSectionProps } from "./";

export type FlooringPanelMode = "room" | "settings" | "techmap" | "summary" | "estimate";

export function FlooringStageSection(props: FlooringStageSectionProps) {
  const { projectDetail, flooringDetail, flooringPreview, flooringSettingsOpen, setFlooringSettingsOpen } = props;
  const [panelMode, setPanelMode] = useState<FlooringPanelMode>(flooringSettingsOpen ? "settings" : "summary");

  function selectPanelMode(nextMode: FlooringPanelMode) {
    setPanelMode(nextMode);
    setFlooringSettingsOpen(nextMode === "settings");
  }

  return (
    <CalculatorStageShell
      className="flooring-stage"
      eyebrow="Напольные покрытия"
      title="Покрытия, подготовка, раскладка и расходники"
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            className={
              panelMode === "room"
                ? "calculator-stage-settings calculator-stage-settings-active"
                : "calculator-stage-settings"
            }
            onClick={() => selectPanelMode("room")}
          >
            Помещение
          </Button>
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
              panelMode === "techmap"
                ? "calculator-stage-settings calculator-stage-settings-active"
                : "calculator-stage-settings"
            }
            onClick={() => selectPanelMode("techmap")}
          >
            Техкарта
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
      isReady={Boolean(projectDetail && flooringDetail && flooringPreview)}
    >
      {projectDetail && flooringDetail && flooringPreview ? (
        <CalculatorStageRightPanelLayout
          panelOpen={true}
          main={
            <FlooringStageEditorColumn
              {...(props as FlooringStageReadyProps)}
              projectDetail={projectDetail}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
              openFlooringRoomPanel={() => selectPanelMode("room")}
              openFlooringSummaryPanel={() => selectPanelMode("summary")}
            />
          }
          panel={
            <FlooringStageSummaryColumn
              {...(props as FlooringStageReadyProps)}
              projectDetail={projectDetail}
              panelMode={panelMode}
              flooringDetail={flooringDetail}
              flooringPreview={flooringPreview}
            />
          }
        />
      ) : null}
    </CalculatorStageShell>
  );
}
