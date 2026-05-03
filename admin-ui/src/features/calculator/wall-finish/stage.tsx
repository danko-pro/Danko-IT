import { useState } from "react";

import { Button, CalculatorStageRightPanelLayout, CalculatorStageShell } from "./";
import { WallFinishStageEditorColumn } from "./";
import { WallFinishStageSummaryColumn } from "./";
import type { WallFinishStageReadyProps, WallFinishStageSectionProps } from "./";

export type { WallFinishStageReadyProps, WallFinishStageSectionProps } from "./";

export type WallFinishPanelMode = "room" | "settings" | "techmap" | "summary" | "estimate";

export function WallFinishStageSection(props: WallFinishStageSectionProps) {
  const {
    projectDetail,
    wallFinishDetail,
    wallFinishPreview,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
  } = props;
  const [panelMode, setPanelMode] = useState<WallFinishPanelMode>(wallFinishSettingsOpen ? "settings" : "summary");

  function selectPanelMode(nextMode: WallFinishPanelMode) {
    setPanelMode(nextMode);
    setWallFinishSettingsOpen(nextMode === "settings");
  }

  return (
    <CalculatorStageShell
      className="wallfinish-stage"
      eyebrow="Отделка стен"
      title="Финишные покрытия, подготовка и расходники"
      actions={
        <>
          <StageModeButton active={panelMode === "room"} onClick={() => selectPanelMode("room")}>
            Помещение
          </StageModeButton>
          <StageModeButton active={panelMode === "settings"} onClick={() => selectPanelMode("settings")}>
            Параметры
          </StageModeButton>
          <StageModeButton active={panelMode === "techmap"} onClick={() => selectPanelMode("techmap")}>
            Техкарта
          </StageModeButton>
          <StageModeButton active={panelMode === "summary"} onClick={() => selectPanelMode("summary")}>
            Сводка
          </StageModeButton>
          <StageModeButton active={panelMode === "estimate"} onClick={() => selectPanelMode("estimate")}>
            Смета
          </StageModeButton>
        </>
      }
      isReady={Boolean(projectDetail && wallFinishDetail && wallFinishPreview)}
    >
      {projectDetail && wallFinishDetail && wallFinishPreview ? (
        <CalculatorStageRightPanelLayout
          panelOpen={true}
          main={
            <WallFinishStageEditorColumn
              {...(props as WallFinishStageReadyProps)}
              projectDetail={projectDetail}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
              openWallFinishRoomPanel={() => selectPanelMode("room")}
              openWallFinishSummaryPanel={() => selectPanelMode("summary")}
            />
          }
          panel={
            <WallFinishStageSummaryColumn
              {...(props as WallFinishStageReadyProps)}
              projectDetail={projectDetail}
              panelMode={panelMode}
              wallFinishDetail={wallFinishDetail}
              wallFinishPreview={wallFinishPreview}
            />
          }
        />
      ) : null}
    </CalculatorStageShell>
  );
}

function StageModeButton(props: { active: boolean; children: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={props.active ? "calculator-stage-settings calculator-stage-settings-active" : "calculator-stage-settings"}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}
