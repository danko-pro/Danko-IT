import { DoorsProjectList } from "./";
import { DoorsProjectComponentsPanel } from "./";
import { DoorsProjectSummary } from "./";
import type { DoorsProjectPanelProps } from "./";

// Оркестратор project-блока дверного stage.
// Он только собирает крупные секции списка, сводки и комплектации выбранной двери.

export function DoorsProjectPanel(props: DoorsProjectPanelProps) {
  return (
    <>
      <DoorsProjectList
        projectDetail={props.projectDetail}
        selectedDoor={props.selectedDoor}
        setSelectedDoorId={props.setSelectedDoorId}
        busyKey={props.busyKey}
        startDoorEdit={props.startDoorEdit}
        onDeleteProjectDoor={props.onDeleteProjectDoor}
      />
      <DoorsProjectSummary
        doorsStageSummary={props.doorsStageSummary}
        doorsStageSpecification={props.doorsStageSpecification}
      />
      <DoorsProjectComponentsPanel
        projectDetail={props.projectDetail}
        projectDoorComponentState={props.projectDoorComponentState}
        setProjectDoorComponentState={props.setProjectDoorComponentState}
        editingDoorComponentId={props.editingDoorComponentId}
        selectedDoor={props.selectedDoor}
        busyKey={props.busyKey}
        handleProjectDoorComponentSubmit={props.handleProjectDoorComponentSubmit}
        startDoorComponentEdit={props.startDoorComponentEdit}
        resetDoorComponentForm={props.resetDoorComponentForm}
        onDeleteProjectDoorComponent={props.onDeleteProjectDoorComponent}
      />
    </>
  );
}
