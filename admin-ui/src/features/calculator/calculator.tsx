import { DoorsStageSection } from "./calculator-doors-stage";
import { FlooringStageSection } from "./calculator-flooring-stage";
import { CalculatorHeaderSection } from "./calculator-layout";
import { ProjectStageSection } from "./calculator-project-stage";
import { WarmFloorStageSection } from "./calculator-warm-floor-stage";
import { RoomsStageEditorSection, RoomsStageSidebarSection } from "./calculator-rooms-stage";
import { useCalculatorDoorsController } from "./calculator-doors-controller";
import { buildCalculatorHeaderTotals, buildCalculatorStageFlags } from "./calculator-derived";
import {
  useCalculatorFlooringController,
  useCalculatorWallFinishController,
  useCalculatorWarmFloorController,
} from "./calculator-stage-controllers";
import {
  useCalculatorHeaderLayoutController,
  useCalculatorProjectController,
  useCalculatorRoomController,
  useCalculatorStageController,
} from "./calculator-shell-controller";
import { WallFinishStageSection } from "./calculator-wall-finish-stage";
import type {
  CalculatorFlooringCoveringPayload,
  CalculatorFlooringLayoutPayload,
  CalculatorFlooringPayload,
  CalculatorFlooringPreparationPayload,
  CalculatorProject,
  CalculatorProjectDetail,
  CalculatorRoomDetail,
  CalculatorRoomPayload,
  CalculatorWallFinishCoveringPayload,
  CalculatorWallFinishLayoutPayload,
  CalculatorWallFinishPayload,
  CalculatorWallFinishPreparationPayload,
  CalculatorWarmFloorPayload,
} from "./calculator-types";

export * from "./calculator-types";

