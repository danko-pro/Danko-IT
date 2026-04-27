import { DoorsCatalogPanel } from "./catalog";
import { DoorsProjectPanel } from "./project";
import { CalculatorStageShell } from "../stage/shell";
import type { DoorsStageReadyProps, DoorsStageSectionProps } from "./types";

export type { DoorsStageReadyProps, DoorsStageSectionProps } from "./types";

// Дверной stage выровнен под общий stage-shell и держит стабильный внешний контракт.
export function DoorsStageSection(props: DoorsStageSectionProps) {
  return (
    <CalculatorStageShell
      className="doors-stage"
      eyebrow="Двери"
      title="Дверной блок проекта"
      isReady={Boolean(props.projectDetail)}
    >
      {props.projectDetail ? <DoorsStageReadySection {...props} projectDetail={props.projectDetail} /> : null}
    </CalculatorStageShell>
  );
}

function DoorsStageReadySection(props: DoorsStageReadyProps) {
  return (
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
  );
}
