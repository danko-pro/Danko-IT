import { useState } from "react";

import { Button } from "../../../shared/controls";
import type { CalculatorProjectDetail } from "../model/types";
import { CalculatorStageRightPanelLayout } from "../stage/right-panel-layout";
import { CalculatorStageShell } from "../stage/shell";
import { CeilingsEditorColumn } from "./editor-column";
import type { ProjectCeilingItemPayload } from "./payload";
import { CeilingsSummaryColumn, type CeilingsPanelMode } from "./summary-column";

export type CeilingsStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  busyKey: string | null;
  onCreateProjectCeilingItem: (projectId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onUpdateProjectCeilingItem: (itemId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onDeleteProjectCeilingItem: (itemId: number) => Promise<void>;
};

const ceilingPanelModes: Array<{ mode: CeilingsPanelMode; label: string }> = [
  { mode: "items", label: "Позиции" },
  { mode: "rooms", label: "Помещения" },
  { mode: "summary", label: "Сводка" },
  { mode: "specification", label: "Спецификация" },
];

export function CeilingsStageSection(props: CeilingsStageSectionProps) {
  const ceilings = props.projectDetail?.ceilings ?? null;
  const projectId = props.projectDetail?.project.id ?? null;
  const configPackageCode = ceilings?.config?.default_package_code ?? ceilings?.config?.package_code ?? null;
  const [panelMode, setPanelMode] = useState<CeilingsPanelMode>("summary");

  return (
    <CalculatorStageShell
      className="ceilings-stage"
      eyebrow="Потолки"
      title="Потолочные работы, материалы, оборудование и расходники"
      actions={
        <>
          {ceilingPanelModes.map((option) => (
            <StageModeButton key={option.mode} active={panelMode === option.mode} onClick={() => setPanelMode(option.mode)}>
              {option.label}
            </StageModeButton>
          ))}
        </>
      }
      isReady={Boolean(props.projectDetail)}
    >
      {!ceilings || !projectId ? (
        <div className="calculator-stage-empty">Сначала выберите объект калькулятора.</div>
      ) : (
        <CalculatorStageRightPanelLayout
          panelOpen={true}
          main={
            <CeilingsEditorColumn
              busyKey={props.busyKey}
              ceilings={ceilings}
              projectId={projectId}
              setPanelMode={setPanelMode}
              onCreateProjectCeilingItem={props.onCreateProjectCeilingItem}
              onDeleteProjectCeilingItem={props.onDeleteProjectCeilingItem}
              onUpdateProjectCeilingItem={props.onUpdateProjectCeilingItem}
            />
          }
          panel={
            <CeilingsSummaryColumn
              ceilings={ceilings}
              configPackageCode={configPackageCode}
              panelMode={panelMode}
            />
          }
        />
      )}
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