export function CalculatorScreen(props: {
  projects: CalculatorProject[];
  projectDetail: CalculatorProjectDetail | null;
  roomDetail: CalculatorRoomDetail | null;
  selectedProjectId: number | null;
  selectedRoomId: number | null;
  loading: boolean;
  detailLoading: boolean;
  roomLoading: boolean;
  busyKey: string | null;
  error: string | null;
  onReload: () => Promise<void>;
  onSelectProject: (projectId: number) => void;
  onSelectRoom: (roomId: number) => void;
  onCreateProject: (payload: { name: string; note: string }) => Promise<void>;
  onCreateRoom: (projectId: number) => Promise<void>;
  onSaveRoom: (roomId: number, payload: CalculatorRoomPayload) => Promise<void>;
  onDeleteRoom: (roomId: number) => Promise<void>;
  onCreateDoorCatalogItem: (payload: {
    title: string;
    width_mm: number;
    height_mm: number;
    thickness_mm: number | null;
    purchase_price: number | null;
    sale_price: number | null;
    install_price: number | null;
    note: string;
  }) => Promise<void>;
  onCreateProjectDoor: (
    projectId: number,
    payload: {
      door_catalog_id: number | null;
      opening_kind: string;
      title: string | null;
      width_mm: number | null;
      height_mm: number | null;
      thickness_mm: number | null;
      purchase_price: number | null;
      sale_price: number | null;
      install_price: number | null;
      room_a_id: number | null;
      room_b_id: number | null;
      note: string | null;
    },
  ) => Promise<void>;
  onUpdateProjectDoor: (
    doorId: number,
    payload: {
      door_catalog_id: number | null;
      opening_kind: string;
      title: string | null;
      width_mm: number | null;
      height_mm: number | null;
      thickness_mm: number | null;
      purchase_price: number | null;
      sale_price: number | null;
      install_price: number | null;
      room_a_id: number | null;
      room_b_id: number | null;
      note: string | null;
    },
  ) => Promise<void>;
  onDeleteProjectDoor: (doorId: number) => Promise<void>;
  onCreateDoorComponentCatalogItem: (payload: {
    category_code: string;
    title: string;
    unit: string;
    purchase_price: number | null;
    sale_price: number | null;
    note: string;
  }) => Promise<void>;
  onCreateProjectDoorComponent: (
    doorId: number,
    payload: {
      component_catalog_id: number | null;
      category_code: string | null;
      title: string | null;
      unit: string | null;
      quantity: number;
      purchase_price: number | null;
      sale_price: number | null;
      note: string | null;
    },
  ) => Promise<void>;
  onUpdateProjectDoorComponent: (
    componentId: number,
    payload: {
      component_catalog_id: number | null;
      category_code: string | null;
      title: string | null;
      unit: string | null;
      quantity: number;
      purchase_price: number | null;
      sale_price: number | null;
      note: string | null;
    },
  ) => Promise<void>;
  onDeleteProjectDoorComponent: (componentId: number) => Promise<void>;
  onSaveWarmFloor: (projectId: number, payload: CalculatorWarmFloorPayload) => Promise<void>;
  onSaveFlooring: (projectId: number, payload: CalculatorFlooringPayload) => Promise<void>;
  onCreateFlooringCovering: (payload: CalculatorFlooringCoveringPayload) => Promise<void>;
  onCreateFlooringPreparation: (payload: CalculatorFlooringPreparationPayload) => Promise<void>;
  onCreateFlooringLayout: (payload: CalculatorFlooringLayoutPayload) => Promise<void>;
  onSaveWallFinish: (projectId: number, payload: CalculatorWallFinishPayload) => Promise<void>;
  onCreateWallFinishCovering: (payload: CalculatorWallFinishCoveringPayload) => Promise<void>;
  onCreateWallFinishPreparation: (payload: CalculatorWallFinishPreparationPayload) => Promise<void>;
  onCreateWallFinishLayout: (payload: CalculatorWallFinishLayoutPayload) => Promise<void>;
}) {
  const { activeStage, setActiveStage } = useCalculatorStageController(props.projectDetail);
  const { projectName, setProjectName, projectNote, setProjectNote, handleProjectSubmit } = useCalculatorProjectController({
    onCreateProject: props.onCreateProject,
  });
  const { roomState, setRoomState, handleRoomSubmit } = useCalculatorRoomController({
    roomDetail: props.roomDetail,
    onSaveRoom: props.onSaveRoom,
  });
  const { calculatorHeaderStyle, startHeaderResize, resetHeaderLayout } = useCalculatorHeaderLayoutController();
  const { isProjectStage, isRoomsStage, isWarmFloorStage, isFlooringStage, isWallFinishStage, isDoorsStage } =
    buildCalculatorStageFlags(activeStage);
  const {
    doorCatalogState,
    setDoorCatalogState,
    doorComponentCatalogState,
    setDoorComponentCatalogState,
    projectDoorState,
    setProjectDoorState,
    projectDoorComponentState,
    setProjectDoorComponentState,
    editingDoorId,
    selectedDoorId,
    setSelectedDoorId,
    editingDoorComponentId,
    selectedDoor,
    doorsStageSummary,
    doorsStageSpecification,
    handleDoorCatalogSubmit,
    handleDoorComponentCatalogSubmit,
    handleProjectDoorSubmit,
    handleProjectDoorComponentSubmit,
    startDoorEdit,
    resetDoorForm,
    startDoorComponentEdit,
    resetDoorComponentForm,
  } = useCalculatorDoorsController({
    projectDetail: props.projectDetail,
    setActiveStage,
    onCreateDoorCatalogItem: props.onCreateDoorCatalogItem,
    onCreateDoorComponentCatalogItem: props.onCreateDoorComponentCatalogItem,
    onCreateProjectDoor: props.onCreateProjectDoor,
    onUpdateProjectDoor: props.onUpdateProjectDoor,
    onCreateProjectDoorComponent: props.onCreateProjectDoorComponent,
    onUpdateProjectDoorComponent: props.onUpdateProjectDoorComponent,
  });
  const {
    warmFloorState,
    setWarmFloorState,
    warmFloorSettingsOpen,
    setWarmFloorSettingsOpen,
    expandedWarmFloorRoomId,
    setExpandedWarmFloorRoomId,
    warmFloorPreview,
    warmFloorRoomStateById,
    handleWarmFloorSubmit,
    resetWarmFloorState,
  } = useCalculatorWarmFloorController({
    projectDetail: props.projectDetail,
    isWarmFloorStage,
    onSaveWarmFloor: props.onSaveWarmFloor,
  });
  const {
    flooringState,
    setFlooringState,
    flooringCoveringState,
    setFlooringCoveringState,
    flooringPreparationState,
    setFlooringPreparationState,
    flooringLayoutState,
    setFlooringLayoutState,
    flooringSettingsOpen,
    setFlooringSettingsOpen,
    expandedFlooringRoomId,
    setExpandedFlooringRoomId,
    flooringDetail,
    flooringPreview,
    flooringRoomStateById,
    flooringCoveringById,
    flooringPreparationById,
    flooringLayoutById,
    flooringSelectedTechRooms,
    submitFlooring,
    submitFlooringCovering,
    submitFlooringPreparation,
    submitFlooringLayout,
    resetFlooringState,
  } = useCalculatorFlooringController({
    projectDetail: props.projectDetail,
    isFlooringStage,
    onSaveFlooring: props.onSaveFlooring,
    onCreateFlooringCovering: props.onCreateFlooringCovering,
    onCreateFlooringPreparation: props.onCreateFlooringPreparation,
    onCreateFlooringLayout: props.onCreateFlooringLayout,
  });
  const {
    wallFinishState,
    setWallFinishState,
    wallFinishCoveringState,
    setWallFinishCoveringState,
    wallFinishPreparationState,
    setWallFinishPreparationState,
    wallFinishLayoutState,
    setWallFinishLayoutState,
    wallFinishSettingsOpen,
    setWallFinishSettingsOpen,
    expandedWallFinishRoomId,
    setExpandedWallFinishRoomId,
    wallFinishDetail,
    wallFinishPreview,
    wallFinishRoomStateById,
    wallFinishCoveringById,
    wallFinishPreparationById,
    wallFinishLayoutById,
    wallFinishSelectedTechRooms,
    submitWallFinish,
    submitWallFinishCovering,
    submitWallFinishPreparation,
    submitWallFinishLayout,
    resetWallFinishState,
  } = useCalculatorWallFinishController({
    projectDetail: props.projectDetail,
    isWallFinishStage,
    onSaveWallFinish: props.onSaveWallFinish,
    onCreateWallFinishCovering: props.onCreateWallFinishCovering,
    onCreateWallFinishPreparation: props.onCreateWallFinishPreparation,
    onCreateWallFinishLayout: props.onCreateWallFinishLayout,
  });

  const {
    warmFloorWorkTotal: headerWarmFloorWorkTotal,
    warmFloorMaterialTotal: headerWarmFloorMaterialTotal,
    flooringWorkTotal: headerFlooringWorkTotal,
    flooringMaterialTotal: headerFlooringMaterialTotal,
  } = buildCalculatorHeaderTotals(props.projectDetail, warmFloorPreview, flooringPreview);

  return (
    <div className="space-y-4">
      <CalculatorHeaderSection
        projectDetail={props.projectDetail}
        calculatorHeaderStyle={calculatorHeaderStyle}
        headerFlooringWorkTotal={headerFlooringWorkTotal}
        headerFlooringMaterialTotal={headerFlooringMaterialTotal}
        headerWarmFloorWorkTotal={headerWarmFloorWorkTotal}
        headerWarmFloorMaterialTotal={headerWarmFloorMaterialTotal}
        onReload={props.onReload}
        startHeaderResize={startHeaderResize}
        resetHeaderLayout={resetHeaderLayout}
        activeStage={activeStage}
        setActiveStage={setActiveStage}
      />

    <div className={isRoomsStage ? "grid gap-4 xl:grid-cols-[0.9fr_1.1fr]" : "space-y-4"}>
      <div className="space-y-4">
        {isProjectStage ? (
          <ProjectStageSection
            projectDetail={props.projectDetail}
            projectsCount={props.projects.length}
            loading={props.loading}
            error={props.error}
            busyKey={props.busyKey}
            projectName={projectName}
            setProjectName={setProjectName}
            projectNote={projectNote}
            setProjectNote={setProjectNote}
            onReload={props.onReload}
            handleProjectSubmit={handleProjectSubmit}
          />
        ) : null}

        {isRoomsStage ? (
          <RoomsStageSidebarSection
            projectDetail={props.projectDetail}
            selectedRoomId={props.selectedRoomId}
            busyKey={props.busyKey}
            onCreateRoom={props.onCreateRoom}
            onSelectRoom={props.onSelectRoom}
          />
        ) : null}

        {isDoorsStage ? (
          <DoorsStageSection
            projectDetail={props.projectDetail}
            doorCatalogState={doorCatalogState}
            setDoorCatalogState={setDoorCatalogState}
            doorComponentCatalogState={doorComponentCatalogState}
            setDoorComponentCatalogState={setDoorComponentCatalogState}
            projectDoorState={projectDoorState}
            setProjectDoorState={setProjectDoorState}
            projectDoorComponentState={projectDoorComponentState}
            setProjectDoorComponentState={setProjectDoorComponentState}
            editingDoorId={editingDoorId}
            selectedDoorId={selectedDoorId}
            setSelectedDoorId={setSelectedDoorId}
            editingDoorComponentId={editingDoorComponentId}
            selectedDoor={selectedDoor}
            doorsStageSummary={doorsStageSummary}
            doorsStageSpecification={doorsStageSpecification}
            busyKey={props.busyKey}
            handleDoorCatalogSubmit={handleDoorCatalogSubmit}
            handleDoorComponentCatalogSubmit={handleDoorComponentCatalogSubmit}
            handleProjectDoorSubmit={handleProjectDoorSubmit}
            handleProjectDoorComponentSubmit={handleProjectDoorComponentSubmit}
            startDoorEdit={startDoorEdit}
            resetDoorForm={resetDoorForm}
            startDoorComponentEdit={startDoorComponentEdit}
            resetDoorComponentForm={resetDoorComponentForm}
            onDeleteProjectDoor={props.onDeleteProjectDoor}
            onDeleteProjectDoorComponent={props.onDeleteProjectDoorComponent}
          />
        ) : null}
      </div>

      {isWarmFloorStage ? (
        <WarmFloorStageSection
          projectDetail={props.projectDetail}
          warmFloorPreview={warmFloorPreview}
          warmFloorSettingsOpen={warmFloorSettingsOpen}
          setWarmFloorSettingsOpen={setWarmFloorSettingsOpen}
          handleWarmFloorSubmit={handleWarmFloorSubmit}
          warmFloorRoomStateById={warmFloorRoomStateById}
          expandedWarmFloorRoomId={expandedWarmFloorRoomId}
          setExpandedWarmFloorRoomId={setExpandedWarmFloorRoomId}
          setWarmFloorState={setWarmFloorState}
          warmFloorState={warmFloorState}
          busyKey={props.busyKey}
          resetWarmFloorState={resetWarmFloorState}
        />
      ) : null}

      {isFlooringStage ? (
        <FlooringStageSection
          projectDetail={props.projectDetail}
          flooringDetail={flooringDetail}
          flooringPreview={flooringPreview}
          flooringSettingsOpen={flooringSettingsOpen}
          setFlooringSettingsOpen={setFlooringSettingsOpen}
          flooringRoomStateById={flooringRoomStateById}
          expandedFlooringRoomId={expandedFlooringRoomId}
          setExpandedFlooringRoomId={setExpandedFlooringRoomId}
          setFlooringState={setFlooringState}
          flooringState={flooringState}
          flooringCoveringState={flooringCoveringState}
          setFlooringCoveringState={setFlooringCoveringState}
          flooringPreparationState={flooringPreparationState}
          setFlooringPreparationState={setFlooringPreparationState}
          flooringLayoutState={flooringLayoutState}
          setFlooringLayoutState={setFlooringLayoutState}
          flooringCoveringById={flooringCoveringById}
          flooringPreparationById={flooringPreparationById}
          flooringLayoutById={flooringLayoutById}
          flooringSelectedTechRooms={flooringSelectedTechRooms}
          busyKey={props.busyKey}
          submitFlooring={submitFlooring}
          submitFlooringCovering={submitFlooringCovering}
          submitFlooringPreparation={submitFlooringPreparation}
          submitFlooringLayout={submitFlooringLayout}
          resetFlooringState={resetFlooringState}
        />
      ) : null}

      {isWallFinishStage ? (
        <WallFinishStageSection
          projectDetail={props.projectDetail}
          wallFinishDetail={wallFinishDetail}
          wallFinishPreview={wallFinishPreview}
          wallFinishSettingsOpen={wallFinishSettingsOpen}
          setWallFinishSettingsOpen={setWallFinishSettingsOpen}
          wallFinishRoomStateById={wallFinishRoomStateById}
          expandedWallFinishRoomId={expandedWallFinishRoomId}
          setExpandedWallFinishRoomId={setExpandedWallFinishRoomId}
          setWallFinishState={setWallFinishState}
          wallFinishState={wallFinishState}
          wallFinishCoveringState={wallFinishCoveringState}
          setWallFinishCoveringState={setWallFinishCoveringState}
          wallFinishPreparationState={wallFinishPreparationState}
          setWallFinishPreparationState={setWallFinishPreparationState}
          wallFinishLayoutState={wallFinishLayoutState}
          setWallFinishLayoutState={setWallFinishLayoutState}
          wallFinishCoveringById={wallFinishCoveringById}
          wallFinishPreparationById={wallFinishPreparationById}
          wallFinishLayoutById={wallFinishLayoutById}
          wallFinishSelectedTechRooms={wallFinishSelectedTechRooms}
          busyKey={props.busyKey}
          submitWallFinish={submitWallFinish}
          submitWallFinishCovering={submitWallFinishCovering}
          submitWallFinishPreparation={submitWallFinishPreparation}
          submitWallFinishLayout={submitWallFinishLayout}
          resetWallFinishState={resetWallFinishState}
        />
      ) : null}

      {isRoomsStage ? (
        <RoomsStageEditorSection
          roomDetail={props.roomDetail}
          roomLoading={props.roomLoading}
          detailLoading={props.detailLoading}
          roomState={roomState}
          setRoomState={setRoomState}
          busyKey={props.busyKey}
          handleRoomSubmit={handleRoomSubmit}
          onDeleteRoom={props.onDeleteRoom}
        />
      ) : null}
    </div>
    </div>
  );
}
