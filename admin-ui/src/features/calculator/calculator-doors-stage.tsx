import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  CalculatorDoorSpecItem,
  CalculatorDoorsSummary,
  CalculatorProjectDetail,
  CalculatorProjectDoor,
  CalculatorProjectDoorComponent,
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorComponentState,
  ProjectDoorCreateState,
} from "./calculator";
import { DoorsCatalogPanel } from "./calculator-doors-stage-catalog";
import { DoorsProjectPanel } from "./calculator-doors-stage-project";

export type DoorsStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  doorCatalogState: DoorCatalogCreateState;
  setDoorCatalogState: Dispatch<SetStateAction<DoorCatalogCreateState>>;
  doorComponentCatalogState: DoorComponentCatalogCreateState;
  setDoorComponentCatalogState: Dispatch<SetStateAction<DoorComponentCatalogCreateState>>;
  projectDoorState: ProjectDoorCreateState;
  setProjectDoorState: Dispatch<SetStateAction<ProjectDoorCreateState>>;
  projectDoorComponentState: ProjectDoorComponentState;
  setProjectDoorComponentState: Dispatch<SetStateAction<ProjectDoorComponentState>>;
  editingDoorId: number | null;
  selectedDoorId: number | null;
  setSelectedDoorId: Dispatch<SetStateAction<number | null>>;
  editingDoorComponentId: number | null;
  selectedDoor: CalculatorProjectDoor | null;
  doorsStageSummary: CalculatorDoorsSummary;
  doorsStageSpecification: CalculatorDoorSpecItem[];
  busyKey: string | null;
  handleDoorCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleDoorComponentCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleProjectDoorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleProjectDoorComponentSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  startDoorEdit: (door: CalculatorProjectDoor) => void;
  resetDoorForm: () => void;
  startDoorComponentEdit: (component: CalculatorProjectDoorComponent) => void;
  resetDoorComponentForm: () => void;
  onDeleteProjectDoor: (doorId: number) => Promise<void> | void;
  onDeleteProjectDoorComponent: (componentId: number) => Promise<void> | void;
};

// Дверной stage: shell над каталогами, проектными дверями и спецификацией.
export function DoorsStageSection(props: DoorsStageSectionProps) {
  return (
    <section className="glass-panel p-4 stage-panel doors-stage">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Двери</div>
          <h3 className="section-title mt-1.5">Дверной блок проекта</h3>
        </div>
      </div>

      {props.projectDetail ? (
        <div className="space-y-3">
          <DoorsCatalogPanel
            projectDetail={props.projectDetail}
            doorCatalogState={props.doorCatalogState}
            setDoorCatalogState={props.setDoorCatalogState}
            doorComponentCatalogState={props.doorComponentCatalogState}
            setDoorComponentCatalogState={props.setDoorComponentCatalogState}
            projectDoorState={props.projectDoorState}
            setProjectDoorState={props.setProjectDoorState}
            editingDoorId={props.editingDoorId}
            busyKey={props.busyKey}
            handleDoorCatalogSubmit={props.handleDoorCatalogSubmit}
            handleDoorComponentCatalogSubmit={props.handleDoorComponentCatalogSubmit}
            handleProjectDoorSubmit={props.handleProjectDoorSubmit}
            resetDoorForm={props.resetDoorForm}
          />

          <DoorsProjectPanel
            projectDetail={props.projectDetail}
            projectDoorComponentState={props.projectDoorComponentState}
            setProjectDoorComponentState={props.setProjectDoorComponentState}
            selectedDoorId={props.selectedDoorId}
            setSelectedDoorId={props.setSelectedDoorId}
            editingDoorComponentId={props.editingDoorComponentId}
            selectedDoor={props.selectedDoor}
            doorsStageSummary={props.doorsStageSummary}
            doorsStageSpecification={props.doorsStageSpecification}
            busyKey={props.busyKey}
            handleProjectDoorComponentSubmit={props.handleProjectDoorComponentSubmit}
            startDoorEdit={props.startDoorEdit}
            startDoorComponentEdit={props.startDoorComponentEdit}
            resetDoorComponentForm={props.resetDoorComponentForm}
            onDeleteProjectDoor={props.onDeleteProjectDoor}
            onDeleteProjectDoorComponent={props.onDeleteProjectDoorComponent}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Сначала выберите проект калькулятора.
        </div>
      )}
    </section>
  );
}
