import { DoorsStageSection } from "./calculator-doors-stage";
import { FlooringStageSection } from "./calculator-flooring-stage";
import { CalculatorHeaderSection } from "./calculator-layout";
import { ProjectStageSection } from "./calculator-project-stage";
import { WarmFloorStageSection } from "./calculator-warm-floor-stage";
import { RoomsStageEditorSection, RoomsStageSidebarSection } from "./calculator-rooms-stage";
import { WallFinishStageSection } from "./calculator-wall-finish-stage";
import type { CalculatorScreenProps, CalculatorScreenState } from "./calculator-screen-types";

// View-слой корневого экрана калькулятора.
// Компонент получает уже собранный controller state и только раскладывает stage-секции по месту.

export function CalculatorScreenContent(props: {
  props: CalculatorScreenProps;
  state: CalculatorScreenState;
}) {
  const {
    activeStage,
    setActiveStage,
    stageFlags,
    headerLayout,
    headerTotals,
    project,
    room,
    doors,
    warmFloor,
    flooring,
    wallFinish,
  } = props.state;
  const screenProps = props.props;
  const { isProjectStage, isRoomsStage, isWarmFloorStage, isFlooringStage, isWallFinishStage, isDoorsStage } = stageFlags;

  return (
    <div className="space-y-4">
      <CalculatorHeaderSection
        projectDetail={screenProps.projectDetail}
        calculatorHeaderStyle={headerLayout.calculatorHeaderStyle}
        headerFlooringWorkTotal={headerTotals.flooringWorkTotal}
        headerFlooringMaterialTotal={headerTotals.flooringMaterialTotal}
        headerWarmFloorWorkTotal={headerTotals.warmFloorWorkTotal}
        headerWarmFloorMaterialTotal={headerTotals.warmFloorMaterialTotal}
        onReload={screenProps.onReload}
        startHeaderResize={headerLayout.startHeaderResize}
        resetHeaderLayout={headerLayout.resetHeaderLayout}
        activeStage={activeStage}
        setActiveStage={setActiveStage}
      />

      <div className={isRoomsStage ? "grid gap-4 xl:grid-cols-[0.9fr_1.1fr]" : "space-y-4"}>
        <div className="space-y-4">
          {isProjectStage ? (
            <ProjectStageSection
              projectDetail={screenProps.projectDetail}
              projectsCount={screenProps.projects.length}
              loading={screenProps.loading}
              error={screenProps.error}
              busyKey={screenProps.busyKey}
              projectName={project.projectName}
              setProjectName={project.setProjectName}
              projectNote={project.projectNote}
              setProjectNote={project.setProjectNote}
              onReload={screenProps.onReload}
              handleProjectSubmit={project.handleProjectSubmit}
            />
          ) : null}

          {isRoomsStage ? (
            <RoomsStageSidebarSection
              projectDetail={screenProps.projectDetail}
              selectedRoomId={screenProps.selectedRoomId}
              busyKey={screenProps.busyKey}
              onCreateRoom={screenProps.onCreateRoom}
              onSelectRoom={screenProps.onSelectRoom}
            />
          ) : null}

          {isDoorsStage ? (
            <DoorsStageSection
              projectDetail={screenProps.projectDetail}
              doorCatalogState={doors.doorCatalogState}
              setDoorCatalogState={doors.setDoorCatalogState}
              doorComponentCatalogState={doors.doorComponentCatalogState}
              setDoorComponentCatalogState={doors.setDoorComponentCatalogState}
              projectDoorState={doors.projectDoorState}
              setProjectDoorState={doors.setProjectDoorState}
              projectDoorComponentState={doors.projectDoorComponentState}
              setProjectDoorComponentState={doors.setProjectDoorComponentState}
              editingDoorId={doors.editingDoorId}
              selectedDoorId={doors.selectedDoorId}
              setSelectedDoorId={doors.setSelectedDoorId}
              editingDoorComponentId={doors.editingDoorComponentId}
              selectedDoor={doors.selectedDoor}
              doorsStageSummary={doors.doorsStageSummary}
              doorsStageSpecification={doors.doorsStageSpecification}
              busyKey={screenProps.busyKey}
              handleDoorCatalogSubmit={doors.handleDoorCatalogSubmit}
              handleDoorComponentCatalogSubmit={doors.handleDoorComponentCatalogSubmit}
              handleProjectDoorSubmit={doors.handleProjectDoorSubmit}
              handleProjectDoorComponentSubmit={doors.handleProjectDoorComponentSubmit}
              startDoorEdit={doors.startDoorEdit}
              resetDoorForm={doors.resetDoorForm}
              startDoorComponentEdit={doors.startDoorComponentEdit}
              resetDoorComponentForm={doors.resetDoorComponentForm}
              onDeleteProjectDoor={screenProps.onDeleteProjectDoor}
              onDeleteProjectDoorComponent={screenProps.onDeleteProjectDoorComponent}
            />
          ) : null}
        </div>

        {isWarmFloorStage ? (
          <WarmFloorStageSection
            projectDetail={screenProps.projectDetail}
            warmFloorPreview={warmFloor.warmFloorPreview}
            warmFloorSettingsOpen={warmFloor.warmFloorSettingsOpen}
            setWarmFloorSettingsOpen={warmFloor.setWarmFloorSettingsOpen}
            handleWarmFloorSubmit={warmFloor.handleWarmFloorSubmit}
            warmFloorRoomStateById={warmFloor.warmFloorRoomStateById}
            expandedWarmFloorRoomId={warmFloor.expandedWarmFloorRoomId}
            setExpandedWarmFloorRoomId={warmFloor.setExpandedWarmFloorRoomId}
            setWarmFloorState={warmFloor.setWarmFloorState}
            warmFloorState={warmFloor.warmFloorState}
            busyKey={screenProps.busyKey}
            resetWarmFloorState={warmFloor.resetWarmFloorState}
          />
        ) : null}

        {isFlooringStage ? (
          <FlooringStageSection
            projectDetail={screenProps.projectDetail}
            flooringDetail={flooring.flooringDetail}
            flooringPreview={flooring.flooringPreview}
            flooringSettingsOpen={flooring.flooringSettingsOpen}
            setFlooringSettingsOpen={flooring.setFlooringSettingsOpen}
            flooringRoomStateById={flooring.flooringRoomStateById}
            expandedFlooringRoomId={flooring.expandedFlooringRoomId}
            setExpandedFlooringRoomId={flooring.setExpandedFlooringRoomId}
            setFlooringState={flooring.setFlooringState}
            flooringState={flooring.flooringState}
            flooringCoveringState={flooring.flooringCoveringState}
            setFlooringCoveringState={flooring.setFlooringCoveringState}
            flooringPreparationState={flooring.flooringPreparationState}
            setFlooringPreparationState={flooring.setFlooringPreparationState}
            flooringLayoutState={flooring.flooringLayoutState}
            setFlooringLayoutState={flooring.setFlooringLayoutState}
            flooringCoveringById={flooring.flooringCoveringById}
            flooringPreparationById={flooring.flooringPreparationById}
            flooringLayoutById={flooring.flooringLayoutById}
            flooringSelectedTechRooms={flooring.flooringSelectedTechRooms}
            busyKey={screenProps.busyKey}
            submitFlooring={flooring.submitFlooring}
            submitFlooringCovering={flooring.submitFlooringCovering}
            submitFlooringPreparation={flooring.submitFlooringPreparation}
            submitFlooringLayout={flooring.submitFlooringLayout}
            resetFlooringState={flooring.resetFlooringState}
          />
        ) : null}

        {isWallFinishStage ? (
          <WallFinishStageSection
            projectDetail={screenProps.projectDetail}
            wallFinishDetail={wallFinish.wallFinishDetail}
            wallFinishPreview={wallFinish.wallFinishPreview}
            wallFinishSettingsOpen={wallFinish.wallFinishSettingsOpen}
            setWallFinishSettingsOpen={wallFinish.setWallFinishSettingsOpen}
            wallFinishRoomStateById={wallFinish.wallFinishRoomStateById}
            expandedWallFinishRoomId={wallFinish.expandedWallFinishRoomId}
            setExpandedWallFinishRoomId={wallFinish.setExpandedWallFinishRoomId}
            setWallFinishState={wallFinish.setWallFinishState}
            wallFinishState={wallFinish.wallFinishState}
            wallFinishCoveringState={wallFinish.wallFinishCoveringState}
            setWallFinishCoveringState={wallFinish.setWallFinishCoveringState}
            wallFinishPreparationState={wallFinish.wallFinishPreparationState}
            setWallFinishPreparationState={wallFinish.setWallFinishPreparationState}
            wallFinishLayoutState={wallFinish.wallFinishLayoutState}
            setWallFinishLayoutState={wallFinish.setWallFinishLayoutState}
            wallFinishCoveringById={wallFinish.wallFinishCoveringById}
            wallFinishPreparationById={wallFinish.wallFinishPreparationById}
            wallFinishLayoutById={wallFinish.wallFinishLayoutById}
            wallFinishSelectedTechRooms={wallFinish.wallFinishSelectedTechRooms}
            busyKey={screenProps.busyKey}
            submitWallFinish={wallFinish.submitWallFinish}
            submitWallFinishCovering={wallFinish.submitWallFinishCovering}
            submitWallFinishPreparation={wallFinish.submitWallFinishPreparation}
            submitWallFinishLayout={wallFinish.submitWallFinishLayout}
            resetWallFinishState={wallFinish.resetWallFinishState}
          />
        ) : null}

        {isRoomsStage ? (
          <RoomsStageEditorSection
            roomDetail={screenProps.roomDetail}
            roomLoading={screenProps.roomLoading}
            detailLoading={screenProps.detailLoading}
            roomState={room.roomState}
            setRoomState={room.setRoomState}
            busyKey={screenProps.busyKey}
            handleRoomSubmit={room.handleRoomSubmit}
            onDeleteRoom={screenProps.onDeleteRoom}
          />
        ) : null}
      </div>
    </div>
  );
}
